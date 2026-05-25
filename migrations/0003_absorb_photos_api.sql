-- Migration: Absorb photos-api schema into climb-log-db
-- Run with: wrangler d1 migrations apply climb-log-db --local / --remote

-- Add new photos-api columns to existing photos table
ALTER TABLE photos ADD COLUMN notion_id TEXT;
ALTER TABLE photos ADD COLUMN r2_key TEXT;
ALTER TABLE photos ADD COLUMN blurhash TEXT;
ALTER TABLE photos ADD COLUMN format TEXT DEFAULT 'jpeg';
ALTER TABLE photos ADD COLUMN size_bytes INTEGER;
ALTER TABLE photos ADD COLUMN site TEXT DEFAULT 'climb-log';
ALTER TABLE photos ADD COLUMN source TEXT;
ALTER TABLE photos ADD COLUMN flickr_id TEXT;
ALTER TABLE photos ADD COLUMN accent_color TEXT;
ALTER TABLE photos ADD COLUMN source_url TEXT;

-- Drop old indexes that don't match new query patterns (will be recreated)
DROP INDEX IF EXISTS idx_photos_area;

-- Create new indexes for photos-api style queries
CREATE INDEX idx_photos_site ON photos(site);
CREATE INDEX idx_photos_notion_id ON photos(notion_id);
CREATE INDEX idx_photos_flickr_id ON photos(flickr_id);

-- Join table for photos associated with climbs (new)
CREATE TABLE photo_climb_links (
  photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  climb_id TEXT NOT NULL,
  PRIMARY KEY (photo_id, climb_id)
);

CREATE INDEX idx_photo_climb_links_climb_id ON photo_climb_links(climb_id);

-- Note: The existing `src` column is preserved for backward compatibility during transition.
-- It will be deprecated once all frontend code uses `r2_key` + `format` to construct URLs.
