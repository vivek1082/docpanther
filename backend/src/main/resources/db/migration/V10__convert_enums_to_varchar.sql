-- Convert PostgreSQL custom enum columns to VARCHAR so Hibernate @Enumerated(EnumType.STRING) works
-- without needing PostgreSQLEnumJdbcType. Zero data loss since enum values are stored as strings.

ALTER TABLE audit_logs
    ALTER COLUMN actor_type TYPE VARCHAR(32) USING actor_type::VARCHAR;

ALTER TABLE cases
    ALTER COLUMN status       TYPE VARCHAR(32) USING status::VARCHAR,
    ALTER COLUMN storage_mode TYPE VARCHAR(32) USING storage_mode::VARCHAR;

ALTER TABLE tenants
    ALTER COLUMN plan   TYPE VARCHAR(32) USING plan::VARCHAR,
    ALTER COLUMN region TYPE VARCHAR(64) USING region::VARCHAR;

ALTER TABLE user_tenant_roles
    ALTER COLUMN role TYPE VARCHAR(64) USING role::VARCHAR;

-- Convert actor_ip inet to varchar for simpler Hibernate mapping
ALTER TABLE audit_logs
    ALTER COLUMN actor_ip TYPE VARCHAR(45) USING actor_ip::VARCHAR;

-- Note: not dropping the enum types as there may be other references;
-- converting columns to VARCHAR is sufficient for Hibernate compatibility.
