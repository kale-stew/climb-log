-- Migration: Add retailer intelligence for gear recommendations
-- Parses existing gear.url to extract retailer info

ALTER TABLE gear ADD COLUMN retailer TEXT;
ALTER TABLE gear ADD COLUMN url_parsed_at TEXT;

CREATE INDEX IF NOT EXISTS idx_gear_retailer ON gear(retailer);
