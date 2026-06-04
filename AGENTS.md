# Climb-Log Development Conventions

This is the codebase for [kylies.photos](https://kylies.photos) - a climbing/hiking photo blog built with Astro on Cloudflare Workers.

## Project Overview

- **Site:** kylies.photos
- **Framework:** Astro 5.x with hybrid rendering
- **Hosting:** Cloudflare Workers (not Pages)
- **Database:** Cloudflare D1 (SQLite)
- **Storage:** Cloudflare R2 for images
- **CMS:** Notion as the content source (synced via cron)
- **Blog:** Markdown files in `src/content/blog/`

## Current Implementation Status

Working on `feature/agent-implementation` branch - building a CMD+K conversational agent.

See `.opencode/AGENT_SPEC.md` for the full implementation specification and checklist.

## File Structure

```
src/
  agents/           # Agent Durable Object (Phase 2)
  components/       # React/Astro components
  content/blog/     # Markdown blog posts
  lib/              # Shared utilities
  pages/
    api/            # API routes (server-side)
    climbs/         # Climb detail pages
    peaks/          # Peak detail pages
    gear/           # Gear detail pages
    photos/         # Photo detail pages
    admin/          # Admin panel
scripts/            # One-off scripts (backfills, setup)
migrations/         # D1 SQL migrations (numbered 0001_, 0002_, etc.)
tests/
  unit/             # Unit tests
  integration/      # Integration tests
  fixtures/         # Test helpers and mocks
```

## Database Conventions

- **Primary keys:** Use Notion page ID (with dashes stripped) as `id`
- **Notion ID:** Store original Notion page ID (with dashes) in `notion_id` column for body sync
- **Timestamps:** Use ISO 8601 format via `new Date().toISOString()`
- **Date-only fields:** Use `YYYY-MM-DD` format
- **Booleans:** Store as INTEGER (0/1) in SQLite

### Migration Naming

Format: `NNNN_description.sql` (e.g., `0006_schema_reconciliation.sql`)

Always run migrations in order. Reference existing migrations in `.opencode/AGENT_SPEC.md`.

## TypeScript Style

- Use `interface` for object shapes
- Explicit return types on exported functions
- Cloudflare bindings accessed via `env` parameter or `cloudflare:workers`
- Error handling: try/catch with specific error messages

## Notion Sync

- All syncs go through `src/pages/api/cron.ts`
- Use `getNotionProp()` helper for property extraction
- Store `notion_id` for body sync capability
- Handle pagination with `getAllPages()` helper
- Error isolation: one record failure shouldn't stop the sync

## Testing

- Framework: Vitest with Miniflare environment
- Config: `vitest.config.ts`
- Test files: `tests/**/*.test.ts`
- Run: `npm test` or `npx vitest`

## Cloudflare Bindings

Defined in `wrangler.jsonc`:

- `DB` - D1 database
- `R2_IMAGES` - R2 bucket for photos
- `VECTORIZE` - Vectorize index (Phase 2)
- `AI` - Workers AI (Phase 2)

## Common Commands

```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run deploy           # Deploy to Cloudflare
npx wrangler d1 execute climb-log-db --local --file=migrations/NNNN_name.sql
npx wrangler d1 execute climb-log-db --remote --file=migrations/NNNN_name.sql
```

## Important Files

- `wrangler.jsonc` - Cloudflare configuration
- `astro.config.mjs` - Astro configuration
- `src/pages/api/cron.ts` - Notion sync logic
- `.opencode/AGENT_SPEC.md` - Full agent implementation spec

## Do NOT

- Create affiliate links or purchase links for gear
- Store full IP addresses (only hashed for rate limiting)
- Use Amazon as a recommended retailer
- Hardcode secrets in code (use environment variables)
- Skip migrations or run them out of order
