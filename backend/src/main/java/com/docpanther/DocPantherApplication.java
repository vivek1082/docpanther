package com.docpanther;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class DocPantherApplication {
    public static void main(String[] args) {
        SpringApplication.run(DocPantherApplication.class, args);
    }
}
