import { describe, expect, it } from 'vitest'
import { countSummits } from '../../src/lib/journal-data'

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
