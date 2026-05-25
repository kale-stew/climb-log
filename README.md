# Kylie's Climb Log

A personal outdoor adventure log and photo gallery tracking climbing trips, peaks, gear, and photos across the western United States.

The public site: [kylies.photos](https://climb-log.kylieski.workers.dev)

## Tech Stack

- **Framework**: [Astro 6](https://astro.build) with React 18
- **Deployment**: [Cloudflare Pages](https://pages.cloudflare.com/) + Workers
- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite)
- **Storage**: [Cloudflare R2](https://developers.cloudflare.com/r2/) for images
- **Data Source**: [Notion API](https://developers.notion.com/) (synced via cron)
- **Styling**: Custom CSS with modern layout techniques

## Features

- 📷 **Photo Gallery**: 573+ adventure photos with lazy loading, blurhash placeholders, and responsive images
- 🏔️ **Peak Tracker**: 14ers and other notable peaks with completion stats
- 🧗 **Climb Log**: Detailed trip reports synced from Notion
- 🎒 **Gear Reviews**: Equipment ratings and notes
- 🔍 **Search & Filter**: Find photos by location, tags, or date
- ⚡ **Edge-Optimized**: Sub-100ms response times on Cloudflare's global network

## Project Structure

```
src/
├── pages/              # Astro pages and API routes
│   ├── *.astro         # Page components
│   ├── api/            # API endpoints
│   │   └── cron.ts     # Notion sync scheduled task
│   └── blog/           # Trip reports & gear reviews
├── components/         # React components (.tsx)
├── layouts/            # Page layouts
└── content/            # Markdown content

utils/
├── photos-api.ts       # Hono app for photo endpoints
└── notion.js           # Notion API helpers

scripts/
└── migrate/            # Database migrations and backfill scripts

migrations/             # SQL schema definitions
```

## Database Schema

### Core Tables

- **photos**: Image metadata, locations, tags, blurhash placeholders
- **climbs**: Trip reports synced from Notion
- **peaks**: Mountain summits with elevation, prominence, class
- **gear**: Equipment reviews and ratings
- **sync_log**: Notion sync history

See [AGENTS.md](.opencode/AGENTS.md) for full schema details.

## Environment Setup

### Prerequisites

- Node.js 20+
- Python 3 (for migration scripts)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### Configuration

Copy `.env.example` to `.env` and fill in:

```bash
# Notion API
NOTION_TOKEN=secret_...
NOTION_CLIMBS_DB_ID=...
NOTION_GEAR_DB_ID=...
NOTION_PEAKS_DB_ID=...
NOTION_PHOTOS_DB_ID=...

# Cron secret for manual triggers
CRON_SECRET=generate_with_openssl_rand_hex_32

# Cloudflare (for R2 sync)
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...

# Photos API
ALLOWED_WIDTHS=200,400,800,1600
```

### Local Development

```bash
# Install dependencies
npm install

# Run dev server (with D1/R2 bindings)
npm run dev

# Apply migrations
npx wrangler d1 migrations apply climb-log-db --local
```

## Deployment

```bash
# Build and deploy to Cloudflare
npm run deploy

# Or deploy manually
npm run build
npx wrangler deploy
```

## Data Sync

Photos, climbs, peaks, and gear are synced from Notion via a scheduled cron job:

```bash
# Runs automatically daily at midnight UTC
# Cloudflare Cron Triggers: 0 0 * * *

# Manual trigger (for testing)
curl "https://climb-log.kylieski.workers.dev/api/cron?secret=YOUR_CRON_SECRET"
```

The cron:
- Fetches updates from Notion databases
- Normalizes metadata (dates, tags, locations)
- Updates D1 database
- Logs sync results to `sync_log` table

## Photo Processing

Photos are stored in Cloudflare R2 with the following processing:

- **Blurhash**: Low-res placeholder during load (4x3 components, 32x32px)
- **Accent color**: Dominant color for UI theming
- **Responsive sizing**: Multiple widths (200, 400, 800, 1600px) via URL params
- **Format optimization**: JPEG for photos, PNG/WebP preserved when uploaded

### Backfill Script

For bulk metadata updates, use the backfill script:

```bash
# Full backfill (all phases)
python3 scripts/migrate/backfill-photo-metadata.py --remote

# Run specific phase only
python3 scripts/migrate/backfill-photo-metadata.py --remote --phase=3

# Available phases:
# 1: Fix date timestamps (YYYY-MM-DD format)
# 2: Normalize tags (lowercase, sorted, deduped)
# 3: Backfill locations from Notion
# 4: Normalize state names (full names, not abbreviations)
# 5: Fix area spacing ("Bridger- Teton" → "Bridger-Teton")
# 6: Generate technical metadata (blurhash, accent_color, size_bytes)
```

**Requirements**: `pip3 install --break-system-packages Pillow numpy blurhash-python requests`

## Recent Updates (May 2026)

### Fixed Critical Cron Bug
- Cron was writing to non-existent `location` column instead of `area` + `state`
- Moved from `__cron.ts` → `api/cron.ts` for proper routing
- Added state normalization (AZ → Arizona, etc.)
- Fixed date/tag parsing during sync

### Database Improvements
- Added `synced_at` column to `sync_log`
- Backfilled 236 missing photo locations from Notion
- Normalized all state names to full names
- Generated blurhash/accent_color for all photos

See [METADATA_CLEANUP_SUMMARY.md](.opencode/METADATA_CLEANUP_SUMMARY.md) for full details.

## Contributing

This is a personal project, but feel free to fork and adapt for your own adventure log!

## License

MIT
