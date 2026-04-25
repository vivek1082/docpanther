-- Fix missing columns and tables discovered during entity validation

-- tenants.created_by is NOT NULL but Tenant entity doesn't map it; make nullable
ALTER TABLE tenants ALTER COLUMN created_by DROP NOT NULL;


-- email_verifications is missing the `used` flag
ALTER TABLE email_verifications
    ADD COLUMN IF NOT EXISTS used BOOLEAN NOT NULL DEFAULT FALSE;

-- email_templates table (required by EmailTemplate entity)
CREATE TABLE IF NOT EXISTS email_templates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
    type        VARCHAR(64) NOT NULL,
    subject     VARCHAR(512) NOT NULL,
    html_body   TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_tenant_type ON email_templates(tenant_id, type);

CREATE TRIGGER trg_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
