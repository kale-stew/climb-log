-- Migration: Reconcile climbs schema with cron sync expectations
--
-- The cron sync (src/pages/api/cron.ts) writes max_elevation, moving_time,
-- alltrails, and published to the climbs table, but no prior migration adds
-- these columns. A database built purely from committed migrations would fail
-- the climb sync with "no such column". This completes the reconciliation that
-- 0006 began for peaks/gear.
--
-- NOTE: If the production database already has these columns (added manually
-- out-of-band), apply this migration only to environments that lack them.
-- SQLite has no ADD COLUMN IF NOT EXISTS, so re-applying will error per column.

ALTER TABLE climbs ADD COLUMN max_elevation INTEGER;
ALTER TABLE climbs ADD COLUMN moving_time INTEGER;
ALTER TABLE climbs ADD COLUMN alltrails TEXT;
ALTER TABLE climbs ADD COLUMN published INTEGER DEFAULT 0;
