package com.docpanther.common.config;

import com.docpanther.tenant.PodDataSourceRouter;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.util.Map;

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

    @Bean
    @Primary
    public DataSource dataSource(DataSource controlPlaneDataSource) {
        PodDataSourceRouter router = new PodDataSourceRouter();
        router.setTargetDataSources(Map.of());
        router.setDefaultTargetDataSource(controlPlaneDataSource);
        router.afterPropertiesSet();
        return router;
    }
}
