import { describe, expect, it } from 'vitest'
import { fillMissingPreviewImages } from '../../src/lib/photo-fallbacks'

describe('photo fallbacks', () => {
  it('uses a formal canonical assignment before date fallback', () => {
    const climbs = [{ id: 'climb-1', date: '2026-02-15', preview_img_url: '/old.jpg' }]
    fillMissingPreviewImages(
      climbs,
      [{ id: 'date-photo', date: '2026-02-15' }],
      200,
      new Map([['climb-1', [{ photoId: 'formal-photo', photoDate: null, primary: true }]]]),
    )
    expect(climbs[0].preview_img_url).toBe('/img/formal-photo/?w=200')
  })

  it('falls back only to the same calendar date', () => {
    const climbs = [{ id: 'climb-1', date: '2026-02-15T08:00:00Z', preview_img_url: null }]
    fillMissingPreviewImages(climbs, [
      { id: 'wrong-day', date: '2026-02-14' },
      { id: 'same-day', date: '2026-02-15T18:00:00Z' },
    ])
    expect(climbs[0].preview_img_url).toBe('/img/same-day/?w=800')
  })

  it('does not reuse one fallback photo for multiple climbs', () => {
    const climbs = [
      { id: 'climb-1', date: '2026-02-15', preview_img_url: null },
      { id: 'climb-2', date: '2026-02-15', preview_img_url: null },
    ]
    fillMissingPreviewImages(climbs, [{ id: 'one-photo', date: '2026-02-15' }])
    expect(climbs[0].preview_img_url).toBe('/img/one-photo/?w=800')
    expect(climbs[1].preview_img_url).toBeNull()
  })

  it('does not reuse a formally assigned photo as a date fallback', () => {
    const climbs = [
      { id: 'climb-1', date: '2026-02-15', preview_img_url: null },
      { id: 'climb-2', date: '2026-02-15', preview_img_url: null },
    ]
    fillMissingPreviewImages(
      climbs,
      [{ id: 'formal-photo', date: '2026-02-15' }, { id: 'fallback-photo', date: '2026-02-15' }],
      800,
      new Map([['climb-1', [{ photoId: 'formal-photo', photoDate: '2026-02-15', primary: false }]]]),
    )
    expect(climbs.map(climb => climb.preview_img_url)).toEqual([
      '/img/formal-photo/?w=800',
      '/img/fallback-photo/?w=800',
    ])
  })
})
