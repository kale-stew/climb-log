# photos-api Consumer Contract (climb-log / kylies.photos)

## Summary

`kylies.photos` (this repository) is a **consumer** of the canonical
`photos-api` service. It does not own photo metadata, originals, transforms,
identifiers, or publication state. This document is the consumer side of the
canonical contract defined in
[`photos-api/docs/specs/canonical-photo-service.md`](https://github.com/kale-stew/photos-api/blob/main/docs/specs/canonical-photo-service.md).

The local `photos` table, `climb-log-images` R2 bucket, and
`utils/photos-api.ts` are **compatibility infrastructure retained during
cutover**, not an independent source of truth. They are retired in a later,
separate change after production reference audits pass.

## Canonical contract this consumer depends on

The service (photos-api PR #4 foundation) guarantees:

### Identifiers and resolution
- `photos.id` is canonical. `photo_aliases` maps historical Notion IDs,
  consumer UUIDs, and generated short IDs to a canonical ID.
- `resolvePhoto` accepts a canonical ID **or** any alias. Canonical IDs are
  checked before aliases; aliases are globally unique; alias generation fails
  on collision rather than guessing.
- Resolution is gated to `status = 'active' AND visibility IN ('public',
  'unlisted')`. Private/quarantined photos do not resolve through public routes.

### Lifecycle / visibility (replaces consumer reliance on `exclude`)
- `public`: listed in public collections and directly addressable.
- `unlisted`: **not** in collection listings but resolvable by ID/alias — this
  is how published-but-not-gallery images (editorial, climb embeds) stay live.
- `private` / `quarantined`: unavailable to unauthenticated requests.
- Legacy `exclude` remains only as a compatibility field during cutover and
  must not be read as "unreferenced."

### Endpoints consumed
| Endpoint | Shape | Consumer use |
|---|---|---|
| `GET /img/:identifier?w=` | image bytes | every rendered `<img>`; accepts id or alias |
| `GET /api/photos?site=&limit=&offset=` | `{ photos: Row[], meta }` | **compatibility list** during cutover (raw rows, `exclude=0 AND active AND public`) |
| `GET /api/photos/:identifier` | `Row` | single lookup by id/alias |
| `GET /api/collections/:slug/photos` | `{ collection, photos: Row[], meta }` | **portfolio gallery** post-cutover (`portfolio` slug) |
| `GET /api/people/:slug/photos` | `{ person, photos: Row[], meta }` | optional people groupings |

`Row` is the raw canonical `photos` row (`SELECT *`). It is **not** projected:
it contains `id`, `title`, `caption`, `location` (single string), `date`,
`width`, `height`, `blurhash`, `accent_color`, `tags` (JSON string), `format`,
`site`, `status`, `visibility`, etc. It does **not** contain `short_id`, an
image `url`, `area`, `state`, or `camera` (if per-photo camera display is
needed, it must be added to the canonical schema first — it is not in the PR #4
foundation).

Limits cap at 100; consumers paginate for larger sets.

## Consumer-side responsibilities

The canonical service returns canonical shape. **Adaptation is the consumer's
job** — do not ask the service to emit climb-log-specific fields.

1. **Image URLs.** Build them from the canonical id: `/img/{id}?w={w}` (relative
   to the local compatibility route during cutover; absolute
   `${PHOTOS_API_ORIGIN}/img/{id}` after retirement). Never store copied URLs.
2. **Location split.** Derive `area`/`state` from `location` client- or
   server-side using the same rules as the Notion importer
   (`src/pages/api/cron.ts:normalizeStateName` + comma/dash split). Keep one
   shared helper so importer and consumer agree.
3. **Tags.** Parse the JSON-string `tags` into an array in the consumer.
4. **Short IDs.** Do not depend on `short_id` as a returned field. Legacy
   published `/img/{short_id}` URLs keep working because the service resolves
   the alias — the consumer just emits the identifier it already has.
5. **Fallbacks / hero / OG accent.** Read from a fetched canonical list
   (portfolio collection or compatibility list), not from the local `photos`
   table.

## Consumers to cut over

Derive the live inventory from source before implementing (do not trust a
hard-coded count):

```bash
rg -n "/img/[A-Za-z0-9-]+" src public src/content   # published references
rg -n "FROM photos" src                              # local-table reads (→ 0)
```

Local-table readers (direct, or via the shared helper) that must move to
canonical fetches:

| Consumer | File | Access |
|---|---|---|
| Photo gallery | `src/pages/photos.astro` | direct `FROM photos` |
| Homepage hero + fallbacks | `src/pages/index.astro` | direct `FROM photos` |
| Shared fallback helper | `src/lib/photo-fallbacks.ts` | direct `FROM photos` |
| OG accent color | `src/pages/api/og/[...slug].ts` | direct `FROM photos` |
| Admin photo picker | `src/pages/admin/climbs.astro` | direct `FROM photos` |
| Legacy image redirect | `src/pages/images/[...key].ts` | direct `FROM photos` |
| Climb index fallbacks | `src/pages/climbs.astro` | **indirect** via `fillMissingPreviewImages` |

The Notion cron (`src/pages/api/cron.ts`) is a photo **writer**, not a reader;
its photo writes are removed in the retirement change, not this cutover.

Compatibility layer left **unchanged** during cutover:
`utils/photos-api.ts`, `src/pages/img/[id].ts`, `src/pages/api/photos/[...path].ts`,
`src/pages/admin/photos/[...path].ts`.

## Cutover invariant (load-bearing)

Rendered images stay as **relative `/img/{id}`** during cutover, served by the
local compatibility route. That only avoids breakage while the local `photos`
table + `climb-log-images` bucket remain a **complete mirror** of every
canonical photo the consumer can surface (active, public/unlisted, plus legacy
`site` climb-log/both). If the consumer surfaces a canonical-only photo, the
local `/img` route 404s.

**Pre-cutover gate:** diff the canonical id+alias set against the local
`SELECT id FROM photos`; require zero canonical-only surfaced photos, or switch
that page's image origin to canonical first.

## Cutover sequence

1. Land the canonical foundation (photos-api PR #4): schema, alias-aware routes,
   Notion-ID + reviewed short-ID aliases, collections/people. No change to
   legacy `site`/`exclude` list semantics yet.
2. Add a consumer client (`src/lib/photos-client.ts`) + `PHOTOS_API_ORIGIN`
   config. Client degrades to empty on upstream failure (match current
   `try/catch → []` behavior) and caches list fetches (short TTL) since `/` and
   `/photos` fan out multiple paged subrequests.
3. Move each consumer above from local D1 reads to the client, keeping `/img`
   relative. Run the pre-cutover gate per environment.
4. Verify every literal and generated reference resolves through canonical:
   gallery, hero, climb previews, blog body images, OG generation, 404 hero
   (`src/pages/404.astro`), admin picker.
5. Retire duplicate storage (local table, bucket, cron photo writes, and the
   photos-api bidirectional `predeploy`/reverse-sync) in a **separate** change.
   Never restore bidirectional synchronization.

## Verification

- Build + preview before any deploy: `npm run build`, `npm run deploy:preview`.
- Exercise the AGENTS.md verification list (gallery, hero, climb previews, blog
  body images, OG, 404, admin) after routing changes.
- Automated: assert a legacy short-ID and a Notion-UUID (dashed + undashed)
  both resolve through the canonical service; assert `/img/{canonical-id}`
  works for a surfaced photo.

## Rollback

Consumer changes only swap read sources. The local table and `/img` route stay
intact, so reverting the consumer commits restores prior behavior with no data
restoration. Compatibility and deletion remain separate changes.
