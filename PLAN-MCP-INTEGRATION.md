# Integration Plan: photos-api MCP Features

> Last updated: 2026-05-25  
> Target: Merge photos-api `feature/mcp` branch features into climb-log  
> Status: Ready for implementation

## Decisions

1. **AI captions**: Add schema + Notion mapping now; generation later via separate script  
2. **EXIF display**: Minimal (camera, lens, date) + GPS fields in schema for future use  
3. **Search**: Hybrid — client-side for <100 photos, API for ≥100 or explicit query  

## What Was Added in photos-api `feature/mcp`

- Full-text search (FTS5) over photo metadata  
- AI-generated captions, keywords, quality scores  
- EXIF metadata extraction (camera, lens, settings, GPS)  
- Random photo endpoint with quality filters  
- Enhanced detail endpoint with `?include=exif,ai`  

## Execution Order

### Phase 1: Database Schema
- Port `0005_ai_captions.sql` — AI columns + FTS5 virtual table + triggers  
- Port `0006_exif.sql` — EXIF table with GPS fields  
- Apply to preview first, then production  
- Verify no conflicts with existing `camera` column (schema drift possible)  

### Phase 2: API Endpoints
- Update `utils/photos-api.ts`  
- Add `GET /api/photos?q={query}` — FTS5 search with LIKE fallback  
- Add `GET /api/photos/random` — with tag/site/quality filters  
- Add `GET /api/photos/:id?include=exif,ai`  
- Update `src/pages/api/cron.ts` to sync new Notion fields  

### Phase 3: Frontend
- Update PhotoGallery.tsx  
- Hybrid search: client-side <100, API ≥100  
- Add RandomPhotoButton component  
- Minimal EXIF display in lightbox (camera, lens, date)  

### Phase 4: Backfill Scripts (Do Later)
- `scripts/migrate/extract-exif.py` — download from R2, extract EXIF, store in D1  
- `scripts/migrate/generate-ai-captions.py` — call Workers AI vision model  

## Files to Create

| File | Purpose |
|------|---------|
| `migrations/0005_ai_captions.sql` | AI columns + FTS5 |
| `migrations/0006_exif.sql` | EXIF table |
| `src/components/RandomPhotoButton.tsx` | Random photo UI |

## Files to Modify

| File | Changes |
|------|---------|
| `utils/photos-api.ts` | Add search, random, detail endpoints |
| `src/pages/api/cron.ts` | Sync AI fields from Notion |
| `src/components/PhotoGallery.tsx` | Hybrid search + random button + EXIF display |
| `README.md` | Document new features |

## Field Mapping

photos-api → climb-log  
- `location` → `area` + `state`  
- `tags` → `search_tags`  
- `title` → `caption`  
- `camera` → `camera`  

## Testing Checklist

- [ ] Search returns correct results  
- [ ] Random photo loads  
- [ ] EXIF displays when available  
- [ ] Graceful fallback when EXIF/AI missing  
- [ ] Cron syncs new fields without errors  
- [ ] FTS5 index updates after sync  

## Timeline Estimate

| Phase | Time |
|-------|------|
| Schema | 2 hrs |
| API | 3 hrs |
| Frontend | 4 hrs |
| Testing | 2 hrs |
| Docs | 1 hr |
| **Total** | **12 hrs** |

## Notes

- FTS5 may not be available in all D1 environments — fallback to LIKE is implemented  
- `camera` column may already exist in production D1 (schema drift) — check before migration  
- GPS fields in EXIF table are for future use — not displayed in initial UI  
