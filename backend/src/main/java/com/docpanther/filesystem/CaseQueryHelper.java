package com.docpanther.filesystem;

import com.docpanther.filesystem.dto.CaseSummaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Component;

import java.sql.Array;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class CaseQueryHelper {

    private final JdbcTemplate jdbcTemplate;

    private static final RowMapper<CaseSummaryDto> CASE_MAPPER = (rs, rowNum) -> {
        Array tagsArray = rs.getArray("tags");
        List<String> tags = (tagsArray != null)
                ? Arrays.asList((String[]) tagsArray.getArray())
                : List.of();

        return new CaseSummaryDto(
                rs.getObject("id", UUID.class),
                null,                                    // no folder_id in cases table
                rs.getString("reference_no"),
                rs.getString("customer_name"),
                rs.getString("customer_email"),
                tags,
                rs.getString("status"),
                rs.getString("storage_mode"),
                rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("updated_at").toInstant()
        );
    };

    public List<CaseSummaryDto> listForTenant(UUID tenantId) {
        return jdbcTemplate.query(
                """
                SELECT id, reference_no, customer_name, customer_email,
                       tags, status, storage_mode, created_at, updated_at
                FROM cases
                WHERE tenant_id = ?
                ORDER BY created_at DESC
                LIMIT 200
                """,
                CASE_MAPPER, tenantId);
    }

    public List<CaseSummaryDto> searchForTenant(UUID tenantId, String q) {
        String pattern = "%" + q.toLowerCase() + "%";
        return jdbcTemplate.query(
                """
                SELECT id, reference_no, customer_name, customer_email,
                       tags, status, storage_mode, created_at, updated_at
                FROM cases
                WHERE tenant_id = ?
                  AND (LOWER(reference_no) LIKE ? OR LOWER(customer_name) LIKE ?)
                ORDER BY created_at DESC
                LIMIT 50
                """,
                CASE_MAPPER, tenantId, pattern, pattern);
    }
}
