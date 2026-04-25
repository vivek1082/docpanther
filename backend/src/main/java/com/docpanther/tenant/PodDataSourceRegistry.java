package com.docpanther.tenant;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationStartedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

/**
 * Loads all ACTIVE pods from the control-plane DB at startup and registers
 * their DataSources in the PodDataSourceRouter.
 *
 * A pod with a null db_url reuses the control-plane DataSource (single-DB mode).
 * A pod with a non-null db_url gets its own HikariCP connection pool.
 *
 * Call registerPod() when a new pod is provisioned at runtime so it becomes
 * immediately routable without a restart.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PodDataSourceRegistry {

    private final PodDataSourceRouter router;
    private final DataSource controlPlaneDataSource;
    private final JdbcTemplate controlPlaneJdbc;

    // Mutable map — we add to it when new pods are provisioned at runtime.
    private final Map<Object, Object> podDataSources = new HashMap<>();

    @EventListener(ApplicationStartedEvent.class)
    public void loadPodsOnStartup() {
        log.info("Loading pod DataSources from control-plane DB...");

        controlPlaneJdbc.query(
            "SELECT id::text, db_url, db_username, db_password FROM pods WHERE status = 'ACTIVE'",
            rs -> {
                String podId   = rs.getString("id");
                String dbUrl   = rs.getString("db_url");
                String dbUser  = rs.getString("db_username");
                String dbPass  = rs.getString("db_password");

                DataSource ds = (dbUrl == null || dbUrl.isBlank())
                    ? controlPlaneDataSource
                    : buildDataSource(podId, dbUrl, dbUser, dbPass);

                podDataSources.put(podId, ds);
                log.info("Registered pod {} → {}", podId, dbUrl == null ? "control-plane" : dbUrl);
            }
        );

        refreshRouter();
        log.info("Pod routing active — {} pod(s) registered", podDataSources.size());
    }

    /**
     * Call this after persisting a new Pod entity so requests route to it immediately.
     */
    public void registerPod(String podId, String dbUrl, String dbUsername, String dbPassword) {
        DataSource ds = (dbUrl == null || dbUrl.isBlank())
            ? controlPlaneDataSource
            : buildDataSource(podId, dbUrl, dbUsername, dbPassword);
        podDataSources.put(podId, ds);
        refreshRouter();
        log.info("Registered new pod {} at runtime", podId);
    }

    private void refreshRouter() {
        router.setTargetDataSources(Map.copyOf(podDataSources));
        router.afterPropertiesSet();
    }

    private DataSource buildDataSource(String podId, String url, String username, String password) {
        HikariConfig cfg = new HikariConfig();
        cfg.setJdbcUrl(url);
        cfg.setUsername(username);
        cfg.setPassword(password);
        cfg.setPoolName("pod-" + podId.substring(0, 8));
        cfg.setMaximumPoolSize(10);
        cfg.setMinimumIdle(2);
        cfg.setConnectionTimeout(5_000);
        return new HikariDataSource(cfg);
    }
}
