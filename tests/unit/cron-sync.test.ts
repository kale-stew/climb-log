/**
 * Unit tests for the pure Notion parsing helpers in `src/lib/notion-helpers.ts`.
 * The cron sync mapping itself is covered in `notion-sync.test.ts`.
 */

import { describe, expect, it } from 'vitest'
import { normalizeStateName, parseAreaFallback, parseTags } from '../../src/lib/notion-helpers'

describe('normalizeStateName', () => {
  it('normalizes state abbreviations', () => {
    expect(normalizeStateName('CO')).toBe('Colorado')
    expect(normalizeStateName('WY')).toBe('Wyoming')
    expect(normalizeStateName('UT')).toBe('Utah')
  })

  it('handles full state names', () => {
    expect(normalizeStateName('Alaska')).toBe('Alaska')
    expect(normalizeStateName('Washington State')).toBe('Washington')
  })

  it('passes through unknown values', () => {
    expect(normalizeStateName('Unknown State')).toBe('Unknown State')
  })

  it('handles null and undefined', () => {
    expect(normalizeStateName(null)).toBeNull()
    expect(normalizeStateName(undefined)).toBeNull()
  })

  it('trims whitespace', () => {
    expect(normalizeStateName('  CO  ')).toBe('Colorado')
  })
})

describe('parseAreaFallback', () => {
  it('parses comma-separated format and normalizes state', () => {
    const result = parseAreaFallback('Front Range, Colorado')
    expect(result.area).toBe('Front Range')
    expect(result.state).toBe('Colorado')
  })

  it('treats a whitespace-adjacent dash as the area/state separator', () => {
    const result = parseAreaFallback('Bridger-Teton - Wyoming')
    expect(result.area).toBe('Bridger-Teton')
    expect(result.state).toBe('Wyoming')
  })

  it('handles a dash with a trailing space only', () => {
    const result = parseAreaFallback('Front Range- CO')
    expect(result.area).toBe('Front Range')
    expect(result.state).toBe('Colorado')
  })

  it('preserves internal hyphens when there is no state', () => {
    const result = parseAreaFallback('Bridger-Teton')
    expect(result.area).toBe('Bridger-Teton')
    expect(result.state).toBeNull()
  })

  it('handles area-only input', () => {
    const result = parseAreaFallback('Front Range')
    expect(result.area).toBe('Front Range')
    expect(result.state).toBeNull()
  })

  it('handles null input', () => {
    const result = parseAreaFallback(null)
    expect(result.area).toBeNull()
    expect(result.state).toBeNull()
  })

  it('cleans up spacing around dashes in area names (comma format)', () => {
    const result = parseAreaFallback('Bridger - Teton, WY')
    expect(result.area).toBe('Bridger-Teton')
    expect(result.state).toBe('Wyoming')
  })
})

describe('parseTags', () => {
  it('lowercases, trims, dedupes, and sorts tags', () => {
    expect(parseTags('sunrise, summit, 14er')).toBe('14er, summit, sunrise')
  })

  it('deduplicates case-insensitively', () => {
    expect(parseTags('B, a, b, A')).toBe('a, b')
  })

  it('returns null for null input', () => {
    expect(parseTags(null)).toBeNull()
  })

  it('returns null for whitespace/empty input', () => {
    expect(parseTags('   ')).toBeNull()
    expect(parseTags(', ,')).toBeNull()
  })
})
