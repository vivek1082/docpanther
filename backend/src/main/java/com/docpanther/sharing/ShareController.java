package com.docpanther.sharing;

import com.docpanther.sharing.dto.CreateShareLinkRequest;
import com.docpanther.sharing.dto.ShareLinkResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class ShareController {

    private final ShareService shareService;

    @PostMapping("/api/documents/{docId}/share")
    public ResponseEntity<ShareLinkResponse> create(
            @PathVariable UUID docId,
            @RequestBody CreateShareLinkRequest req,
            @AuthenticationPrincipal(expression = "id")       UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(shareService.createShareLink(docId, userId, tenantId, req));
    }

    @GetMapping("/api/cases/{id}/share-links")
    public ResponseEntity<List<ShareLinkResponse>> listByCaseId(
            @PathVariable UUID id,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId) {

        return ResponseEntity.ok(shareService.listByCaseId(id, tenantId));
    }

    @DeleteMapping("/api/share-links/{linkId}")
    public ResponseEntity<Void> revoke(
            @PathVariable UUID linkId,
            @AuthenticationPrincipal(expression = "id")       UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId) {

        shareService.revoke(linkId, userId, tenantId);
        return ResponseEntity.noContent().build();
    }
}
