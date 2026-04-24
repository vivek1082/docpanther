-- Control plane schema: user identity, tenant registry, roles
-- This DB lives in ap-south-1 (India) always — no sensitive business data here

CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) NOT NULL UNIQUE,
    google_id   VARCHAR(255) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    avatar_url  VARCHAR(512),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);

CREATE TYPE tenant_region AS ENUM ('ap-south-1', 'us-east-1', 'eu-central-1', 'me-central-1');
CREATE TYPE tenant_plan   AS ENUM ('FREE', 'STARTER', 'GROWTH', 'ENTERPRISE');

CREATE TABLE tenants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        VARCHAR(100) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    region      tenant_region NOT NULL DEFAULT 'ap-south-1',
    plan        tenant_plan NOT NULL DEFAULT 'FREE',
    logo_url    VARCHAR(512),
    created_by  UUID NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);

CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_MEMBER', 'INDIVIDUAL');

CREATE TABLE user_tenant_roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
    role        user_role NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, tenant_id)
);

CREATE INDEX idx_user_tenant_roles_user ON user_tenant_roles(user_id);
CREATE INDEX idx_user_tenant_roles_tenant ON user_tenant_roles(tenant_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
