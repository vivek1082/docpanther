package com.docpanther.audit;

import com.docpanther.common.audit.AuditLogDto;
import com.docpanther.common.audit.AuditLogger;
import com.docpanther.common.audit.AuditPageDto;
import com.docpanther.common.audit.AuditQueryPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLoggerImpl implements AuditLogger, AuditQueryPort {

    private final AuditRepository auditRepository;

    @Override
    public AuditPageDto getPagedCaseAuditLog(UUID caseId, int page) {
        Page<AuditLog> result = auditRepository.findByCaseId(
                caseId, PageRequest.of(page, 20, Sort.by(Sort.Direction.DESC, "createdAt")));
        List<AuditLogDto> content = result.getContent().stream()
                .map(a -> new AuditLogDto(
                        a.getId().toString(),
                        a.getAction(),
                        a.getActorType().name(),
                        a.getActorId() != null ? a.getActorId().toString() : null,
                        a.getMetadata(),
                        a.getCreatedAt()))
                .toList();
        return new AuditPageDto(content, result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    @Override
    @Async
    public void log(String action, String actorType, UUID actorId,
                    UUID tenantId, UUID caseId, UUID checklistItemId,
                    Map<String, Object> metadata) {
        try {
            ActorType actor = ActorType.valueOf(actorType);
            AuditLog entry = AuditLog.builder()
                    .action(action)
                    .actorType(actor)
                    .actorId(actorId)
                    .tenantId(tenantId)
                    .caseId(caseId)
                    .checklistItemId(checklistItemId)
                    .metadata(metadata)
                    .build();
            auditRepository.save(entry);
        } catch (Exception e) {
            log.error("Audit write failed — action={} actorId={} caseId={}: {}",
                    action, actorId, caseId, e.getMessage(), e);
        }
    }
}
