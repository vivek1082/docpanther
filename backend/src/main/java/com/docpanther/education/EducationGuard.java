package com.docpanther.education;

import com.docpanther.common.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class EducationGuard {

    private final JdbcTemplate jdbcTemplate;

    public void requireEnabled(UUID tenantId) {
        if (tenantId == null) {
            throw ApiException.forbidden();
        }
        Boolean enabled = jdbcTemplate.queryForObject(
            "SELECT education_enabled FROM tenants WHERE id = ?",
            Boolean.class, tenantId);
        if (!Boolean.TRUE.equals(enabled)) {
            throw new ApiException(
                org.springframework.http.HttpStatus.FORBIDDEN,
                "EDUCATION_DISABLED",
                "Education module is not enabled for this organisation. Enable it in Settings → Organisation.");
        }
    }
}
