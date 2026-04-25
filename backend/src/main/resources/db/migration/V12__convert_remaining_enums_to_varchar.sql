-- Convert remaining PostgreSQL enum columns to VARCHAR for Hibernate compatibility

ALTER TABLE checklist_items
    ALTER COLUMN status TYPE VARCHAR(32) USING status::VARCHAR,
    ALTER COLUMN type   TYPE VARCHAR(32) USING type::VARCHAR;

ALTER TABLE template_items
    ALTER COLUMN type TYPE VARCHAR(32) USING type::VARCHAR;

ALTER TABLE file_node_permissions
    ALTER COLUMN role TYPE VARCHAR(32) USING role::VARCHAR;

ALTER TABLE file_nodes
    ALTER COLUMN type TYPE VARCHAR(32) USING type::VARCHAR;

ALTER TABLE materials
    ALTER COLUMN status TYPE VARCHAR(32) USING status::VARCHAR;
