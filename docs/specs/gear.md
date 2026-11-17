# Gear: Synced Images, Normalized Frames, And A Filterable Page

> **Status: shipped 2026-11-17.** photos-api #12 and climb-log #131 are live. The production backfill finished with 133 images ready and 3 pages without an image. `public/gear/` and the legacy fallback were removed in the follow-up cleanup PR. The legacy `gear.img` column is no longer read or written. It stays in the schema rather than being dropped with a destructive migration. Measured against the Notion gear database
> and production `kylies.photos` on 2026-11-16.

## Goal

1. Gear images come from Notion automatically: no hand-copied PNGs, no slugs.
2. Every image sits in the same frame with the same padding.
3. `/gear` becomes a dense, filterable page. Current and retired gear are
   clearly separate, and pack lists can be viewed with weights.

## What exists today

| Fact | Where |
|---|---|
| The page reads `gear` from D1 on each request and renders `/gear/{img}` from `public/gear/`. | `src/pages/gear.astro` |
| The sync maps Notion `img_slug` to `img = "{slug}.png"`. The PNG has to be copied into `public/gear/` by hand. | `src/lib/notion-sync.ts` `mapGear` |
| Notion `img` (files) holds a transparent PNG on 125 of 135 pages. All are Notion-hosted and larger than the repo copies (about 300–700px vs about 120px). | Notion gear DB |
| 16 slugs have no matching file (`65L-backpack` vs `65l-backpack.png` is case only). 9 pages have an image but no slug. 2 repo files are unused. | Audit 2026-11-16 |
| Notion file URLs are signed S3 URLs that expire after 1 hour. The URL path (`host/workspace/file/name`) stays the same across queries for the same uploaded file. | Verified with two queries |
| `🪦 Retired Items` is a category with 42 items. 20 of them have no `retired_on`. 3 items with `retired_on` are in other categories. | Notion gear DB |
| The page ignores `pack_list` (11 lists), weight (`weight_g`/`weight_oz` on 105 items), and `events`. | Notion gear DB |
| Gear `events` relates to the **Primary Calendars** DB. Climbs relate to the same DB through `Calendar Event` (217 of 438 climbs). Joining on a shared event links 7 gear items to published climbs today. Most linked events are trip summaries, some in the future. | Notion |
| Two posts link to `/gear/14er-pack-list`, which returns 404. The post lives at `/blog/gear/14er-pack-list`. | `src/content/blog/gear/first-winter-peak.md` |

Design review of the current page (design-reviewer, 1280/768/375) found:
- Retired cards render at 0.6 opacity, which fades their stories and fails contrast.
- The "OWN" badge has about 2:1 contrast and says nothing on a gear page.
- About 20 cards in the Retired section say "OWN".
- Empty grey tiles appear where an image failed to load.
- Rows have ragged heights, and cards have a hover lift but aren't clickable.
- "View product" is an 11.5px link.
- The image alt text repeats the title.
- Section order comes from sorting emoji code points.
- At 375px there is one card per row.

## Decisions

- **photos-api stores and serves gear images. climb-log's existing nightly Notion sync drives them.**
  - Reason: one Notion reader and one cron, while photos-api stays the only service that writes image bytes.
  - Gear images are product assets, not photos. They get their own table, R2 prefix, and route. They never touch `photos`, aliases, collections, or slugs.
- **The handoff is a Workers RPC entrypoint, not HTTP.**
  - photos-api exports `GearAssets extends WorkerEntrypoint`. climb-log binds to it with `entrypoint: "GearAssets"`.
  - It's reachable only through the service binding, so it needs no secret and no Access exemption.
- **Images are keyed by Notion page ID.** Exact, permanent matching. `img_slug` is no longer read and can be deleted from Notion afterwards.
- **Every image is normalized once, at ingest.**
  - Normalizing means: remove the background if needed, trim to the content's bounding box, and fit into a fixed square with fixed transparent padding.
  - The page serves derived WebP sizes from that master.
- **URLs carry a content version** so they can stay immutable: `/gear/img/{pageId}/{version}.webp?w=400`.

## photos-api changes

### Schema: `migrations/0007_gear_assets.sql`

```sql
CREATE TABLE gear_assets (
  notion_page_id TEXT PRIMARY KEY,   -- dashed Notion page id (validated UUID)
  source_key TEXT NOT NULL,          -- host + path of the Notion file URL (no query)
  source_sha256 TEXT NOT NULL,
  pipeline_version INTEGER NOT NULL,
  version TEXT NOT NULL,             -- sha256(source_sha256 + ':' + pipeline_version)[0..12]
  r2_prefix TEXT NOT NULL UNIQUE,    -- gear/{notion_page_id}/{version}
  status TEXT NOT NULL CHECK (status IN ('ready', 'needs_review')),
  background_removed INTEGER NOT NULL DEFAULT 0,
  content_coverage REAL,             -- opaque pixels / frame pixels, for review
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Superseded versions. Deleted after a grace period: inventory the prefix,
-- delete and verify R2 objects, then delete this row. A failed R2 delete keeps
-- the row, so cleanup can be retried.
CREATE TABLE gear_asset_retired_prefixes (
  r2_prefix TEXT PRIMARY KEY,
  notion_page_id TEXT NOT NULL,
  retired_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Before applying: query production `d1_migrations` and `PRAGMA table_info`, and
run the full chain against a fresh local database (photos-api AGENTS.md).

### Normalization pipeline (`src/gear-assets.ts`)

This is a deliberate second module beside `src/index.tsx`, because gear assets
are a separate domain.

**Constants:**
- `PIPELINE_VERSION = 1`
- `FRAME = 800` (output is 800×800)
- `PADDING = 0.06` (48px on each side, so the content box is 704px)
- `ALPHA_THRESHOLD = 16`
- `MAX_SOURCE_BYTES = 15 MB`

**Steps:**

1. **Fetch the source.**
   - Validate the `id` as a UUID, because it becomes part of an R2 key.
   - The full hostname must match an anchored allowlist: `prod-files-secure.s3.<region>.amazonaws.com`, `file.notion.so`, or `*.notionusercontent.com`.
   - Fetch with `redirect: 'manual'`. Any redirect fails the item.
   - Count bytes while streaming and abort past the cap.
   - Compute `source_sha256`.
2. **Read RGBA.** `IMAGES.input(src).transform({ width: 1024, height: 1024, fit: 'scale-down' }).output({ format: 'rgba' })`. Derive dimensions from `info()` plus the scale-down math, then check them against the buffer length.
3. **Check for transparency.**
   - The image counts as transparent if at least 1% of all pixels have alpha < 250. Transparent images skip segmentation.
   - Opaque images are re-read with `segment: 'foreground'` (`background_removed = 1`).
   - If segmentation throws, or covers less than 2% or more than 98%, keep the opaque image, frame it as-is, and set `status = 'needs_review'`.
4. **Find the content box** from pixels with alpha > `ALPHA_THRESHOLD`. This drops faint halos.
5. **Crop and fit.**
   - `IMAGES.input(src).transform({ width: 1024, height: 1024, fit: 'scale-down', segment? }).transform({ trim: bbox, width: 704, height: 704, fit: 'contain' }).output({ format: 'rgba' })`.
   - Centre the result on a transparent 800×800 RGBA buffer and encode with `fast-png` (`encode` only).
   - Store as `{r2_prefix}/master.png`.
6. **Record the asset.**
   - In one D1 batch: upsert `gear_assets` to the new version, and insert the old prefix (if any) into `gear_asset_retired_prefixes`.
   - Cleanup removes retired prefixes older than 7 days at the end of each RPC call, with at most 10 per call.

Steps 3–5 are pure functions on RGBA buffers and get unit tests: transparency share, bounding box with halos, centring and rounding, and empty or fully opaque inputs.

### RPC: `GearAssets.syncGearImages`

```ts
syncGearImages(
  items: { id: string; url: string | null }[],
  options?: { maxProcess?: number; dryRun?: boolean },   // maxProcess default 20
): Promise<{
  results: {
    id: string
    status: 'ready' | 'needs_review' | 'missing' | 'unsupported' | 'pending' | 'failed'
    version?: string
    error?: string
  }[]
}>
```

| Situation | Result |
|---|---|
| No URL | `missing`. Nothing is deleted. Orphan cleanup is a later, dry-run-first script. |
| Source not on the Notion-hosted allowlist (for example a Notion "external" file) | `unsupported`. Not an error, so it can't fail the sync every night. |
| Same `source_key` and `pipeline_version` | The stored version, with no fetch. |
| Changed | Processed until `maxProcess`, then `pending`. The next run continues. |
| Any per-item error | `failed` with a message. The batch keeps going. |
| `dryRun` | Reports what it would do and writes nothing. |

### Delivery: `GET /gear/:id/:version.(webp|png)`

- The route is declared with regex params.
- **Current version:**
  - `webp` with `w` = 200, 400, or 800 serves `{prefix}/w{w}.webp`, generated from `master.png` on first request.
  - `png` serves the master.
  - Either way the response is `immutable` for a year.
- **Retired or unknown version:** `302` to the current URL with `max-age=300`, so climb-log can lag one sync behind without broken images.
- **Unknown id:** 404.
- **Transforms:** gear-specific, not `getOrCreateTransform`, which is tied to the `Photo` model.
  - Own in-flight coalescing map.
  - Checks the version is current before rendering.
  - Checks again after the R2 put, and deletes the object if the version was retired meanwhile (photos-api AGENTS.md).

## climb-log changes

### Schema: `migrations/0009_gear_assets.sql`

```sql
ALTER TABLE gear ADD COLUMN img_version TEXT;
ALTER TABLE gear ADD COLUMN weight_g REAL;
ALTER TABLE gear ADD COLUMN event_ids TEXT;            -- JSON array of dashed Primary Calendars page ids
ALTER TABLE climbs ADD COLUMN calendar_event_ids TEXT; -- JSON array, same ids
```

The legacy `gear.img` column stopped being written and, after the cleanup PR, is no longer read either. It's left in place.

### Sync

- **Relations:** `fmt` gets a `relation` case that returns the IDs. When a relation reports `has_more` (more than 25 references), the remaining IDs are paged in with `pages.properties.retrieve`. None do today.
- **`mapGear`:**
  - Requires `img`, `events`, `weight_g`, and `weight_oz`, and no longer requires `img_slug`.
  - Writes `weight_g = weight_g ?? round(weight_oz × 28.3495)` and `event_ids`.
  - `img` and `img_version` leave the upsert columns, so they keep their values.
- **`mapClimb`:** requires `Calendar Event` and writes `calendar_event_ids`.
- **`scripts/export-data.mjs`:** gets the same property changes now, so it stays in parity with the sync.
- **Image step:** runs after the gear table sync. It calls `GEAR_ASSETS.syncGearImages` with every published gear page's current Notion `img` URL.

  | Result | Effect on `img_version` |
  |---|---|
  | `ready` / `needs_review` | Set to the returned version |
  | `missing` | Set to NULL, unless more than 10% of rows would be cleared, which is the same guard as table deletes |
  | `pending` / `failed` / `unsupported` | Unchanged |

  - Only `failed` counts as an error (sync status `partial`). The `needs_review`, `pending`, and `unsupported` counts are logged and returned in the sync response.
  - The step is skipped under `astro dev` (`import.meta.env.DEV`), so a local `/api/cron` call can't write to production photos-api through the remote binding. A deployed Worker without the binding reports a configuration error.
- **Preview and production photos-api:** the preview Worker writes to production photos-api on purpose, because that's the only photos-api. The step is idempotent and keyed by source, so both environments converge on the same rows. The only side effect is that whichever runs first processes a changed image, and the 302 covers the other.
- **Backfill:** about 125 images, which takes about 7 sync triggers.
- **Binding:** `GEAR_ASSETS` (`service: photos-api`, `entrypoint: GearAssets`, `remote: true`) is added at all three `services` sites in `wrangler.jsonc`. It's typed by hand as `Service<GearAssetsRpc>`.
- **Spike first:** `remote: true` + `entrypoint` with `astro dev`. If it fails, local dev runs without the binding, which the var gate already handles.

### Image route: `/gear/img/{id}/{version}.webp`

- Proxies to photos-api through `PHOTOS_API`, mirroring `proxyPhotoImage`, and passes 302s through.
- Validates `id` (UUID), `version` (`[0-9a-f]{12}`), and `w` (200, 400, 800).
- **Transition (removed in the cleanup PR):** the page rendered the legacy `/gear/{img}` file when `img_version` was NULL, until the production backfill finished.
- **Redirect:** `/gear/14er-pack-list` and `/gear/first-winter-peak` 301 to `/blog/gear/{slug}` for outside links. The internal links are fixed in the posts.

### Climb links

- Gear and climb are linked when they share an event ID: `json_each(gear.event_ids)` joined to `json_each(climbs.calendar_event_ids)`.
- Only climbs already in D1 are used, which means published and not future.
- Calendar event titles and dates are never stored or published. Many linked events are trip summaries, some still upcoming.
- Page queries select only explicit columns and never `event_ids` or `calendar_event_ids`.

## Page design

The source is the design review. Tokens are from `public/styles/globals.css`.

### Data

- **Sort within a category:** current gear by title. Retired gear by `retired_on` descending, then title.
- **Status:** retired if `retired_on` is set **or** `category = '🪦 Retired Items'`, until the Notion cleanup below lands.
- **Display category:** the Notion category with the emoji stripped, so filters show "Layers" rather than "🧦 Layers". For retired items still in `🪦 Retired Items`, it's "Other" until cleanup.
- **Category order:**

  | | |
  |---|---|
  | **Order** | Climbing, Winter, Layers, Backpacking, Ski, Running, Summer, Cooking, Car Camping, Travel, Expedition, Other |
  | **Where** | Explicit array in `src/lib/gear.ts` |
  | **Unknown categories** | Sorted last |

### Cards (vertical tiles)

- **Frame:** 1:1, `--border-radius-lg`, and a light neutral plate in **both** themes, so black products stay visible on dark paper. The image is `object-fit: contain` with no CSS padding, because the padding is baked into the master.
- **Images:** `srcset` with w200, w400, and w800, plus `width`, `height`, and `alt=""`.
- **Missing image:** the frame stays and shows the category emoji at 2rem in `--ink-faint`.
- **Text:**
  - Brand: `--font-size-xs`, uppercase, `--ink-faint`.
  - Title: sans 600 at `--font-size-sm`.
  - Weight: mono `--font-size-xs`, "312 g · 11 oz". No cost.
- **Product link:** the card's product link is a 32px ↗ icon link with an accessible name. Cards have no hover lift.
- **Climb links:** "Used on" with up to 3 climb links plus "+N more", only when there are any.
- **Retired cards:** full opacity, no badge. A footer shows the `more_info` story in serif italic `--ink-soft`, plus "Retired {year}" when there's a date.

### Layout

- **Sections:** current gear by category, then one **Retired** grid sorted by retirement date (newest first). It isn't grouped by category, because 42 retired items have no real category until the Notion cleanup. The category filter still applies to it.
- **Section headings:** emoji are `aria-hidden`.
- **Grid columns:**

  | Width | Columns | Gap |
  |---|---|---|
  | <480px | 2 | `--space-sm` |
  | 480–767px | 3 | `--space-sm` |
  | 768–1023px | 4 | `--space-md` |
  | ≥1024px | 5 | `--space-md` |
  | ≥1280px | 6 | `--space-md` |

### Filters

The page is rendered on the server and filtered on the client, about 130 items with no search box. State lives in query params (`?status=&cat=&list=`) so filtered views can be linked and survive a reload.

- **Status:** segmented control, **Current / Retired / All**, default Current.
- **Category:** horizontally scrolling chips, single-select, "All" first.
- **Pack list:** `<select>` with 11 options. Picking a list switches to the pack-list view.
- **Filter bar:** a GET form, so it works without JS. JS filters instantly and updates the URL. It's sticky under the header from 768px. On mobile it scrolls away, and the category chips scroll horizontally instead of opening a sheet.
- **Without JS:** the server applies the query params and an Apply button submits the form.
- **Pack-list slugs:** stable slugs such as `winter-high-peak`, generated from the name. Unknown values fall back to the default view.
- **Empty filter result:** "No {status} gear in {category}", with a button to clear filters.

### Pack-list view

- Rendered on the server when `?list=` is valid, so it works without JS and can be linked.
- One column, `max-width: 40rem`.
- Rows: 48px thumbnail, "Brand Title", and weight right-aligned in mono.
- Grouped by category with subtotals.
- Sticky total: "Total 6.84 kg · 3 items unweighed".
- On mobile the filter bar collapses to its status row while the total is pinned at the bottom.

### Motion and mobile

- Motion follows the `design` skill: filtering is a frequent action, so it doesn't animate.
- Hover styles are gated by `(hover: hover)`.
- Tap targets are at least 32px.

### Out of scope

The theme toggle ignores `prefers-color-scheme` (`Layout.astro:105`). That's a site-wide follow-up.

## Notion cleanup (production data write, confirm first)

- **Retired category:**
  - Give each `🪦 Retired Items` page its real category.
  - Fill `retired_on` on the 20 pages without it, using the first of the month if only the year is known.
  - Then retire the category option.
- **Procedure:**
  1. Generate a dry-run manifest (page, title, current → proposed category and date).
  2. The user reviews it and fixes rows.
  3. Confirm with the `question` tool.
  4. Apply with the Notion API.
  5. Re-query to verify.
- **Not touched:** views and filters inside Notion. The API can't edit them. Suggested views are listed for the user to create by hand: Current by category, Retired, and one per pack list.
- **`img_slug`:** can be deleted from Notion after the deletion PR merges.

## Rollout

1. **photos-api PR:** migration, pipeline, RPC, and route, with unit tests and dry-run deploy in CI. Run the migration preflight (above), apply `0007` remotely, then merge. CI deploys.
2. **climb-log PR:**
   - Migration, sync, route, page, redirects, and link fixes.
   - Apply `0009` to `climb-log-db-preview`, deploy the preview, and trigger its sync until no items are `pending`. This is the real backfill.
   - Verify at 375, 768, and 1280 in both themes.
   - Apply `0009` to production, merge, and trigger the production sync. The legacy fallback covers the gap.
3. **Deletion PR (separate):**
   - Remove `public/gear/`, the legacy `img` fallback and column use, and `img_slug` handling.
   - Add an AGENTS.md note on gear asset ownership in both repos.
4. **Notion cleanup** with confirmation, as above.

Production migrations and deploys are separate, confirmed steps.

## Risks

- **`segment` and `trim` through the Images binding** haven't been exercised in this account yet. The first preview backfill is the check. Every current source is already transparent, so segmentation only runs for future opaque uploads.
- **CPU cost:** decoding and encoding 1024px PNGs in JS costs CPU. 20 items per call is budgeted to stay well under the Workers CPU limit. Measure it in the preview backfill and adjust `maxProcess`.
- **Square frames make long items small**, for example trekking poles. Accepted for consistency.
