package com.docpanther.common.config;

import com.docpanther.tenant.PodDataSourceRouter;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.util.HashMap;

@Configuration
public class DataSourceConfig {

    @Bean
    @ConfigurationProperties("spring.datasource")
    public DataSourceProperties controlPlaneDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean
    public DataSource controlPlaneDataSource(DataSourceProperties controlPlaneDataSourceProperties) {
        return controlPlaneDataSourceProperties.initializeDataSourceBuilder().build();
    }

    /** Dedicated JdbcTemplate that always hits the control-plane DB, bypassing pod routing. */
    @Bean
    public JdbcTemplate controlPlaneJdbc(DataSource controlPlaneDataSource) {
        return new JdbcTemplate(controlPlaneDataSource);
    }

    /**
     * Router starts with an empty target map; PodDataSourceRegistry populates it
     * after application context is fully started (ApplicationStartedEvent).
     * Until then all queries fall back to controlPlaneDataSource, which is correct
     * for Flyway migrations and initial Spring JPA bootstrap.
     */
    @Bean
    public PodDataSourceRouter podDataSourceRouter(DataSource controlPlaneDataSource) {
        PodDataSourceRouter router = new PodDataSourceRouter();
        router.setTargetDataSources(new HashMap<>());
        router.setDefaultTargetDataSource(controlPlaneDataSource);
        router.afterPropertiesSet();
        return router;
    }

    @Bean
    @Primary
    public DataSource dataSource(PodDataSourceRouter podDataSourceRouter) {
        return podDataSourceRouter;
    }
}
