import { describe, expect, it } from 'vitest'
import { countSummits, latestFeature, recentFrames } from '../../src/lib/journal-data'
import type { DisplayPhoto } from '../../src/lib/photos-client'
import type { ClimbListItem } from '../../src/lib/types'

describe('countSummits', () => {
  it('counts each peak once across outings and the peak list', () => {
    expect(
      countSummits([
        'Mount Bierstadt',
        'Mount Bierstadt,Mount Spalding',
        null,
        'Mount Etna',
        // Completed peaks from the Colorado list, one with typographic quotes
        'Mount Bierstadt',
        '"Huerfano Peak"',
        'Huerfano Peak',
        'Culebra Peak',
      ]),
    ).toBe(5)
  })

  it('ignores empty entries', () => {
    expect(countSummits(['', ' , ', null])).toBe(0)
  })
})

const outing = (id: string, date: string, preview: string | null = null): ClimbListItem =>
  ({ id, date, title: `Hike ${id}`, preview_img_url: preview }) as ClimbListItem
const photo = (id: string, date: string | null): DisplayPhoto =>
  ({
    id,
    date,
    url: `/img/${id}`,
    title: id,
    caption: null,
    area: null,
    state: null,
  }) as DisplayPhoto

describe('latestFeature', () => {
  it('uses the newest outing and its own preview', () => {
    const feature = latestFeature(
      [outing('new', '2026-08-31', '/img/own?w=800')],
      [photo('p', '2026-09-01')],
    )
    expect(feature?.outing.id).toBe('new')
    expect(feature?.image).toEqual({ src: '/img/own?w=1600', alt: null })
  })

  it('keeps the newest outing and borrows the nearest photo on or before its date', () => {
    const photos = [
      photo('later', '2026-09-03'),
      photo('sameDay', '2026-08-31T09:00:00'),
      photo('older', '2026-08-01'),
    ]
    const feature = latestFeature(
      [outing('new', '2026-08-31'), outing('old', '2026-08-01', '/img/old?w=800')],
      photos,
    )
    expect(feature?.outing.id).toBe('new')
    expect(feature?.image).toMatchObject({ src: '/img/sameDay?w=1600', photoId: 'sameDay' })
  })

  it('falls back to the closest later photo when none is older', () => {
    const photos = [
      photo('newest', '2026-10-01'),
      photo('closest', '2026-09-03'),
      photo('undated', null),
    ]
    expect(latestFeature([outing('new', '2026-08-31')], photos)?.image?.photoId).toBe('closest')
  })

  it('shows the outing without a photo when there are none', () => {
    expect(latestFeature([outing('new', '2026-08-31')], [])?.image).toBeNull()
    expect(latestFeature([], [])).toBeNull()
  })
})

describe('recentFrames', () => {
  it('leaves out the photo the hero borrowed', () => {
    const photos = [
      photo('borrowed', '2026-08-31'),
      photo('a', '2026-08-30'),
      photo('b', '2026-08-29'),
    ]
    const feature = latestFeature([outing('new', '2026-08-31')], photos)
    expect(recentFrames(photos, feature, 2).map(p => p.id)).toEqual(['a', 'b'])
  })

  it('keeps every photo when the hero uses its own preview', () => {
    const photos = [photo('a', '2026-08-30'), photo('b', '2026-08-29')]
    const feature = latestFeature([outing('new', '2026-08-31', '/img/own?w=800')], photos)
    expect(recentFrames(photos, feature).map(p => p.id)).toEqual(['a', 'b'])
  })
})
