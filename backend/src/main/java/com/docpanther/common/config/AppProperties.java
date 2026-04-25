package com.docpanther.common.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConfigurationProperties(prefix = "app")
@Getter
@Setter
public class AppProperties {

    private Jwt jwt = new Jwt();
    private Cors cors = new Cors();
    private S3 s3 = new S3();
    private String frontendUrl = "http://localhost:3000";

    @Getter
    @Setter
    public static class Jwt {
        private String secret;
        private long accessTokenExpiryMs = 900_000L;
        private long refreshTokenExpiryMs = 604_800_000L;
    }

    @Getter
    @Setter
    public static class Cors {
        private List<String> allowedOrigins = List.of("http://localhost:3000");
    }

    @Getter
    @Setter
    public static class S3 {
        private String bucketPrefix = "docpanther";
        private int presignedUrlExpiryMinutes = 15;
        /** Optional MinIO/localstack endpoint override, e.g. http://localhost:9000 */
        private String endpoint;
        /** Must be true for MinIO (bucket in path, not hostname) */
        private boolean pathStyleAccess = false;
        /** Public-facing endpoint for presigned URLs (may differ from internal endpoint in Docker) */
        private String publicEndpoint;
    }
}
