# Place Maps: Photo Pins On Chapter Pages

> **Status: feasibility spec, not started.** Measured against production
> `climb-log-db` and `photos-db` on 2026-11-12.

## Goal

Add an Apple Photos–style map to each chapter page (`/places/{slug}`, for
example `/places/elsewhere`): rounded photo thumbnails pinned to where they
were taken, each with a count badge. Nearby pins merge into one as you zoom
out, and tapping a pin opens those photos in the existing lightbox.

## Verdict

It's doable. The rendering is the easy part. The hard part is that most
outings have no coordinates yet, so a location backfill has to ship before the
map can look full.

## What exists today

| Fact | Where |
|---|---|
| Chapter pages render on the server. Each one loads journal outings, groups them into chapters by `state`, and has no client island. | `src/pages/places/[slug].astro`, `src/lib/places.ts` (`CHAPTER_DEFINITIONS`, `buildChapters`) |
| `elsewhere` collects every state outside the five named chapters. | `src/lib/places.ts` |
| Outings have `area` and `state` text and a `strava` URL, but no coordinates. Peaks have no coordinates either. | `migrations/0001_initial_schema.sql`, `0002_fix_nullable.sql` |
| photos-api stores EXIF GPS in `photo_exif.gps_latitude/gps_longitude`. No public endpoint exposes it. It's used only for admin location suggestions and the admin OSM embed. | photos-api `migrations/0005_photo_exif.sql`, `src/index.tsx` |
| Photo-to-outing links come from `GET /api/climb-photos`. | photos-api `src/index.tsx` |
| Neither repository depends on a map library. climb-log sets no CSP. | `package.json` |
| The lightbox is reusable and takes a `LightboxPhoto[]`. | `src/components/PhotoLightbox.tsx` |

### Coordinate coverage (production)

| Chapter | Outings | With photos | Photos | Photos with GPS | Outings with a GPS photo |
|---|---:|---:|---:|---:|---:|
| Colorado | 220 | 126 | 364 | 53 | 24 |
| California | 56 | 29 | 59 | 27 | 12 |
| Arizona | 67 | 19 | 30 | 2 | 2 |
| Utah | 53 | 34 | 66 | 6 | 5 |
| Pacific Northwest | 11 | 5 | 22 | 1 | 1 |
| Elsewhere | 19 | 13 | 36 | 10 | 4 |
| **Total** | **426** | **226** | **577** | **99** | **48** |

GPS comes almost entirely from desktop imports (168 of 280). Flickr (529),
blog (46), and Cloudflare Images (26) rows have none, because the EXIF was
stripped before import. Today, EXIF alone would place **48 of 426 outings**.

## Location data

Add one coordinate per outing, plus optional per-photo coordinates for finer
pins. Fill them from these sources, best first:

1. **Photo EXIF.** Use the median GPS of the outing's linked photos. Covers 48
   outings.
2. **Strava.** Use the activity's `start_latlng`. 302 of 426 outings have a
   `strava` URL. This needs a Strava API app and a one-time OAuth token for
   your account. It's a one-time backfill of about 302 requests, which fits
   inside the 1,000-a-day read limit. It's also the most accurate source for
   trailheads.
3. **Geocoding `area, state`.** There are 116 distinct pairs, all filled in. A
   one-time Nominatim pass with a reviewed manifest would cover the rest.
   Results are coarse (a park's centroid), so mark them `approximate`.

### Storage

Put the coordinates in a new climb-log table, separate from `climbs`:

```sql
CREATE TABLE climb_locations (
  climb_id TEXT PRIMARY KEY,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('exif', 'strava', 'geocode', 'manual')),
  precision TEXT NOT NULL CHECK (precision IN ('exact', 'approximate')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

- The Notion sync mirrors `climbs` and deletes rows that disappear. A separate
  table keeps backfilled coordinates out of the Notion mapping and out of the
  generated seed. Orphaned rows are harmless; the page joins on outings that
  exist.
- Coordinates describe the outing, so they belong in climb-log. photos-api
  keeps per-photo EXIF.
- A manual override in the photos-api climb assignment UI can come later. It
  isn't required for v1.

## Privacy

Today the site publishes no coordinates. Adding a map changes that, so:

- Pin only outings and photos linked to an outing. Unassigned photos, such as
  the San Francisco neighborhood shots, never get a pin.
- Round published coordinates to 3 decimals (about 100 m) for trailheads, and
  coarser for anything near home. Keep the full-precision GPS server-side.
- Don't add a public "all photo GPS" endpoint to photos-api. climb-log reads
  locations from its own D1 and sends only the rounded pin list for the
  current chapter to the page.
- Decide whether any outing should never be mapped, for example a home-area
  loop. A `hidden` flag on `climb_locations` would cover that.

## Rendering

| Option | Look | Cost | Notes |
|---|---|---|---|
| **MapLibre GL + Protomaps basemap on R2** (recommended) | Vector tiles you can style to match the site, with light and dark variants | No per-load fees, just R2 storage for one `.pmtiles` file | About 210 KB of JS gzipped, so lazy-load it. No API keys. Self-hosted tiles match how the rest of the site is built. |
| Apple MapKit JS | Closest to the screenshot | Needs an Apple Developer account ($99/yr). A Worker signs the JWT tokens. Free tier covers 250k map views a day. | Apple's style can't be customized much, and MapKit adds a third-party runtime. |
| Leaflet + raster OSM tiles | Plain | Free | About 40 KB. The OSM tile policy rules out production traffic, so a paid tile provider and key would be needed. |

### Recommended design

- **Island.** A `PlaceMap` React island mounted with `client:visible`, so
  MapLibre loads only when the map scrolls into view. It sits below the chapter
  header. Reserve an aspect-ratio box so the page doesn't jump while it loads.
- **Data.** The page computes `{ id, lat, lng, coverPhotoId, count, title, date }`
  for each outing on the server and inlines it as JSON. That's at most 220
  entries (Colorado), well under 30 KB.
- **Pins.** HTML markers like the Apple Photos ones: a rounded
  `/img/{id}?w=160` thumbnail, a white border, a pointer tail, and a count
  badge. Cluster with MapLibre's GeoJSON source clustering. A cluster pin
  shows the newest outing's cover and the total photo count. Only the visible
  pins get DOM markers, so dense Colorado stays fast.
- **Interaction.** Tapping a single outing opens the lightbox on that outing's
  photos. Tapping a cluster zooms to fit it, or opens a combined lightbox once
  you're at the maximum zoom. Approximate locations get a dashed border.
- **Initial view.** Fit to the chapter's pins. `elsewhere` spans Italy,
  Tanzania, Hawaiʻi, Alaska, and Wyoming, so it opens near world scale and
  depends on clustering. A pin may need to step aside where it would sit on top
  of the attribution.
- **Motion and accessibility.** Under `prefers-reduced-motion`, jump instead
  of flying. Every pin is a focusable button labeled with the outing name and
  photo count. Add a "List view" link that skips past the map, since the page's
  existing outing list already gives full keyboard and screen-reader access.

## Phases

1. **Locations.** Add the migration and a backfill script that defaults to dry
   run and writes a reviewable manifest (EXIF, then Strava, then geocoding),
   then apply it. Done means `climb_locations` covers every outing that has
   photos.
2. **Basemap.** Build a Protomaps extract (planet z0–z6 plus z7–z14 for the US
   West and the specific places in `elsewhere`) and upload it to R2. Serve it
   through the Worker with range requests. Ship the light and dark styles.
3. **Map island.** Build the map with pins, clustering, and the lightbox hookup
   on `/places/elsewhere` first, where the data is small, then turn it on for
   every chapter.
4. **Polish.** Lazy-loading, the dark theme, mobile gestures (so the map
   doesn't capture page scroll; use two-finger pan or a tap to activate), and a
   design review at 390 px and 1440 px on a preview deploy.

## Open questions

- Strava backfill: OK to create a Strava API app and authorize it once?
- Map style: self-hosted MapLibre, or pay for MapKit to get the exact Apple
  look?
- Privacy: how coarse should pins be, and are there outings to keep off the
  map?
- Should the `/places` index also get a single overview map of all chapters?
