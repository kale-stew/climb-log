/**
 * Shared utility for building photo fallback lookup maps.
 * Used to assign preview images to climbs when they don't have one set.
 */

interface PhotoLookupMaps {
  byDate: Map<string, string>
  byAreaState: Map<string, string>
}

interface PhotoRow {
  date: string | null
  area: string | null
  state: string | null
  id: string
}

/**
 * Build lookup maps for finding fallback photos by date, area+state, or state.
 * Limited to 500 most recent photos for performance.
 */
export function buildPhotoFallbackMaps(photos: PhotoRow[]): PhotoLookupMaps {
  const byDate = new Map<string, string>()
  const byAreaState = new Map<string, string>()

  for (const p of photos) {
    if (p.id) {
      if (p.date && !byDate.has(p.date)) {
        byDate.set(p.date, p.id)
      }
      if (p.area && p.state) {
        const key = `${p.area}||${p.state}`
        if (!byAreaState.has(key)) {
          byAreaState.set(key, p.id)
        }
      }
    }
  }

  return { byDate, byAreaState }
}

interface ClimbLike {
  date?: string | null
  area?: string | null
  state?: string | null
  preview_img_url?: string | null
}

/**
 * Find a fallback photo short_id for a climb without a preview image.
 * Tries to match by date, then exact area and state. A state-only match is too
 * broad and can attach an unrelated photo to many climbs.
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
  return undefined
}

/**
 * Fill in missing preview_img_url on climbs using fallback photos.
 * Mutates the climbs array in place.
 */
export async function fillMissingPreviewImages(
  climbs: ClimbLike[],
  photos: PhotoRow[],
  width: number = 800
): Promise<void> {
  const missingImage = climbs.some(c => !c.preview_img_url)
  if (!missingImage) return

  const maps = buildPhotoFallbackMaps(photos)
  
  for (const climb of climbs) {
    if (!climb.preview_img_url) {
      const shortId = findFallbackPhotoId(climb, maps)
      if (shortId) {
        climb.preview_img_url = `/img/${shortId}?w=${width}`
      }
    }
  }
}
