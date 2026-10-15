import { describe, expect, it } from 'vitest'
import { findFallbackPhotoId } from '../../src/lib/photo-fallbacks'

describe('photo fallbacks', () => {
  const maps = {
    byDate: new Map([['2026-02-15', 'date-photo']]),
    byAreaState: new Map([['Garfield County||Utah', 'area-photo']]),
  }

  it('matches a photo by date first', () => {
    expect(findFallbackPhotoId({ date: '2026-02-15' }, maps)).toBe('date-photo')
  })

  it('matches a photo by exact area and state', () => {
    expect(findFallbackPhotoId({ area: 'Garfield County', state: 'Utah' }, maps)).toBe('area-photo')
  })

  it('does not attach an unrelated state-level photo', () => {
    expect(findFallbackPhotoId({ area: 'Moab', state: 'Utah' }, maps)).toBeUndefined()
  })
})
