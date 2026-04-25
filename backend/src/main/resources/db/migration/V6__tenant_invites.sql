-- Tenant invitations

CREATE TABLE IF NOT EXISTS tenant_invites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email       VARCHAR(255) NOT NULL,
    role        VARCHAR(50)  NOT NULL DEFAULT 'TENANT_MEMBER',
    token       VARCHAR(255) NOT NULL UNIQUE,
    accepted    BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_invites_tenant ON tenant_invites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_token  ON tenant_invites(token);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_email  ON tenant_invites(email);
