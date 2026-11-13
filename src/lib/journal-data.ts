import { fillMissingPreviewImages } from './photo-fallbacks'
import { type DisplayPhoto, getCanonicalPhotos, getClimbPhotoAssignments } from './photos-client'
import type { ClimbListItem } from './types'

export interface JournalTotals {
  outings: number
  miles: number
  gain: number
  summits: number
  firstDate: string | null
}

export interface JournalData {
  outings: ClimbListItem[]
  photos: DisplayPhoto[]
  totals: JournalTotals
  loadError: boolean
}

interface JournalEnv {
  DB?: D1Database
  PHOTOS_API_ORIGIN?: string
}

const EMPTY_TOTALS: JournalTotals = { outings: 0, miles: 0, gain: 0, summits: 0, firstDate: null }

const peakKey = (name: string) =>
  name.replace(/["“”]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()

/**
 * Distinct peaks reached: every outing's `summits` list (comma-joined) plus the
 * Colorado peak list's completed entries, which covers peaks no outing names.
 * Repeat summits count once.
 */
export function countSummits(names: (string | null)[]): number {
  const peaks = new Set<string>()
  for (const value of names) {
    for (const name of value?.split(',') ?? []) {
      if (name.trim()) peaks.add(peakKey(name))
    }
  }
  return peaks.size
}

/** Load every outing with a preview image plus the canonical photo list. */
export async function loadJournal(env: JournalEnv, previewWidth = 800): Promise<JournalData> {
  if (!env.DB) return { outings: [], photos: [], totals: EMPTY_TOTALS, loadError: true }

  try {
    const [outingsResult, summitsResult, canonicalPhotos, assignments] = await Promise.all([
      env.DB.prepare(
        'SELECT id, date, title, slug, preview_img_url, distance, gain, area, state, strava FROM climbs ORDER BY date DESC',
      ).all<ClimbListItem>(),
      env.DB.batch<{ name: string | null }>([
        env.DB.prepare('SELECT summits AS name FROM climbs WHERE summits IS NOT NULL'),
        env.DB.prepare('SELECT title AS name FROM peaks WHERE first_completed IS NOT NULL'),
      ]),
      env.PHOTOS_API_ORIGIN
        ? getCanonicalPhotos(env.PHOTOS_API_ORIGIN, { limit: 1500 })
        : Promise.resolve([]),
      env.PHOTOS_API_ORIGIN
        ? getClimbPhotoAssignments(env.PHOTOS_API_ORIGIN)
        : Promise.resolve(new Map()),
    ])

    const outings = outingsResult.results ?? []
    fillMissingPreviewImages(outings, canonicalPhotos, previewWidth, assignments)

    return {
      outings,
      photos: canonicalPhotos,
      totals: {
        outings: outings.length,
        miles: Math.round(outings.reduce((sum, outing) => sum + (outing.distance ?? 0), 0)),
        gain: Math.round(outings.reduce((sum, outing) => sum + (outing.gain ?? 0), 0)),
        summits: countSummits(
          summitsResult.flatMap(result => (result.results ?? []).map(row => row.name)),
        ),
        firstDate: outings.filter(outing => outing.date).at(-1)?.date ?? null,
      },
      loadError: false,
    }
  } catch (error) {
    console.error('Failed to load journal data:', error)
    return { outings: [], photos: [], totals: EMPTY_TOTALS, loadError: true }
  }
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US')
}

/** Round large climbing totals to something a person would say out loud. */
export function roundedFeet(value: number): string {
  if (value >= 10_000) return formatNumber(Math.round(value / 1000) * 1000)
  return formatNumber(value)
}

export function photoAlt(photo: DisplayPhoto): string {
  return (
    photo.caption ||
    photo.title ||
    [photo.area, photo.state].filter(Boolean).join(', ') ||
    'Photo from outside'
  )
}
