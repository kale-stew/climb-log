-- Peaks topped on each outing, comma-joined from the Notion `summits`
-- multi-select (option names can't contain commas).
ALTER TABLE climbs ADD COLUMN summits TEXT;
