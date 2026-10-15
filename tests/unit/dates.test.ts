import { describe, expect, it } from 'vitest'
import {
  formatCalendarDate,
  formatRecentDate,
  formatRelativeDate,
  parseCalendarDate,
} from '../../src/lib/dates'

describe('calendar dates', () => {
  it('preserves the day for date-only values', () => {
    const date = parseCalendarDate('2026-02-15')

    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(1)
    expect(date.getDate()).toBe(15)
    expect(formatCalendarDate('2026-02-15')).toBe('Feb 15, 2026')
  })

  it('formats old outings as a useful relative age', () => {
    expect(formatRelativeDate('2026-02-15', new Date(2026, 9, 14))).toBe('8 months ago')
  })

  it('uses natural language for recent outings', () => {
    expect(formatRelativeDate('2026-10-13', new Date(2026, 9, 14))).toBe('yesterday')
    expect(formatRelativeDate('2026-09-30', new Date(2026, 9, 14))).toBe('2 weeks ago')
  })

  it('switches to a compact date after 60 days', () => {
    expect(formatRecentDate('2026-02-15', new Date(2026, 9, 14))).toBe('Feb 15')
    expect(formatRecentDate('2026-09-30', new Date(2026, 9, 14))).toBe('2 weeks ago')
  })
})
