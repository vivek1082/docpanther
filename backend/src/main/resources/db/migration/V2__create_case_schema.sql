-- Core product schema: cases, checklists, documents, templates
-- Lives in control plane DB for individual users; replicated per-region for tenants

CREATE TYPE storage_mode AS ENUM ('FLAT', 'STRUCTURED');
CREATE TYPE case_status  AS ENUM ('PENDING', 'PARTIAL', 'COMPLETE');

CREATE TABLE cases (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES users(id),
    reference_no    VARCHAR(100) NOT NULL,
    customer_name   VARCHAR(255) NOT NULL,
    customer_email  VARCHAR(255) NOT NULL,
    tags            TEXT[] NOT NULL DEFAULT '{}',
    status          case_status NOT NULL DEFAULT 'PENDING',
    storage_mode    storage_mode NOT NULL DEFAULT 'STRUCTURED',
    upload_token    UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    s3_folder       VARCHAR(512),
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cases_tenant ON cases(tenant_id);
CREATE INDEX idx_cases_created_by ON cases(created_by);
CREATE INDEX idx_cases_upload_token ON cases(upload_token);
CREATE INDEX idx_cases_status ON cases(status);

CREATE TRIGGER trg_cases_updated_at
    BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TYPE item_type   AS ENUM ('FILE_UPLOAD', 'TEXT_INPUT');
CREATE TYPE item_status AS ENUM ('PENDING', 'UPLOADED', 'APPROVED', 'REJECTED');

CREATE TABLE checklist_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id         UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    type            item_type NOT NULL DEFAULT 'FILE_UPLOAD',
    required        BOOLEAN NOT NULL DEFAULT TRUE,
    allow_multiple  BOOLEAN NOT NULL DEFAULT FALSE,
    status          item_status NOT NULL DEFAULT 'PENDING',
    text_value      TEXT,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checklist_items_case ON checklist_items(case_id);

CREATE TRIGGER trg_checklist_items_updated_at
    BEFORE UPDATE ON checklist_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_item_id UUID NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
    case_id         UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    filename        VARCHAR(512) NOT NULL,
    content_type    VARCHAR(255),
    size_bytes      BIGINT,
    s3_key          VARCHAR(1024) NOT NULL,
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_checklist_item ON documents(checklist_item_id);
CREATE INDEX idx_documents_case ON documents(case_id);

CREATE TABLE templates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
    created_by  UUID REFERENCES users(id),
    name        VARCHAR(255) NOT NULL,
    tag         VARCHAR(100),
    is_global   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_templates_tenant ON templates(tenant_id);

CREATE TRIGGER trg_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE template_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id     UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    type            item_type NOT NULL DEFAULT 'FILE_UPLOAD',
    required        BOOLEAN NOT NULL DEFAULT TRUE,
    allow_multiple  BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order      INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_template_items_template ON template_items(template_id);
