---
name: strava-to-climb-log
description: Turn a new Strava activity into a climb-log entry on kylies.photos. Drafts the Notion row, uploads photos to photos-api if asked, runs the Notion sync, and adds a /places pin. Flags new states, countries, and out-of-frame points for a map rebuild. Use for "log my latest hike", "add this Strava activity to climb-log", or a Strava activity URL.
---

# Strava to climb-log

Turn one Strava activity into a published outing on kylies.photos. The order matters: Notion row, photos, sync, then location. Each step depends on the one before it.

Read `AGENTS.md` in the climb-log repo before you start. Its rules take precedence over this skill.

## What you need

- **Strava connector.** Use `list_activities` and `get_activity_streams`.
- **Notion connector.** The climb-log data source is `collection://5c45c74b-ecc8-4e9d-8e24-29f1d0f8eae4`, in database `9a5bb480b5e64808b5b6487c73e3e17e`.
- **A shell in a local climb-log checkout** with `.env` filled in (`CRON_SECRET` at least), plus Wrangler logged in.
  - In Claude, use the desktop bridge shell (`device_bash`) on the connected climb-log folder. If no folder is connected, ask Kylie to connect it.
  - In a local harness, use the normal shell.
  - Never print or echo secrets. Source them inside the command, like `set -a; . ./.env; set +a; curl ...`.
- **photos-api admin access** for photo uploads. It sits behind Cloudflare Access (see "Photos").

## 1. Pick the activity

1. If Kylie gave a Strava URL, use that activity ID. Otherwise call `list_activities` with `first: 5`, `use_preferred_units: true`, and `include_polyline: true`. Show the newest few and confirm which one to log.
2. Check for duplicates. Query the data source for `strava = 'https://www.strava.com/activities/<id>'`. If a row already exists, stop and link it.

## 2. Draft the Notion row

Match the existing rows. Query the 10 most recent rows (`ORDER BY "date:date:start" DESC`) when you need to check a convention.

| Property | Rule |
|---|---|
| `hike_title` | `{Verb} {Place}`. The verb comes from the sport: Hike, Run (Run or TrailRun), Ski (any ski type), Snowshoe, or Climb (a 14er/13er or technical summit). Use `→` for point-to-point routes, e.g. `Run Bridge → Tromsdalen`. |
| `date` | The activity's local start date, as a date without a time. Multi-day trips use a range. |
| `area` | `Place, State` in the US (e.g. `Elk Range, Colorado`) and `Place, Country` elsewhere (e.g. `Tromsø, Norway`). The sync splits on the comma to get `state`, so the part after the comma decides the /places chapter. |
| `distance` | Miles, two decimals at most. |
| `gain` | Feet, rounded to a whole number. |
| `high_point` | Feet. Fill it only when there's a summit. Take it from the peak, not from Strava's max elevation. |
| `summits` | Only existing options. If the peak is new, say so and ask before adding an option. |
| `Colorado Peak(s)` | Relate it for Colorado-ranked peaks. |
| `People` | Existing options, or `solo`. Ask, because Strava doesn't know who came. |
| `strava` | `https://www.strava.com/activities/<id>` |

- Convert units yourself if `use_preferred_units` returned metric (1 m = 3.28084 ft, 1 mi = 1609.344 m).
- Create the page from the matching template: New 14er/13er Climb, New Hike, New Sunset Hike, New Snowshoe, or New Backpacking Trip.
- Show Kylie the full draft first. Write it only after she approves. Keep the new page's dashed ID, because later steps use it as `climbId`.
- Leave `related_slug`, `related_blog`, and `all-photos_item` empty unless she gives them. Never invent a caption or a blog link.

## 3. Photos (optional)

Ask whether to add photos. Ask every time where they come from.

- **Apple Photos by date.** Local only, and it needs `osxphotos` with Full Disk Access. Run `osxphotos query --from-date <date> --to-date <date+1> --json` to list candidates. Let Kylie pick, then `osxphotos export` the picks to a temp folder.
- **Attached files.** Use what she attached.

Upload each photo to photos-api with `POST https://photos-api.kylieski.workers.dev/api/admin/upload` as multipart form data.

| Field | Value |
|---|---|
| `image` | The file |
| `title` | A short title, or leave it for the filename |
| `date` | The outing date |
| `location` | The `area` value |
| `site` | `both` |
| `destination` | `editorial` (unlisted, the default) or `portfolio` (public gallery). Ask which. |
| `climbId` | The dashed Notion page ID from step 2 |

How the upload behaves:
- `/api/admin/*` requires a Cloudflare Access JWT. Use `cloudflared access curl` or an Access service token, whichever is set up locally. If neither works, give Kylie the files and the climb, and have her use `/admin/upload` in the browser. Never weaken auth to get around this.
- Files over 20 MB are rejected. Run photos-api's `npm run import:local:plan`, review it, then run `import:local:apply`.
- A duplicate (same SHA-256) returns `duplicate: true` and only reassigns the climb, which is fine.
- Report each returned photo ID. New content should use `/img/{id}`.

## 4. Sync (public step)

This step makes the outing public. Confirm with Kylie before running it.

```bash
set -a; . ./.env; set +a
curl -sS -X POST https://kylies.photos/api/cron \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Origin: https://kylies.photos"
```

- Don't redeploy. Deploys don't sync data.
- A 500 means the sync guard tripped (a missing property, an invalid row, or more than 10% of rows disappearing). Fix the Notion row and rerun. Never loosen the guard.
- To verify, check that `curl -s https://kylies.photos/api/climbs/options` lists the new ID with the expected `state`.

## 5. Location and /places

### Pin

Every outing needs a `climb_locations` row, or it gets no pin.

1. **Strava start point (first choice).** Decode the activity polyline and take its first point, or use `get_activity_streams` with `latlng`. Round both coordinates to 2 decimals. Never store finer.
2. **No GPS** (manual or treadmill activity). Fall back to the `photo-locations` skill flow in `AGENTS.md`. If that fails, geocode `area` with `source = 'geocode'`, or ask for a manual point with `source = 'manual'`.
3. **Sanity check.** Make sure the point falls in the outing's state or country. Coastal starts can read as ocean, so check them by eye.
4. Apply the row:

```bash
npx wrangler d1 execute climb-log-db --remote --command \
  "INSERT INTO climb_locations (climb_id, latitude, longitude, source) VALUES ('<dashed-id>', <lat>, <lng>, 'strava') ON CONFLICT(climb_id) DO NOTHING;"
```

`ON CONFLICT DO NOTHING` keeps hand-corrected rows intact. To fix a bad row, ask before running an `UPDATE`.

### New-location checks

Run these after the sync. Report anything that trips, and don't fix it silently.

- **New state or country.** Compare the new `state` against the distinct states in `/api/climbs/options`. If it's new:
  - It lands in the `elsewhere` chapter (`CHAPTER_DEFINITIONS` in `src/lib/places.ts`).
  - Ask whether it should join or start a chapter, or needs a `STATE_ALIASES` entry (for a two-letter code).
  - A new chapter means a code change: add it to `CHAPTER_DEFINITIONS` and to `CHAPTERS` in `scripts/build-place-maps.mjs`, then follow the map rebuild below.
- **Outside the frame.** Check the pin against its chapter's `bbox` in `scripts/build-place-maps.mjs`. If it falls outside, or sits in the top headroom band, widen the bbox. Then follow the map rebuild below.
- **Map rebuild.** This changes code, so do it on a branch, never straight on `main`:
  1. Run `npm run maps <slug>`. It regenerates `public/maps/` and `src/lib/place-map-frames.json`.
  2. Run `npm run deploy:preview`.
  3. Check `/places/<slug>` on the preview at 390 px and 1440 px.
  4. Open a PR and give Kylie the PR and preview URLs.
  5. Production deploys only when she asks.

## Finish

Report back with:
- The Notion page URL
- The photo IDs
- The sync result
- The pin, with its source
- Any new-location flags
- Every PR and deploy URL, in full
