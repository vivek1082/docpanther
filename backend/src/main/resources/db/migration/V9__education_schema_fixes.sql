-- Fix education entity vs migration discrepancies

-- batches: add missing columns
ALTER TABLE batches
    ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20),
    ADD COLUMN IF NOT EXISTS batch_template_id UUID REFERENCES batch_templates(id) ON DELETE SET NULL;

-- materials: add missing columns
ALTER TABLE materials
    ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS filename VARCHAR(512),
    ADD COLUMN IF NOT EXISTS content_type VARCHAR(255),
    ADD COLUMN IF NOT EXISTS rejection_note TEXT;

CREATE INDEX IF NOT EXISTS idx_materials_batch ON materials(batch_id);

-- student_files: entity uses content_type but migration has mime_type
ALTER TABLE student_files
    ADD COLUMN IF NOT EXISTS content_type VARCHAR(255);

-- subject_teachers: entity uses user_id (not teacher_id), needs is_primary column
-- Add user_id as alias and is_primary column
ALTER TABLE subject_teachers
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE;

-- Populate user_id from teacher_id for existing rows
UPDATE subject_teachers SET user_id = teacher_id WHERE user_id IS NULL;

-- Drop old UNIQUE(subject_id, teacher_id) and add new one
ALTER TABLE subject_teachers DROP CONSTRAINT IF EXISTS subject_teachers_subject_id_teacher_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_subject_teachers_subject_user ON subject_teachers(subject_id, user_id);

-- batch_enrollments: entity uses @EmbeddedId (batch_id, student_id) as PK but table has UUID id PK
-- We add the unique constraint on the columns the entity treats as the composite PK;
-- Entity needs to be refactored to use UUID PK instead of EmbeddedId
-- (handled by entity changes)
