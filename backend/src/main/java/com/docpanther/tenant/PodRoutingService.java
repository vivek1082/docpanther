package com.docpanther.tenant;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Resolves tenantId → podId using Redis as a cache.
 * Control agent owns the pod_routes table and populates Redis on tenant creation.
 * Key format: pod:tenant:{tenantId} → podId string
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PodRoutingService {

    private static final String POD_KEY_PREFIX = "pod:tenant:";

    private final StringRedisTemplate redis;

    public String resolvePodId(UUID tenantId) {
        if (tenantId == null) {
            return null;
        }
        String podId = redis.opsForValue().get(POD_KEY_PREFIX + tenantId);
        if (podId == null) {
            log.debug("No pod route cached for tenant {}, falling back to default pod", tenantId);
        }
        return podId;
    }

    public void cachePodRoute(UUID tenantId, String podId) {
        redis.opsForValue().set(POD_KEY_PREFIX + tenantId, podId);
    }

    public void evictPodRoute(UUID tenantId) {
        redis.delete(POD_KEY_PREFIX + tenantId);
    }
}
