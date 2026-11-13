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

Pins only need to be roughly right, so the goal is one approximate coordinate
per outing. Fill them from these sources, best first:

1. **Photo EXIF already in photos-api.** Use the median GPS of the outing's
   linked photos. Covers 48 outings.
2. **Flickr geotags.** The Flickr copies imported into photos-api had their
   EXIF stripped, but Flickr still holds the geotags. 528 of 529 Flickr rows
   have `flickr_id`, and 403 outing-linked Flickr photos have no GPS. In a
   random sample of 30 outing-linked Flickr photos, 20 had a geotag on their
   Flickr page. Fetch them with `flickr.photos.geo.getLocation` (needs a free
   API key) or the public photo page, at about 1 request a second. This is
   probably the biggest single gain.
3. **Apple Photos library on this Mac.** If iCloud Photos syncs to Photos.app,
   `osxphotos` can read locations from the library database without changing
   it. Match by capture time against the outing date. This needs Full Disk
   Access for the terminal running the script.
4. **Strava `start_latlng`.** 302 of 426 outings have a `strava` URL. This
   needs a Strava API app and a one-time OAuth authorization.
5. **Geocoding `area, state`.** There are 116 distinct pairs, all filled in.
   Run a one-time Nominatim pass with a reviewed manifest. It covers every
   remaining outing at park or town precision, which is enough for this map.

Google Photos isn't a practical source. Since March 2025 its Library API
returns only media the app created itself. A Google Takeout export includes
`geoData` in its JSON sidecars, but it's a heavy one-time export to match up.

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

The map doesn't pan or zoom, so it doesn't need a map library at runtime.

### Recommended: pre-rendered basemap, server-placed pins

- **Basemap.** A one-off script renders one image per chapter, with light and
  dark variants, framed to that chapter's pins. Draw it with MapLibre in a
  headless browser against OpenFreeMap or Protomaps tiles, or project Natural
  Earth shapes with `d3-geo` for a flatter look. Upload the WebP files to R2 or
  `public/maps/`. Regenerate only when a chapter's framing changes.
- **Pins.** The Astro page projects each outing's coordinate into the image
  with the same Web Mercator bounds the script used, and renders the pins as
  absolutely positioned HTML (`left`/`top` in %). Each pin is a rounded
  `/img/{id}?w=160` thumbnail with a white border, a pointer tail, and a count
  badge.
- **Clustering** happens on the server. Greedily merge pins that would overlap
  at the rendered size, keeping the newest outing's cover and summing the
  photo counts. Mobile and desktop need different merge distances: render both
  sets and switch between them with CSS, or render one set at mobile spacing.
- **Interaction.** Pins are links or buttons. Tapping one opens the existing
  lightbox on that outing's photos, or on a cluster's combined photos, through
  a small island that's already on the page.
- **Cost.** No map JavaScript, one image request per page, and no tile API at
  runtime. Attribution goes in a caption under the map.

| Option | Runtime JS | Notes |
|---|---|---|
| **Pre-rendered image + HTML pins** (recommended) | None for the map | Lightest option. Framing is fixed per chapter. |
| Inline SVG with `d3-geo` on the server | None | Vector and themeable with CSS, but outlines only, with no terrain. A 50–200 KB SVG would sit inline in the page. |
| MapLibre GL, non-interactive | About 210 KB gzipped | Not worth it without pan and zoom. |
| Mapbox or Stadia Static Images API | None | Similar result, but it needs an API key and a third-party request on every view unless the images are cached in R2. |

## Phases

1. **Locations.** Add the migration and a backfill script that defaults to dry
   run and writes a reviewable manifest (EXIF, then Flickr, Apple Photos,
   Strava, and geocoding), then apply it.
2. **Basemaps.** Write the render script and generate the chapter images.
   Start with `elsewhere`.
3. **Pins.** Add server-side projection and clustering on `/places/elsewhere`,
   then turn it on for every chapter.
4. **Review.** Test light and dark modes at 390 px and 1440 px on a preview
   deploy.

## Open questions

- Which sources to use for the backfill: a Flickr API key, Full Disk Access
  for `osxphotos`, or a Strava app?
- Basemap look: terrain (headless MapLibre render) or flat outlines
  (`d3-geo`)?
- Privacy: how coarse should pins be, and are there outings to keep off the
  map?
- Should the `/places` index also get a single overview map of all chapters?
