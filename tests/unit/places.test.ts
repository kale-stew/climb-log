import { describe, expect, it } from 'vitest'
import {
  buildChapters,
  chapterSlugFor,
  groupByYear,
  normalizeState,
  outingHref,
  outingName,
  outingType,
  yearSpan,
} from '../../src/lib/places'
import type { ClimbListItem } from '../../src/lib/types'

function outing(overrides: Partial<ClimbListItem>): ClimbListItem {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    date: null,
    title: null,
    slug: null,
    preview_img_url: null,
    distance: null,
    gain: null,
    area: null,
    state: null,
    strava: null,
    ...overrides,
  }
}

describe('places', () => {
  it('normalizes state abbreviations into chapter names', () => {
    expect(normalizeState('AZ')).toBe('Arizona')
    expect(normalizeState(' WA ')).toBe('Washington')
    expect(normalizeState('Colorado')).toBe('Colorado')
    expect(normalizeState(null)).toBeNull()
    expect(chapterSlugFor('AZ')).toBe('arizona')
    expect(chapterSlugFor('Oregon')).toBe('pacific-northwest')
    expect(chapterSlugFor('Hawaii')).toBe('elsewhere')
    expect(chapterSlugFor(null)).toBe('elsewhere')
  })

  it('orders chapters by first visit and keeps Elsewhere last', () => {
    const chapters = buildChapters([
      outing({ state: 'Utah', date: '2021-04-01', distance: 4, gain: 500 }),
      outing({
        state: 'Colorado',
        date: '2019-06-01',
        distance: 10.4,
        gain: 3000,
        area: 'Sawatch Range',
      }),
      outing({
        state: 'Colorado',
        date: '2022-07-01',
        distance: 5.2,
        gain: 1000,
        area: 'Sawatch Range',
        preview_img_url: '/img/a/',
      }),
      outing({ state: 'Hawaii', date: '2018-01-01' }),
      outing({ state: 'AZ', date: '2020-02-02', area: 'Sedona' }),
    ])

    expect(chapters.map(chapter => chapter.slug)).toEqual([
      'colorado',
      'arizona',
      'utah',
      'elsewhere',
    ])
    expect(chapters.map(chapter => chapter.number)).toEqual([1, 2, 3, 4])

    const colorado = chapters[0]
    expect(colorado.count).toBe(2)
    expect(colorado.miles).toBe(16)
    expect(colorado.gain).toBe(4000)
    expect(colorado.firstDate).toBe('2019-06-01')
    expect(colorado.lastDate).toBe('2022-07-01')
    expect(colorado.topAreas).toEqual([{ name: 'Sawatch Range', count: 2 }])
    expect(colorado.cover?.preview_img_url).toBe('/img/a/')
    expect(yearSpan(colorado)).toBe('2019–2022')
  })

  it('groups outings by year, newest first', () => {
    const groups = groupByYear([
      outing({ id: 'a', date: '2021-01-01' }),
      outing({ id: 'b', date: '2023-05-01' }),
      outing({ id: 'c', date: '2023-01-01' }),
    ])
    expect(groups.map(group => group.year)).toEqual(['2023', '2021'])
    expect(groups[0].outings.map(item => item.id)).toEqual(['b', 'c'])
  })

  it('links to a trip report when one exists, otherwise to the outing in the journal', () => {
    expect(outingHref({ id: 'x', slug: 'solo-citadel' })).toBe('/blog/hike/solo-citadel/')
    expect(outingHref({ id: 'a b', slug: null })).toBe('/climbs/?outing=a%20b')
  })

  it('splits the activity type from the outing name', () => {
    expect(outingType('Trail Run Alamere Falls')).toBe('trail run')
    expect(outingName('Trail Run Alamere Falls')).toBe('Alamere Falls')
    expect(outingType('Mount Dana')).toBe('outing')
    expect(outingName('Mount Dana')).toBe('Mount Dana')
  })
})
