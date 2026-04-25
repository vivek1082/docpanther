-- Create personal tenants for existing individual users so they can use the filesystem.
-- Each individual user gets a private tenant (slug = 'personal-{8 chars of userId}').
-- No entry in user_tenant_roles is added, so role stays null (preserving existing behavior).

DO $$
DECLARE
    r RECORD;
    new_tenant_id UUID;
BEGIN
    FOR r IN
        SELECT id, name FROM users WHERE registration_mode = 'INDIVIDUAL' AND tenant_id IS NULL
    LOOP
        new_tenant_id := gen_random_uuid();

        INSERT INTO tenants (id, slug, name, region, plan)
        VALUES (
            new_tenant_id,
            'personal-' || LEFT(r.id::text, 8),
            r.name,
            'ap-south-1',
            'FREE'
        );

        UPDATE users SET tenant_id = new_tenant_id WHERE id = r.id;

        -- Seed a root "My Files" folder for this user
        INSERT INTO file_nodes (tenant_id, parent_id, name, type, created_by)
        VALUES (new_tenant_id, NULL, 'My Files', 'FOLDER', r.id);
    END LOOP;
END;
$$;
