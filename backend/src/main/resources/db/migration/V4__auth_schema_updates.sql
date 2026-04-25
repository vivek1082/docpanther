-- Auth schema: extend users, add email_verifications, password_resets, fix audit_logs

-- Allow google_id to be NULL for email/password registrations
ALTER TABLE users
    ALTER COLUMN google_id DROP NOT NULL,
    ALTER COLUMN google_id DROP DEFAULT;

DROP INDEX IF EXISTS idx_users_google_id;
CREATE UNIQUE INDEX idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;

-- Add new auth fields to users
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash     VARCHAR(255),
    ADD COLUMN IF NOT EXISTS email_verified    BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS registration_mode VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL',
    ADD COLUMN IF NOT EXISTS tenant_id         UUID REFERENCES tenants(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS org_name          VARCHAR(255),
    ADD COLUMN IF NOT EXISTS org_slug          VARCHAR(100),
    ADD COLUMN IF NOT EXISTS org_region        VARCHAR(50);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS email_verifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_token   ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications(user_id);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(255) NOT NULL UNIQUE,
    used       BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token   ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);

-- Fix audit_logs.action — change from narrow enum to free-form text
-- Drop the old enum-typed action column and add a text column instead
ALTER TABLE audit_logs
    ALTER COLUMN action TYPE TEXT;

-- Drop the old DB-level audit_action enum (no longer needed)
DROP TYPE IF EXISTS audit_action;

-- Add actor_ip column if not present (may have been missed)
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS actor_ip INET;

-- Checklist item documents (element collection from ChecklistItem)
CREATE TABLE IF NOT EXISTS checklist_item_documents (
    checklist_item_id UUID NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
    document_id       UUID NOT NULL,
    PRIMARY KEY (checklist_item_id, document_id)
);
