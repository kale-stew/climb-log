-- Fix NOT NULL constraints - SQLite doesn't support ALTER COLUMN, so we recreate tables

-- Recreate climbs table
CREATE TABLE climbs_new (
  id TEXT PRIMARY KEY,
  date TEXT,
  title TEXT,
  slug TEXT,
  preview_img_url TEXT,
  distance REAL,
  gain INTEGER,
  area TEXT,
  state TEXT,
  strava TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO climbs_new SELECT * FROM climbs;
DROP TABLE climbs;
ALTER TABLE climbs_new RENAME TO climbs;

CREATE INDEX IF NOT EXISTS idx_climbs_date ON climbs(date DESC);
CREATE INDEX IF NOT EXISTS idx_climbs_area ON climbs(area);
CREATE INDEX IF NOT EXISTS idx_climbs_state ON climbs(state);
