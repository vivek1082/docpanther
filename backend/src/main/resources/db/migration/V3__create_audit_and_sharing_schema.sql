-- Audit log and link sharing schema

CREATE TYPE actor_type  AS ENUM ('ADMIN', 'CUSTOMER');
CREATE TYPE audit_action AS ENUM (
    'CASE_CREATED', 'CASE_UPDATED', 'CASE_DELETED',
    'FILE_UPLOADED', 'FILE_APPROVED', 'FILE_REJECTED', 'FILE_DELETED',
    'TEXT_SUBMITTED',
    'REMINDER_SENT',
    'LINK_SHARED', 'LINK_VIEWED', 'LINK_PASSWORD_FAILED'
);

CREATE TABLE audit_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID REFERENCES tenants(id),
    case_id             UUID REFERENCES cases(id) ON DELETE SET NULL,
    checklist_item_id   UUID REFERENCES checklist_items(id) ON DELETE SET NULL,
    actor_type          actor_type NOT NULL,
    actor_id            UUID,
    actor_ip            INET,
    action              audit_action NOT NULL,
    metadata            JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_case ON audit_logs(case_id);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

CREATE TABLE share_links (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    token           UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    password_hash   VARCHAR(255),
    expires_at      TIMESTAMPTZ,
    max_views       INT,
    view_count      INT NOT NULL DEFAULT 0,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_share_links_token ON share_links(token);
CREATE INDEX idx_share_links_document ON share_links(document_id);
