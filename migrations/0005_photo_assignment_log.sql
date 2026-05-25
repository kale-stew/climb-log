-- Audit log for manual photo assignments in admin mapper
CREATE TABLE IF NOT EXISTS photo_assignment_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  climb_id TEXT NOT NULL,
  previous_url TEXT,
  new_url TEXT NOT NULL,
  assigned_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_assignment_log_climb ON photo_assignment_log(climb_id);
CREATE INDEX IF NOT EXISTS idx_assignment_log_date ON photo_assignment_log(assigned_at DESC);
