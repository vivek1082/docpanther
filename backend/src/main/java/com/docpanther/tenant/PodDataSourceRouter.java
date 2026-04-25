package com.docpanther.tenant;

import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;

/**
 * Routes DB connections to the correct pod DataSource for the current request.
 * Reads the pod key set by TenantContextHolder — null falls back to the default
 * DataSource (control plane), which is the correct behaviour for auth/tenant ops.
 *
 * Wire-up: control agent must declare this as @Primary @Bean and register all pod
 * DataSources via setTargetDataSources() before setDefaultTargetDataSource().
 */
@Slf4j
public class PodDataSourceRouter extends AbstractRoutingDataSource {

    @Override
    protected Object determineCurrentLookupKey() {
        String podId = TenantContextHolder.getPodId();
        if (podId == null) {
            log.trace("No pod context set — routing to control plane DataSource");
        }
        return podId;
    }
}
