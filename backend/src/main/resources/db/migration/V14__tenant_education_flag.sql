-- Add education_enabled flag to tenants.
-- Only ENTERPRISE plan tenants can enable the education module.
-- Defaults to false for all existing tenants.
ALTER TABLE tenants ADD COLUMN education_enabled BOOLEAN NOT NULL DEFAULT FALSE;
