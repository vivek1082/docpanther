package com.docpanther.notifications;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import software.amazon.awssdk.services.ses.SesClient;

@Configuration
@Profile("!local")
public class SesConfig {

    @Bean
    public SesClient sesClient() {
        return SesClient.create();
    }
}
