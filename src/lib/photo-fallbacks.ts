/**
 * Shared utility for building photo fallback lookup maps.
 * Used to assign preview images to climbs when they don't have one set.
 */

interface PhotoLookupMaps {
  byDate: Map<string, string>
  byAreaState: Map<string, string>
  byState: Map<string, string>
}

interface PhotoRow {
  date: string | null
  area: string | null
  state: string | null
  short_id: string | null
}

/**
 * Build lookup maps for finding fallback photos by date, area+state, or state.
 * Limited to 500 most recent photos for performance.
 */
export async function buildPhotoFallbackMaps(DB: D1Database): Promise<PhotoLookupMaps> {
  const result = await DB.prepare(
    'SELECT date, area, state, short_id FROM photos WHERE exclude = 0 ORDER BY date DESC LIMIT 500'
  ).all<PhotoRow>()
  const photos = result.results || []

  const byDate = new Map<string, string>()
  const byAreaState = new Map<string, string>()
  const byState = new Map<string, string>()

  for (const p of photos) {
    if (p.short_id) {
      if (p.date && !byDate.has(p.date)) {
        byDate.set(p.date, p.short_id)
      }
      if (p.area && p.state) {
        const key = `${p.area}||${p.state}`
        if (!byAreaState.has(key)) {
          byAreaState.set(key, p.short_id)
        }
      }
      if (p.state && !byState.has(p.state)) {
        byState.set(p.state, p.short_id)
      }
    }
  }

  return { byDate, byAreaState, byState }
}

interface ClimbLike {
  date?: string | null
  area?: string | null
  state?: string | null
  preview_img_url?: string | null
}

/**
 * Find a fallback photo short_id for a climb without a preview image.
 * Tries to match by: date > area+state > state
 */
export function findFallbackPhotoId(
  climb: ClimbLike,
  maps: PhotoLookupMaps
): string | undefined {
  if (climb.date && maps.byDate.has(climb.date)) {
    return maps.byDate.get(climb.date)
  }
  if (climb.area && climb.state) {
    const key = `${climb.area}||${climb.state}`
    if (maps.byAreaState.has(key)) {
      return maps.byAreaState.get(key)
    }
  }
  if (climb.state && maps.byState.has(climb.state)) {
    return maps.byState.get(climb.state)
  }
  return undefined
}

/**
 * Fill in missing preview_img_url on climbs using fallback photos.
 * Mutates the climbs array in place.
 */
export async function fillMissingPreviewImages(
  DB: D1Database,
  climbs: ClimbLike[],
  width: number = 800
): Promise<void> {
  const missingImage = climbs.some(c => !c.preview_img_url)
  if (!missingImage) return

  const maps = await buildPhotoFallbackMaps(DB)
  
  for (const climb of climbs) {
    if (!climb.preview_img_url) {
      const shortId = findFallbackPhotoId(climb, maps)
      if (shortId) {
        climb.preview_img_url = `/img/${shortId}?w=${width}`
      }
    }
  }
}
