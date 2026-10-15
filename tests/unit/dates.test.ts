import { describe, expect, it } from 'vitest'
import { formatCalendarDate, parseCalendarDate } from '../../src/lib/dates'

describe('calendar dates', () => {
  it('preserves the day for date-only values', () => {
    const date = parseCalendarDate('2026-02-15')

    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(1)
    expect(date.getDate()).toBe(15)
    expect(formatCalendarDate('2026-02-15')).toBe('Feb 15, 2026')
  })
})
