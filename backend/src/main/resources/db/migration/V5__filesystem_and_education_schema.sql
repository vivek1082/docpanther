-- Filesystem: folders, file_nodes, permissions

CREATE TYPE node_type AS ENUM ('FOLDER', 'FILE');

CREATE TABLE file_nodes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    parent_id   UUID REFERENCES file_nodes(id) ON DELETE CASCADE,
    name        VARCHAR(512) NOT NULL,
    type        node_type NOT NULL DEFAULT 'FOLDER',
    s3_key      VARCHAR(1024),
    mime_type   VARCHAR(255),
    size_bytes  BIGINT,
    created_by  UUID NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_file_nodes_tenant    ON file_nodes(tenant_id);
CREATE INDEX idx_file_nodes_parent    ON file_nodes(parent_id);
CREATE INDEX idx_file_nodes_created_by ON file_nodes(created_by);

CREATE TRIGGER trg_file_nodes_updated_at
    BEFORE UPDATE ON file_nodes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TYPE permission_role AS ENUM ('VIEWER', 'EDITOR', 'OWNER');

CREATE TABLE file_node_permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id     UUID NOT NULL REFERENCES file_nodes(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    role        permission_role NOT NULL DEFAULT 'VIEWER',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(node_id, user_id)
);

CREATE INDEX idx_file_node_permissions_node ON file_node_permissions(node_id);
CREATE INDEX idx_file_node_permissions_user ON file_node_permissions(user_id);

-- ── Education schema ──────────────────────────────────────────────────────────

CREATE TABLE batch_templates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    created_by  UUID NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_batch_templates_updated_at
    BEFORE UPDATE ON batch_templates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE batch_template_subjects (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id         UUID NOT NULL REFERENCES batch_templates(id) ON DELETE CASCADE,
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    default_teacher_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    sort_order          INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_batch_template_subjects_template ON batch_template_subjects(template_id);

CREATE TABLE batches (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    template_id UUID REFERENCES batch_templates(id) ON DELETE SET NULL,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    start_date  DATE,
    end_date    DATE,
    created_by  UUID NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_batches_tenant     ON batches(tenant_id);
CREATE INDEX idx_batches_template   ON batches(template_id);

CREATE TRIGGER trg_batches_updated_at
    BEFORE UPDATE ON batches
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE batch_subjects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id    UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_batch_subjects_batch ON batch_subjects(batch_id);

CREATE TABLE subject_teachers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id  UUID NOT NULL REFERENCES batch_subjects(id) ON DELETE CASCADE,
    teacher_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(subject_id, teacher_id)
);

CREATE INDEX idx_subject_teachers_subject ON subject_teachers(subject_id);
CREATE INDEX idx_subject_teachers_teacher ON subject_teachers(teacher_id);

CREATE TABLE batch_enrollments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id    UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(batch_id, student_id)
);

CREATE INDEX idx_batch_enrollments_batch   ON batch_enrollments(batch_id);
CREATE INDEX idx_batch_enrollments_student ON batch_enrollments(student_id);

CREATE TYPE material_status AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

CREATE TABLE materials (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id   UUID NOT NULL REFERENCES batch_subjects(id) ON DELETE CASCADE,
    title        VARCHAR(255) NOT NULL,
    description  TEXT,
    s3_key       VARCHAR(1024),
    mime_type    VARCHAR(255),
    size_bytes   BIGINT,
    status       material_status NOT NULL DEFAULT 'PENDING_REVIEW',
    uploaded_by  UUID NOT NULL REFERENCES users(id),
    approved_by  UUID REFERENCES users(id),
    approved_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_materials_subject ON materials(subject_id);
CREATE INDEX idx_materials_status  ON materials(status);

CREATE TRIGGER trg_materials_updated_at
    BEFORE UPDATE ON materials
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE student_storage (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    quota_bytes BIGINT NOT NULL DEFAULT 5368709120,  -- 5 GB default
    used_bytes  BIGINT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, tenant_id)
);

CREATE TRIGGER trg_student_storage_updated_at
    BEFORE UPDATE ON student_storage
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE student_files (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    filename    VARCHAR(512) NOT NULL,
    s3_key      VARCHAR(1024) NOT NULL,
    mime_type   VARCHAR(255),
    size_bytes  BIGINT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_files_user   ON student_files(user_id);
CREATE INDEX idx_student_files_tenant ON student_files(tenant_id);

-- Notifications
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
    type        VARCHAR(100) NOT NULL,
    title       VARCHAR(512) NOT NULL,
    body        TEXT,
    read        BOOLEAN NOT NULL DEFAULT FALSE,
    data        JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user    ON notifications(user_id);
CREATE INDEX idx_notifications_unread  ON notifications(user_id, read) WHERE read = FALSE;
