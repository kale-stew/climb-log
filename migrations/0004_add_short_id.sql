-- Add short_id column for cleaner image URLs
-- e.g., /img/a1b2c3d instead of /img/18e01b50-4364-8024-85d8-e12aba9ac803

ALTER TABLE photos ADD COLUMN short_id TEXT;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_photos_short_id ON photos(short_id);
