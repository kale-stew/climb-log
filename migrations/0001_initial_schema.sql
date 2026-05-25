-- Climbs table
CREATE TABLE IF NOT EXISTS climbs (
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

CREATE INDEX IF NOT EXISTS idx_climbs_date ON climbs(date DESC);
CREATE INDEX IF NOT EXISTS idx_climbs_area ON climbs(area);
CREATE INDEX IF NOT EXISTS idx_climbs_state ON climbs(state);

-- Peaks table
CREATE TABLE IF NOT EXISTS peaks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  elevation INTEGER NOT NULL,
  first_completed TEXT,
  range TEXT,
  rank INTEGER,
  img TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_peaks_elevation ON peaks(elevation DESC);
CREATE INDEX IF NOT EXISTS idx_peaks_range ON peaks(range);

-- Gear table
CREATE TABLE IF NOT EXISTS gear (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  acquired_on TEXT,
  brand TEXT,
  category TEXT,
  color TEXT,
  img TEXT,
  more_info TEXT,
  pack_list TEXT,
  product_str TEXT,
  retired_on TEXT,
  url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_gear_category ON gear(category);
CREATE INDEX IF NOT EXISTS idx_gear_pack_list ON gear(pack_list);

-- Photos table
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  title TEXT,
  caption TEXT,
  src TEXT NOT NULL,
  thumbnail TEXT,
  area TEXT,
  state TEXT,
  date TEXT,
  width INTEGER,
  height INTEGER,
  search_tags TEXT,
  exclude INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_photos_date ON photos(date DESC);
CREATE INDEX IF NOT EXISTS idx_photos_area ON photos(area);

-- Posts table (for search across blog content)
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  date TEXT,
  preview TEXT,
  preview_img_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_posts_date ON posts(date DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);

-- Sync log table
CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL,
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_log_type ON sync_log(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_log_started ON sync_log(started_at DESC);
