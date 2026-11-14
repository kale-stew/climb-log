-- Readable photo URLs on kylies.photos (/photos/{slug}). photos-api owns photo
-- metadata; this table owns only the URL space. A slug, once issued, always
-- points at the same photo: when a title changes the photo gets a new current
-- slug and older ones redirect to it.
CREATE TABLE photo_slugs (
  slug TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL,
  -- slugify(title) the slug was derived from; a different value means the title changed.
  base TEXT NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 1 CHECK (is_current IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_photo_slugs_current ON photo_slugs(photo_id) WHERE is_current = 1;
CREATE INDEX idx_photo_slugs_photo ON photo_slugs(photo_id);
