-- Add DB connection fields to pods so each pod can target its own database.
-- NULL db_url means "use the control-plane DataSource" (single-DB mode).
ALTER TABLE pods
    ADD COLUMN IF NOT EXISTS db_url      VARCHAR(512),
    ADD COLUMN IF NOT EXISTS db_username VARCHAR(128),
    ADD COLUMN IF NOT EXISTS db_password VARCHAR(256);

-- Seed the default pod (fixed UUID so it is idempotent across restarts).
-- db_url is intentionally NULL here — PodDataSourceRegistry treats NULL as
-- "route to control-plane DataSource", so this is correct for single-DB setups.
INSERT INTO pods (id, region, type, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'ap-south-1', 'STANDARD', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Assign every tenant that has no pod yet to the default pod.
INSERT INTO tenant_pod_assignments (id, tenant_id, pod_id)
SELECT gen_random_uuid(), t.id, '00000000-0000-0000-0000-000000000001'
FROM   tenants t
WHERE  NOT EXISTS (
    SELECT 1 FROM tenant_pod_assignments tpa WHERE tpa.tenant_id = t.id
)
ON CONFLICT DO NOTHING;
