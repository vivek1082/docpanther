package com.docpanther.storage;

import com.docpanther.common.config.AppProperties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;

@Configuration
@ConditionalOnProperty(name = "app.s3.local-mode", havingValue = "false", matchIfMissing = true)
public class S3Config {

    @Bean
    public S3Client s3Client(
            @Value("${aws.region:ap-south-1}") String region,
            @Value("${aws.access-key-id:}") String accessKey,
            @Value("${aws.secret-access-key:}") String secretKey,
            AppProperties appProperties) {

        var builder = S3Client.builder()
                .region(Region.of(region))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(appProperties.getS3().isPathStyleAccess())
                        .build());

        if (hasText(appProperties.getS3().getEndpoint())) {
            builder.endpointOverride(URI.create(appProperties.getS3().getEndpoint()));
        }

        if (hasText(accessKey) && hasText(secretKey)) {
            builder.credentialsProvider(
                    StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)));
        } else {
            builder.credentialsProvider(DefaultCredentialsProvider.create());
        }

        return builder.build();
    }

    @Bean
    public S3Presigner s3Presigner(
            @Value("${aws.region:ap-south-1}") String region,
            @Value("${aws.access-key-id:}") String accessKey,
            @Value("${aws.secret-access-key:}") String secretKey,
            AppProperties appProperties) {

        // Presigner uses publicEndpoint so URLs are browser-accessible
        String presignerEndpoint = hasText(appProperties.getS3().getPublicEndpoint())
                ? appProperties.getS3().getPublicEndpoint()
                : appProperties.getS3().getEndpoint();

        var builder = S3Presigner.builder()
                .region(Region.of(region))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(appProperties.getS3().isPathStyleAccess())
                        .build());

        if (hasText(presignerEndpoint)) {
            builder.endpointOverride(URI.create(presignerEndpoint));
        }

        if (hasText(accessKey) && hasText(secretKey)) {
            builder.credentialsProvider(
                    StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)));
        } else {
            builder.credentialsProvider(DefaultCredentialsProvider.create());
        }

        return builder.build();
    }

    private static boolean hasText(String s) {
        return s != null && !s.isBlank();
    }
}
