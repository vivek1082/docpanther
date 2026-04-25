package com.docpanther.superadmin;

import com.docpanther.common.audit.AuditLogger;
import com.docpanther.common.exception.ApiException;
import com.docpanther.superadmin.model.TenantPodAssignment;
import com.docpanther.superadmin.repository.PodRepository;
import com.docpanther.superadmin.repository.TenantPodAssignmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PodMigrationJob {

    private static final String POD_ROUTE_PREFIX = "pod:tenant:";

    private final TenantPodAssignmentRepository assignmentRepository;
    private final PodRepository podRepository;
    private final StringRedisTemplate redis;
    private final AuditLogger auditLogger;

    @Async
    @Transactional
    public void migrateTenant(UUID actorId, UUID tenantId, UUID targetPodId) {
        log.info("Starting pod migration for tenant={} to pod={}", tenantId, targetPodId);
        try {
            podRepository.findById(targetPodId)
                    .orElseThrow(() -> ApiException.notFound("Target pod"));

            TenantPodAssignment assignment = assignmentRepository.findByTenantId(tenantId)
                    .orElseGet(() -> TenantPodAssignment.builder()
                            .tenantId(tenantId)
                            .podId(targetPodId)
                            .build());

            UUID sourcePodId = assignment.getPodId();
            assignment.setPodId(targetPodId);
            assignmentRepository.save(assignment);

            redis.opsForValue().set(POD_ROUTE_PREFIX + tenantId, targetPodId.toString());

            auditLogger.log("TENANT_MOVED", "ADMIN", actorId, tenantId, null, null,
                    Map.of(
                            "sourcePodId", sourcePodId != null ? sourcePodId.toString() : "none",
                            "targetPodId", targetPodId.toString()
                    ));

            log.info("Pod migration complete for tenant={}: {} → {}", tenantId, sourcePodId, targetPodId);
        } catch (Exception e) {
            log.error("Pod migration failed for tenant={} to pod={}: {}", tenantId, targetPodId, e.getMessage(), e);
        }
    }
}
