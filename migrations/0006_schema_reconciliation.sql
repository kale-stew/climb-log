-- Migration: Reconcile schema mismatches between initial schema and cron sync
-- 
-- CRITICAL ISSUES FIXED:
-- 1. peaks table: cron sync writes to `name` but schema has `title`
-- 2. gear table: cron sync writes to `name` but schema has `title`
-- 3. Missing `notion_id` columns needed for Notion body sync
-- 4. Missing columns from cron sync (prominence, attempts, list_class, weight_oz, etc.)

-- ============================================================================
-- PEAKS TABLE: Add missing columns and reconcile name/title
-- ============================================================================

-- Add columns that cron sync expects but initial schema doesn't have
ALTER TABLE peaks ADD COLUMN name TEXT;
ALTER TABLE peaks ADD COLUMN prominence INTEGER;
ALTER TABLE peaks ADD COLUMN attempts INTEGER;
ALTER TABLE peaks ADD COLUMN list_class TEXT;
ALTER TABLE peaks ADD COLUMN notion_id TEXT;

-- Copy existing title data to name (for any existing rows)
UPDATE peaks SET name = title WHERE name IS NULL AND title IS NOT NULL;

-- Create index for notion_id lookups (needed for body sync)
CREATE INDEX IF NOT EXISTS idx_peaks_notion_id ON peaks(notion_id);

-- ============================================================================
-- GEAR TABLE: Add missing columns and reconcile name/title  
-- ============================================================================

-- Add columns that cron sync expects but initial schema doesn't have
ALTER TABLE gear ADD COLUMN name TEXT;
ALTER TABLE gear ADD COLUMN weight_oz REAL;
ALTER TABLE gear ADD COLUMN price REAL;
ALTER TABLE gear ADD COLUMN rating REAL;
ALTER TABLE gear ADD COLUMN status TEXT;
ALTER TABLE gear ADD COLUMN notes TEXT;
ALTER TABLE gear ADD COLUMN image_url TEXT;
ALTER TABLE gear ADD COLUMN notion_id TEXT;

-- Copy existing title data to name (for any existing rows)
UPDATE gear SET name = title WHERE name IS NULL AND title IS NOT NULL;

-- Create index for notion_id lookups (needed for body sync)
CREATE INDEX IF NOT EXISTS idx_gear_notion_id ON gear(notion_id);

-- ============================================================================
-- CLIMBS TABLE: Add notion_id for body sync
-- ============================================================================

-- Add notion_id column (climbs already sync correctly, just need the ID)
ALTER TABLE climbs ADD COLUMN notion_id TEXT;

-- Create index for notion_id lookups (needed for body sync)
CREATE INDEX IF NOT EXISTS idx_climbs_notion_id ON climbs(notion_id);
