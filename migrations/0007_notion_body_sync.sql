-- Migration: Add Notion body columns for rich content sync
-- NOTE: notion_id columns already added in 0006_schema_reconciliation.sql

-- Notion body columns for climbs
ALTER TABLE climbs ADD COLUMN notion_body TEXT;
ALTER TABLE climbs ADD COLUMN notion_body_synced_at TEXT;

-- Notion body columns for peaks (plus slug for URL routing)
ALTER TABLE peaks ADD COLUMN notion_body TEXT;
ALTER TABLE peaks ADD COLUMN notion_body_synced_at TEXT;
ALTER TABLE peaks ADD COLUMN slug TEXT;

-- Notion body columns for gear (plus slug for URL routing)
ALTER TABLE gear ADD COLUMN notion_body TEXT;
ALTER TABLE gear ADD COLUMN notion_body_synced_at TEXT;
ALTER TABLE gear ADD COLUMN slug TEXT;

-- Indexes for slug lookups
CREATE INDEX IF NOT EXISTS idx_peaks_slug ON peaks(slug);
CREATE INDEX IF NOT EXISTS idx_gear_slug ON gear(slug);
