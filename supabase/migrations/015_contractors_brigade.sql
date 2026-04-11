-- Migration 015: Add brigade fields to contractors
-- Allows contractors to register as brigades with crew details

ALTER TABLE contractors ADD COLUMN IF NOT EXISTS is_brigade BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS crew_size INTEGER;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS has_transport BOOLEAN;
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS has_tools BOOLEAN;

CREATE INDEX IF NOT EXISTS idx_contractors_is_brigade ON contractors (is_brigade) WHERE is_brigade = true;
