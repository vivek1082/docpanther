-- Audit log FK constraints cause async write failures because @Async fires
-- before the main transaction commits. Audit logs are append-only and use
-- ON DELETE SET NULL anyway, so strict RI is not needed.
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_case_id_fkey;
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_checklist_item_id_fkey;
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_tenant_id_fkey;
