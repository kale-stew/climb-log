import { describe, expect, it } from 'vitest'
import {
  buildGearItems,
  categoriesOf,
  formatTotal,
  formatWeight,
  GEAR_CLIMB_LINKS_SQL,
  GEAR_ROWS_SQL,
  type GearRow,
  gearImage,
  gearStatus,
  packListsOf,
  packListView,
  parseCategory,
  parseGearFilters,
  RETIRED_CATEGORY,
} from '../../src/lib/gear'
import { sqliteD1 } from '../helpers/sqlite-d1'

const ID = '00000000-0000-0000-0000-000000000001'

function row(overrides: Partial<GearRow> = {}): GearRow {
  return {
    id: ID,
    title: 'Crampons',
    brand: 'Petzl',
    category: '❄️ Winter Gear',
    img: null,
    img_version: null,
    url: null,
    more_info: null,
    acquired_on: '2022-01-01',
    retired_on: null,
    pack_list: null,
    weight_g: null,
    ...overrides,
  }
}

describe('parseCategory', () => {
  it('splits the emoji from the label and slugs the label', () => {
    expect(parseCategory('🏃🏼‍♀️ Running Gear')).toEqual({
      slug: 'running-gear',
      label: 'Running Gear',
      emoji: '🏃🏼‍♀️',
    })
    expect(parseCategory('Travel')).toMatchObject({ slug: 'travel', label: 'Travel' })
  })

  it('files the legacy retired category and blanks under Other', () => {
    expect(parseCategory(RETIRED_CATEGORY).slug).toBe('other')
    expect(parseCategory(null).slug).toBe('other')
    expect(parseCategory('🎒').slug).toBe('other')
  })
})

describe('gearStatus', () => {
  it('treats a retired date or the legacy retired category as retired', () => {
    expect(gearStatus({ retired_on: '2023-01-01', category: '🧦 Layers' })).toBe('retired')
    expect(gearStatus({ retired_on: null, category: RETIRED_CATEGORY })).toBe('retired')
    expect(gearStatus({ retired_on: null, category: '🧦 Layers' })).toBe('current')
  })
})

describe('gearImage', () => {
  it('prefers the synced, versioned image with a srcset', () => {
    const image = gearImage({ id: ID, img: 'old.png', img_version: '0123456789ab' })
    expect(image?.src).toBe(`/gear/img/${ID}/0123456789ab.webp?w=400`)
    expect(image?.thumb).toBe(`/gear/img/${ID}/0123456789ab.webp?w=200`)
    expect(image?.srcset).toContain('?w=800 800w')
  })

  it('falls back to the hand-copied file until the first sync', () => {
    expect(gearImage({ id: ID, img: 'boots.png', img_version: null })).toEqual({
      src: '/gear/boots.png',
      srcset: null,
      thumb: '/gear/boots.png',
      legacy: true,
    })
  })

  it('ignores invalid versions and file names', () => {
    expect(gearImage({ id: ID, img: '../x.png', img_version: 'nope' })).toBeNull()
  })
})

describe('weights', () => {
  it('shows grams and ounces', () => {
    expect(formatWeight(113)).toBe('113 g · 4 oz')
    expect(formatWeight(1276)).toBe('1,276 g · 45 oz')
    expect(formatWeight(null)).toBeNull()
    expect(formatWeight(0)).toBeNull()
  })

  it('switches totals to kilograms and pounds', () => {
    expect(formatTotal(7950)).toBe('7.95 kg · 17.5 lb')
    expect(formatTotal(581)).toBe('581 g · 20.5 oz')
  })
})

describe('buildGearItems', () => {
  const rows = [
    row({ id: 'a', title: 'Hoodie', category: '🧦 Layers' }),
    row({ id: 'b', title: 'Axe', category: '🏔 Climbing Gear' }),
    row({ id: 'c', title: 'Old shoes', category: RETIRED_CATEGORY, more_info: ' Wore them out ' }),
    row({ id: 'd', title: 'Old pack', retired_on: '2024-05-01', category: '🎒 Backpacking Gear' }),
  ]

  it('orders current gear by packing category, then retired gear by date', () => {
    expect(buildGearItems(rows).map(item => item.id)).toEqual(['b', 'a', 'd', 'c'])
  })

  it('keeps retired stories and years', () => {
    const items = buildGearItems(rows)
    expect(items.find(item => item.id === 'c')?.story).toBe('Wore them out')
    expect(items.find(item => item.id === 'd')?.retiredYear).toBe('2024')
  })

  it('drops product links that are not http(s)', () => {
    const [item] = buildGearItems([row({ url: 'javascript:alert(1)' })])
    expect(item.url).toBeNull()
  })

  it('attaches distinct climbs, newest first', () => {
    const [item] = buildGearItems(
      [row()],
      [
        { gear_id: ID, id: 'c1', title: 'Old climb', date: '2020-01-01' },
        { gear_id: ID, id: 'c2', title: 'New climb', date: '2024-01-01' },
        { gear_id: ID, id: 'c2', title: 'New climb', date: '2024-01-01' },
      ],
    )
    expect(item.climbs.map(climb => climb.id)).toEqual(['c2', 'c1'])
  })
})

describe('filters', () => {
  const items = buildGearItems([
    row({ id: 'a', pack_list: 'winter high peak,expedition', weight_g: 765 }),
    row({ id: 'b', pack_list: 'winter high peak', weight_g: null, category: '🧦 Layers' }),
    row({ id: 'c', pack_list: 'winter high peak', retired_on: '2020-01-01', weight_g: 999 }),
  ])
  const categories = categoriesOf(items)
  const lists = packListsOf(items)

  it('lists pack lists used by current gear with stable slugs', () => {
    expect(lists).toEqual([
      { slug: 'expedition', name: 'expedition', label: 'Expedition' },
      { slug: 'winter-high-peak', name: 'winter high peak', label: 'Winter high peak' },
    ])
  })

  it('falls back to defaults for unknown query values', () => {
    const filters = parseGearFilters(
      new URLSearchParams('status=sold&cat=nope&list=nope'),
      categories,
      lists,
    )
    expect(filters).toEqual({ status: 'current', category: null, list: null })
  })

  it('reads valid query values', () => {
    const filters = parseGearFilters(
      new URLSearchParams('status=retired&cat=layers&list=expedition'),
      categories,
      lists,
    )
    expect(filters.status).toBe('retired')
    expect(filters.category).toBe('layers')
    expect(filters.list?.slug).toBe('expedition')
  })

  it('totals current gear on a pack list and counts unweighed items', () => {
    const view = packListView(items, lists[1])
    expect(view.count).toBe(2)
    expect(view.totalGrams).toBe(765)
    expect(view.unweighed).toBe(1)
    expect(view.groups.map(group => group.category.slug)).toEqual(['winter-gear', 'layers'])
  })
})

describe('gear queries', () => {
  const db = sqliteD1([
    'migrations/0001_initial_schema.sql',
    'migrations/0002_fix_nullable.sql',
    'migrations/0007_climb_summits.sql',
    'migrations/0009_gear_assets.sql',
  ])
  db.sqlite.exec(`
    INSERT INTO gear (id, title, event_ids) VALUES
      ('g1', 'Crampons', '["e1","e2"]'),
      ('g2', 'Hoodie', NULL),
      ('g3', 'Broken', 'not json');
    INSERT INTO climbs (id, title, date, calendar_event_ids) VALUES
      ('c1', 'Quandary', '2024-01-01', '["e1"]'),
      ('c2', 'Elbert', '2024-02-01', '["e2","e9"]'),
      ('c3', 'Unlinked', '2024-03-01', NULL);
  `)

  it('selects the page columns without calendar ids', async () => {
    const result = await db.prepare(GEAR_ROWS_SQL).all<Record<string, unknown>>()
    expect(Object.keys(result.results[0])).not.toContain('event_ids')
  })

  it('links gear to climbs through shared calendar events and tolerates bad JSON', async () => {
    const result = await db.prepare(GEAR_CLIMB_LINKS_SQL).all<Record<string, unknown>>()
    expect(result.results).toHaveLength(2)
    expect(result.results.map(r => r.id).sort()).toEqual(['c1', 'c2'])
    for (const link of result.results) expect(Object.keys(link).sort()).toEqual(['date', 'gear_id', 'id', 'title'])
  })
})
