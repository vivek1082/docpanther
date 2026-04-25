package com.docpanther.sharing;

import com.docpanther.common.audit.AuditLogger;
import com.docpanther.common.exception.ApiException;
import com.docpanther.common.storage.FileStorage;
import com.docpanther.sharing.dto.*;
import com.docpanther.sharing.model.ShareLink;
import com.docpanther.sharing.repository.ShareLinkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ShareService {

    private final ShareLinkRepository repo;
    private final FileStorage         fileStorage;
    private final AuditLogger         auditLogger;
    private final JdbcTemplate        jdbc;

    private static final BCryptPasswordEncoder BCRYPT                   = new BCryptPasswordEncoder();
    private static final int                   DOWNLOAD_EXPIRY_SECONDS  = 300;

    @Transactional
    public ShareLinkResponse createShareLink(UUID docId, UUID userId, UUID tenantId, CreateShareLinkRequest req) {
        Map<String, Object> doc;
        try {
            doc = jdbc.queryForMap("SELECT name, s3_key FROM file_nodes WHERE id = ?", docId);
        } catch (EmptyResultDataAccessException e) {
            throw ApiException.notFound("Document");
        }

        String filename     = (String) doc.get("name");
        String s3Key        = (String) doc.get("s3_key");
        String token        = UUID.randomUUID().toString().replace("-", "");
        String passwordHash = req.password() != null ? BCRYPT.encode(req.password()) : null;

        ShareLink link = ShareLink.builder()
                .documentId(docId)
                .caseId(req.caseId())
                .token(token)
                .passwordHash(passwordHash)
                .expiresAt(req.expiresAt())
                .maxViews(req.maxViews())
                .s3Key(s3Key)
                .filename(filename)
                .createdBy(userId)
                .tenantId(tenantId)
                .build();

        link = repo.save(link);

        auditLogger.log("LINK_SHARED", "USER", userId, tenantId, req.caseId(), null,
                Map.of("shareLinkId", link.getId(), "documentId", docId));

        return toResponse(link);
    }

    public List<ShareLinkResponse> listByCaseId(UUID caseId, UUID tenantId) {
        return repo.findByCaseIdAndTenantId(caseId, tenantId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void revoke(UUID linkId, UUID userId, UUID tenantId) {
        ShareLink link = repo.findById(linkId)
                .orElseThrow(() -> ApiException.notFound("ShareLink"));
        if (!link.getTenantId().equals(tenantId)) {
            throw ApiException.forbidden();
        }
        repo.delete(link);
        auditLogger.log("LINK_REVOKED", "USER", userId, tenantId, link.getCaseId(), null,
                Map.of("shareLinkId", link.getId()));
    }

    public PublicShareInfoResponse getPublicInfo(String token) {
        ShareLink link = findValidLink(token);
        return new PublicShareInfoResponse(
                link.getPasswordHash() != null,
                link.getExpiresAt(),
                link.getFilename());
    }

    @Transactional
    public ShareAccessResponse access(String token, AccessShareLinkRequest req) {
        ShareLink link = findValidLink(token);

        if (link.getPasswordHash() != null) {
            String supplied = req != null ? req.password() : null;
            if (supplied == null || !BCRYPT.matches(supplied, link.getPasswordHash())) {
                auditLogger.log("LINK_PASSWORD_FAILED", "ANONYMOUS", null, link.getTenantId(),
                        link.getCaseId(), null, Map.of("shareLinkId", link.getId()));
                throw new ApiException(HttpStatus.UNAUTHORIZED, "WRONG_PASSWORD", "Incorrect password");
            }
        }

        repo.incrementViewCount(link.getId());

        Instant urlExpiry   = Instant.now().plusSeconds(DOWNLOAD_EXPIRY_SECONDS);
        String  downloadUrl = fileStorage.generateDownloadUrl(link.getS3Key(), DOWNLOAD_EXPIRY_SECONDS);

        auditLogger.log("LINK_VIEWED", "ANONYMOUS", null, link.getTenantId(),
                link.getCaseId(), null, Map.of("shareLinkId", link.getId()));

        return new ShareAccessResponse(downloadUrl, urlExpiry);
    }

    private ShareLink findValidLink(String token) {
        ShareLink link = repo.findByToken(token)
                .orElseThrow(() -> ApiException.notFound("ShareLink"));

        if (link.getExpiresAt() != null && Instant.now().isAfter(link.getExpiresAt())) {
            throw new ApiException(HttpStatus.GONE, "LINK_EXPIRED", "This link has expired");
        }
        if (link.getMaxViews() != null && link.getViewCount() >= link.getMaxViews()) {
            throw new ApiException(HttpStatus.GONE, "VIEW_LIMIT_REACHED", "This link has reached its view limit");
        }

        return link;
    }

    private ShareLinkResponse toResponse(ShareLink link) {
        return new ShareLinkResponse(
                link.getId(),
                link.getDocumentId(),
                link.getToken(),
                link.getPasswordHash() != null,
                link.getExpiresAt(),
                link.getMaxViews(),
                link.getViewCount(),
                link.getCreatedAt());
    }
}
