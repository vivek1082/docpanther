-- Wave 3 schema additions: missing columns, documents update, share_links rebuild,
-- superadmin tables, and template_items enhancements

-- ── cases: missing columns ────────────────────────────────────────────────────
ALTER TABLE cases
    ADD COLUMN IF NOT EXISTS folder_id          UUID REFERENCES file_nodes(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS max_file_size_mb   INT NOT NULL DEFAULT 25,
    ADD COLUMN IF NOT EXISTS allowed_file_types TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS total_items        INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS uploaded_items     INT NOT NULL DEFAULT 0;

-- upload_token needs to support 10-char tokens from TokenGenerator, not just UUIDs
ALTER TABLE cases ALTER COLUMN upload_token TYPE VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_cases_folder ON cases(folder_id);

-- ── checklist_items: missing columns ─────────────────────────────────────────
ALTER TABLE checklist_items
    ADD COLUMN IF NOT EXISTS max_file_size_mb   INT,
    ADD COLUMN IF NOT EXISTS allowed_file_types TEXT[] NOT NULL DEFAULT '{}';

-- ── documents: add tenant_id (storage agent writes this) ─────────────────────
ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);

-- ── share_links: rebuild to match ShareLink entity ───────────────────────────
-- Old share_links (from V3) referenced documents. New model is case/document-id based.
DROP TABLE IF EXISTS share_links;

CREATE TABLE share_links (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    case_id     UUID REFERENCES cases(id) ON DELETE CASCADE,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    token       VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    expires_at  TIMESTAMPTZ,
    max_views   INT,
    view_count  INT NOT NULL DEFAULT 0,
    s3_key      VARCHAR(1024) NOT NULL,
    filename    VARCHAR(512) NOT NULL,
    created_by  UUID NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_share_links_token     ON share_links(token);
CREATE INDEX idx_share_links_case_id   ON share_links(case_id);
CREATE INDEX idx_share_links_doc_id    ON share_links(document_id);
CREATE INDEX idx_share_links_tenant    ON share_links(tenant_id);

-- ── template_items: missing columns ──────────────────────────────────────────
ALTER TABLE template_items
    ADD COLUMN IF NOT EXISTS max_file_size_mb   INT,
    ADD COLUMN IF NOT EXISTS allowed_file_types TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ── superadmin tables ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pods (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region       VARCHAR(50) NOT NULL,
    type         VARCHAR(16) NOT NULL,
    status       VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    tenant_count INT NOT NULL DEFAULT 0,
    storage_gb   DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_pod_assignments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    pod_id      UUID NOT NULL REFERENCES pods(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_pod_assignments_pod ON tenant_pod_assignments(pod_id);

CREATE TABLE IF NOT EXISTS tenant_admin_metadata (
    tenant_id         UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    suspended         BOOLEAN NOT NULL DEFAULT FALSE,
    suspension_reason TEXT,
    suspended_at      TIMESTAMPTZ
);
