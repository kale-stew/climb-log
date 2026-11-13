-- One approximate map position per outing. Kept apart from `climbs` so the
-- Notion sync never maps, overwrites, or seeds it.
CREATE TABLE IF NOT EXISTS climb_locations (
  climb_id TEXT PRIMARY KEY,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('exif', 'apple-photos', 'flickr', 'strava', 'geocode', 'manual')),
  hidden INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
