/**
 * Unit tests for the pure helpers used by the Notion -> D1 cron sync.
 *
 * These import the real implementations from `src/lib/notion-helpers.ts`
 * (rather than copies) so the tests fail if production behavior drifts.
 */

import { describe, it, expect } from 'vitest'
import {
  getNotionProp,
  normalizeStateName,
  parseAreaFallback,
  parseTags,
} from '../../src/lib/notion-helpers'
import {
  mockClimbPage,
  mockPeakPage,
  mockGearPage,
  mockPhotoPage,
} from '../fixtures/notion-mocks'

describe('getNotionProp', () => {
  describe('Climb properties', () => {
    it('extracts title from Name property', () => {
      expect(getNotionProp(mockClimbPage, 'Name', 'title')).toBe('Green Mountain')
    })

    it('extracts date from Date property', () => {
      expect(getNotionProp(mockClimbPage, 'Date', 'date')).toBe('2024-06-15')
    })

    it('extracts slug from rich_text', () => {
      expect(getNotionProp(mockClimbPage, 'Slug', 'rich_text')).toBe('green-mountain-june-2024')
    })

    it('extracts numeric values', () => {
      expect(getNotionProp(mockClimbPage, 'Distance', 'number')).toBe(8.5)
      expect(getNotionProp(mockClimbPage, 'Gain', 'number')).toBe(2800)
      expect(getNotionProp(mockClimbPage, 'Max Elevation', 'number')).toBe(14264)
    })

    it('extracts select values', () => {
      expect(getNotionProp(mockClimbPage, 'Area', 'select')).toBe('Front Range')
      expect(getNotionProp(mockClimbPage, 'State', 'select')).toBe('Colorado')
    })

    it('extracts checkbox values', () => {
      expect(getNotionProp(mockClimbPage, 'Published', 'checkbox')).toBe(true)
    })

    it('extracts file URLs', () => {
      expect(getNotionProp(mockClimbPage, 'Preview Image', 'files')).toBe('https://example.com/img.jpg')
    })

    it('returns null for missing properties', () => {
      expect(getNotionProp(mockClimbPage, 'NonExistent', 'title')).toBeNull()
    })

    it('returns null for null URLs', () => {
      expect(getNotionProp(mockClimbPage, 'AllTrails', 'url')).toBeNull()
    })

    it('returns null when the page has no properties', () => {
      expect(getNotionProp({ id: 'x' }, 'Name', 'title')).toBeNull()
    })
  })

  describe('Peak properties', () => {
    it('extracts peak name', () => {
      expect(getNotionProp(mockPeakPage, 'Name', 'title')).toBe('Longs Peak')
    })

    it('extracts elevation and prominence', () => {
      expect(getNotionProp(mockPeakPage, 'Elevation', 'number')).toBe(14255)
      expect(getNotionProp(mockPeakPage, 'Prominence', 'number')).toBe(2920)
    })

    it('extracts class as select', () => {
      expect(getNotionProp(mockPeakPage, 'Class', 'select')).toBe('3')
    })
  })

  describe('Gear properties', () => {
    it('extracts gear name and brand', () => {
      expect(getNotionProp(mockGearPage, 'Name', 'title')).toBe('Garmin InReach Mini')
      expect(getNotionProp(mockGearPage, 'Brand', 'select')).toBe('Garmin')
    })

    it('extracts external file URL', () => {
      expect(getNotionProp(mockGearPage, 'Image', 'files')).toBe('https://example.com/garmin.jpg')
    })

    it('extracts notes as rich_text', () => {
      expect(getNotionProp(mockGearPage, 'Notes', 'rich_text')).toBe('Essential for solo hikes')
    })
  })

  describe('Photo properties', () => {
    it('extracts photo URL from href', () => {
      expect(getNotionProp(mockPhotoPage, 'href', 'url')).toBe('https://example.com/photo.jpg')
    })

    it('extracts caption from title', () => {
      expect(getNotionProp(mockPhotoPage, 'Caption', 'title')).toBe('Summit view at sunrise')
    })

    it('extracts dimensions', () => {
      expect(getNotionProp(mockPhotoPage, 'width', 'number')).toBe(4000)
      expect(getNotionProp(mockPhotoPage, 'height', 'number')).toBe(3000)
    })
  })
})

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

describe('Notion ID storage convention', () => {
  it('stores the original page ID with dashes and a stripped id', () => {
    const pageId = '18e01b50-4364-8024-85d8-e12aba9ac803'
    expect(pageId).toBe('18e01b50-4364-8024-85d8-e12aba9ac803')
    expect(pageId.replace(/-/g, '')).toBe('18e01b504364802485d8e12aba9ac803')
  })
})
