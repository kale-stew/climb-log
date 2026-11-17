-- Gear images move to photos-api (keyed by Notion page id) and the gear page
-- gains weights and climb links. Calendar event ids are join keys only; never
-- select them into a page.
ALTER TABLE gear ADD COLUMN img_version TEXT;
ALTER TABLE gear ADD COLUMN weight_g REAL;
ALTER TABLE gear ADD COLUMN event_ids TEXT;
ALTER TABLE climbs ADD COLUMN calendar_event_ids TEXT;
