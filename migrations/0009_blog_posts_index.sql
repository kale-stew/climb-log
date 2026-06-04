-- Migration: Blog post search table with FTS5 full-text search
-- 
-- ID STRATEGY: Use slug as primary key (e.g., "winter-white-whale")
-- This ensures:
-- - Human-readable IDs in URLs and debug logs
-- - Direct mapping from file path to ID (src/content/blog/hike/winter-white-whale.md -> winter-white-whale)
-- - Stability across re-indexing (same content = same ID)
-- - Natural uniqueness (slugs are already unique per blog post)
--
-- The slug is derived from the markdown filename, matching existing URL structure.

CREATE TABLE blog_posts (
  id TEXT PRIMARY KEY,           -- slug (e.g., "winter-white-whale")
  internal_rowid INTEGER,        -- Explicit rowid for FTS5 sync
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content_text TEXT,
  tags TEXT,
  date TEXT,
  slug TEXT UNIQUE               -- Same as id, kept for query consistency
);

-- Auto-increment the internal_rowid for FTS5 compatibility
CREATE TRIGGER blog_posts_set_rowid AFTER INSERT ON blog_posts 
WHEN new.internal_rowid IS NULL BEGIN
  UPDATE blog_posts SET internal_rowid = (
    SELECT COALESCE(MAX(internal_rowid), 0) + 1 FROM blog_posts
  ) WHERE id = new.id;
END;

-- FTS5 virtual table using explicit rowid column
-- This avoids issues with TEXT primary keys and SQLite's implicit rowid
CREATE VIRTUAL TABLE blog_posts_fts USING fts5(
  title, content_text, tags,
  content=blog_posts,
  content_rowid=internal_rowid
);

-- REQUIRED triggers for FTS5 content table mode
-- Use internal_rowid instead of rowid for TEXT primary key compatibility
CREATE TRIGGER blog_posts_fts_insert AFTER INSERT ON blog_posts 
WHEN new.internal_rowid IS NOT NULL BEGIN
  INSERT INTO blog_posts_fts(rowid, title, content_text, tags)
  VALUES (new.internal_rowid, new.title, new.content_text, new.tags);
END;

CREATE TRIGGER blog_posts_fts_delete AFTER DELETE ON blog_posts BEGIN
  INSERT INTO blog_posts_fts(blog_posts_fts, rowid, title, content_text, tags)
  VALUES ('delete', old.internal_rowid, old.title, old.content_text, old.tags);
END;

CREATE TRIGGER blog_posts_fts_update AFTER UPDATE ON blog_posts BEGIN
  INSERT INTO blog_posts_fts(blog_posts_fts, rowid, title, content_text, tags)
  VALUES ('delete', old.internal_rowid, old.title, old.content_text, old.tags);
  INSERT INTO blog_posts_fts(rowid, title, content_text, tags)
  VALUES (new.internal_rowid, new.title, new.content_text, new.tags);
END;

-- Index for category filtering and date sorting
CREATE INDEX idx_blog_posts_category ON blog_posts(category);
CREATE INDEX idx_blog_posts_date ON blog_posts(date DESC);
