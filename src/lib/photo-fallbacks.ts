import type { ClimbPhotoAssignments } from './photos-client'

interface PhotoRow {
  date: string | null
  id: string
}

interface ClimbLike {
  id?: string | null
  date?: string | null
  preview_img_url?: string | null
}

function calendarDate(value: string): string {
  return value.slice(0, 10)
}

/**
 * Apply one unique preview per climb. Canonical formal assignments win;
 * otherwise, consume an unused photo captured on the same calendar date.
 * Existing preview URLs remain only when neither canonical source can help.
 */
export function fillMissingPreviewImages(
  climbs: ClimbLike[],
  photos: PhotoRow[],
  width = 800,
  formalAssignments: ClimbPhotoAssignments = new Map(),
): void {
  const byDate = new Map<string, string[]>()
  for (const photo of photos) {
    if (!photo.date) continue
    const date = calendarDate(photo.date)
    const entries = byDate.get(date) || []
    entries.push(photo.id)
    byDate.set(date, entries)
  }

  const usedPhotoIds = new Set(
    [...formalAssignments.values()].flatMap(assignments => assignments.map(({ photoId }) => photoId)),
  )

  for (const climb of climbs) {
    const formalOptions = climb.id ? formalAssignments.get(climb.id) || [] : []
    const formal = formalOptions.find(({ primary }) => primary)
      || formalOptions.find(({ photoDate }) => climb.date && photoDate?.slice(0, 10) === calendarDate(climb.date))
      || formalOptions[0]
    if (formal) {
      climb.preview_img_url = `/img/${formal.photoId}/?w=${width}`
      continue
    }

    if (!climb.date) continue
    const fallbackPhotoId = byDate
      .get(calendarDate(climb.date))
      ?.find(photoId => !usedPhotoIds.has(photoId))
    if (!fallbackPhotoId) continue

    usedPhotoIds.add(fallbackPhotoId)
    climb.preview_img_url = `/img/${fallbackPhotoId}/?w=${width}`
  }
}
