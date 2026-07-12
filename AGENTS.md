# climb-log - Agent Guidelines

This repository deploys `kylies.photos`, including climbs, long-form content, gear, peaks, and the photo-gallery consumer.

## Structure

| Task | Location |
|---|---|
| Astro pages and API routes | `src/pages/` |
| Published Markdown content | `src/content/` |
| React components | `src/components/` |
| Notion synchronization | `src/pages/api/cron.ts` |
| Photo fallbacks | `src/lib/photo-fallbacks.ts` |
| Embedded legacy photo service | `utils/photos-api.ts` |
| D1 migrations | `migrations/` |
| Generated seed inputs and outputs | `data/`, `db/` |
| Worker bindings and routes | `wrangler.jsonc` |

`photos-api` is the canonical photo service. The local `photos` table, `climb-log-images` bucket, and `utils/photos-api.ts` are compatibility infrastructure, not an independent source of truth.

## Photo References

- Preserve relative `/img/{id}` URLs. Published Markdown, climb previews, homepage heroes, OG generation, fallbacks, and the 404 page use them.
- Legacy identifiers include Notion UUIDs, canonical photo IDs, and eight-character `short_id` values derived from SHA-256. Do not rewrite or remove them without a complete reference audit.
- Treat `exclude` as hidden from the gallery, not unused. Excluded photos can still be embedded in published posts.
- Prefer canonical `photos-api` IDs for new content. Keep the local `/img/:id` route as a compatibility redirect while legacy URLs exist.
- Do not add new direct reads from the local `photos` table. New photo features consume the canonical API.
- Do not copy canonical originals or transforms into `climb-log-images`.

## Generated And Synced Data

- Do not hand-edit generated seed output. Change its source or generator and regenerate it.
- The Notion cron currently updates multiple domains, including legacy photo rows and objects. When changing photo ownership, preserve climb, gear, and peak synchronization while removing only photo writes.
- Preview image values can be external URLs, canonical API URLs, or generated `/img/{id}` fallbacks. Audit all forms before changing resolution behavior.

## Deployment

- Production is a Cloudflare Worker with static assets and the `kylies.photos` custom domain.
- `main` is the production branch. Use the preview environment for production-like validation before deploying production.
- Inspect D1 and R2 bindings before running remote migrations or deployment commands.
- Never remove the local photo table, R2 binding, or compatibility routes in the same change that first switches consumers to the canonical service.

## Authentication And Secrets

- `/admin/*` and `/api/admin/*` accept Cloudflare Access assertions or the configured cron bearer secret.
- Keep Notion and Cloudflare credentials in ignored local environment files. Never print or commit them.
- Do not weaken middleware while moving photo administration to `photos-api`.

## Commands

```bash
npm run build
npm run dev
npm run deploy:preview
```

Run production deployment only when explicitly requested.

## Verification

- Derive the image-reference inventory from source and generated data; do not rely on a hard-coded count.
- Verify every literal and generated `/img/{id}` against the canonical resolver before retiring local storage.
- Exercise the gallery, homepage hero, climb previews, blog body images, OG generation, 404 page, and admin flows after photo-routing changes.
- Keep compatibility and deletion as separate changes so rollback does not require restoring deleted objects.

## Anti-patterns

- Never treat the repository name `climb-log` as a storage-domain boundary.
- Never restore bidirectional photo synchronization.
- Never use title and date as the only permanent mapping between photo records.
- Never delete a local photo object merely because it is excluded from gallery queries.
