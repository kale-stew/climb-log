import { describe, expect, it } from 'vitest'
import {
  fetchAllPages,
  mapClimb,
  mapGear,
  mapPeak,
  type NotionPage,
  syncTable,
  tableSpecs,
  upsertSql,
} from '../../src/lib/notion-sync'
import { climbPage, fakeDb, text } from '../fixtures/notion-sync'

function peakPage(overrides: Record<string, unknown> = {}): NotionPage {
  return {
    id: 'p1',
    properties: {
      peak_name: { type: 'title', title: text('Longs Peak') },
      elevation: { type: 'number', number: 14255 },
      range: { type: 'select', select: { name: 'Front Range' } },
      first_completed_on: { type: 'date', date: { start: '2020-08-01' } },
      rank: { type: 'number', number: 15 },
      img_url: { type: 'url', url: null },
      ...overrides,
    } as NotionPage['properties'],
  }
}

const GEAR_PROPERTY_NAMES = [
  'title',
  'acquired_on',
  'brand',
  'category',
  'color',
  'img_slug',
  'more_info',
  'pack_list',
  'product',
  'retired_on',
  'url',
]

function gearPage(id: string, overrides: Record<string, unknown>): NotionPage {
  const empty = Object.fromEntries(
    GEAR_PROPERTY_NAMES.map(name => [name, { type: 'rich_text', rich_text: [] }]),
  )
  return { id, properties: { ...empty, ...overrides } as NotionPage['properties'] }
}

function without(page: NotionPage, name: string): NotionPage {
  const properties = { ...page.properties }
  delete properties[name]
  return { ...page, properties }
}

describe('mapClimb', () => {
  it('mirrors the export script mapping with dashed IDs', () => {
    expect(mapClimb(climbPage(), '2026-11-05')).toEqual({
      id: 'aaaaaaaa-0000-0000-0000-000000000001',
      date: '2026-03-01',
      title: 'Mount Tam',
      slug: 'mount-tam',
      preview_img_url: 'https://live.staticflickr.com/a.jpg',
      distance: 7.2,
      gain: 2100,
      area: 'Mount Tamalpais State Park',
      state: 'CA',
      strava: 'https://strava.com/1',
    })
  })

  it('skips future-dated climbs', () => {
    expect(mapClimb(climbPage(), '2026-02-01')).toBeNull()
  })

  it('drops expiring Notion-hosted preview URLs', () => {
    const page = climbPage({
      related_img: {
        type: 'formula',
        formula: {
          type: 'string',
          string: 'https://prod-files-secure.s3.us-west-2.amazonaws.com/x.jpg',
        },
      },
    })
    expect(mapClimb(page, '2026-11-05')?.preview_img_url).toBeNull()
  })

  it('joins multi-segment titles', () => {
    const page = climbPage({
      hike_title: { type: 'title', title: [...text('Trail Run '), ...text('Hanakāpīʻai Falls')] },
    })
    expect(mapClimb(page, '2026-11-05')?.title).toBe('Trail Run Hanakāpīʻai Falls')
  })

  it('throws when a mapped Notion property is renamed or removed', () => {
    expect(() => mapClimb(without(climbPage(), 'hike_title'), '2026-11-05')).toThrow(
      'missing Notion properties: hike_title',
    )
  })
})

describe('mapPeak', () => {
  it('maps peaks', () => {
    expect(mapPeak(peakPage())).toEqual({
      id: 'p1',
      title: 'Longs Peak',
      elevation: 14255,
      first_completed: '2020-08-01',
      range: 'Front Range',
      rank: 15,
      img: null,
    })
  })

  it('throws instead of silently dropping rows missing NOT NULL values', () => {
    expect(() => mapPeak(peakPage({ elevation: { type: 'number', number: null } }))).toThrow(
      /missing a name or elevation/,
    )
  })
})

describe('mapGear', () => {
  const boots = gearPage('g1', {
    title: { type: 'title', title: text('Boots') },
    acquired_on: { type: 'date', date: { start: '2024-01-01' } },
    img_slug: { type: 'rich_text', rich_text: text('boots') },
    pack_list: {
      type: 'multi_select',
      multi_select: [{ name: 'alpine ski' }, { name: 'expedition' }],
    },
  })

  it('maps acquired gear with comma-joined pack lists', () => {
    expect(mapGear(boots)).toMatchObject({
      id: 'g1',
      title: 'Boots',
      img: 'boots.png',
      pack_list: 'alpine ski,expedition',
    })
  })

  it('skips unacquired gear', () => {
    expect(mapGear(gearPage('g2', { title: boots.properties.title }))).toBeNull()
  })

  it('throws for acquired gear without a title', () => {
    expect(() => mapGear(gearPage('g3', { acquired_on: boots.properties.acquired_on }))).toThrow(
      /missing a title/,
    )
  })
})

describe('upsertSql', () => {
  it('keeps canonical /img previews on conflict', () => {
    const climbs = tableSpecs('2026-11-05')[0]
    expect(upsertSql(climbs)).toContain(
      "WHEN climbs.preview_img_url LIKE '/img/%' THEN climbs.preview_img_url",
    )
    expect(upsertSql(climbs)).toContain('title = excluded.title')
  })
})

describe('fetchAllPages', () => {
  it('follows pagination cursors', async () => {
    const calls: Array<string | undefined> = []
    const client = {
      databases: {
        async query({ start_cursor }: { start_cursor?: string }) {
          calls.push(start_cursor)
          return start_cursor
            ? { results: [climbPage({}, 'b')], has_more: false, next_cursor: null }
            : { results: [climbPage({}, 'a')], has_more: true, next_cursor: 'next' }
        },
      },
    }
    const pages = await fetchAllPages(client, 'db')
    expect(pages.map(p => p.id)).toEqual(['a', 'b'])
    expect(calls).toEqual([undefined, 'next'])
  })
})

describe('syncTable', () => {
  const spec = tableSpecs('2026-11-05')[0]
  const ids = Array.from({ length: 20 }, (_, i) => `id-${i}`)

  it('upserts rows and deletes rows removed from Notion in one batch', async () => {
    const { db, batches } = fakeDb([...ids, 'untitled'])
    const result = await syncTable(
      db,
      spec,
      ids.map(id => climbPage({}, id)),
    )

    expect(result).toMatchObject({ inserted: 0, updated: 20, deleted: 1, errors: [] })
    expect(batches).toHaveLength(1)
    const deletes = batches[0]
      .filter(s => s.sql.startsWith('DELETE'))
      .map(({ sql, args }) => ({ sql, args }))
    expect(deletes).toEqual([{ sql: 'DELETE FROM climbs WHERE id = ?', args: ['untitled'] }])
  })

  it('counts new rows as inserts', async () => {
    const { db } = fakeDb(ids)
    const pages = [...ids, 'new'].map(id => climbPage({}, id))
    const result = await syncTable(db, spec, pages)
    expect(result).toMatchObject({ inserted: 1, updated: 20, deleted: 0 })
  })

  it('records mapping errors and skips deletes when a property disappears', async () => {
    const { db, batches } = fakeDb([...ids, 'stale'])
    const pages = ids.map(id => climbPage({}, id))
    pages[0] = without(pages[0], 'strava')
    const result = await syncTable(db, spec, pages)

    expect(result.errors[0]).toMatch(/missing Notion properties: strava/)
    // The unmapped page and the genuinely stale row are both kept.
    expect(result.errors[1]).toMatch(/Skipped deleting 2 climbs rows/)
    expect(result.deleted).toBe(0)
    expect(batches[0].some(s => s.sql.startsWith('DELETE'))).toBe(false)
  })

  it('allows deletions exactly at the limit', async () => {
    const existing = Array.from({ length: 100 }, (_, i) => `id-${i}`)
    const { db } = fakeDb(existing)
    const pages = existing.slice(10).map(id => climbPage({}, id))
    const result = await syncTable(db, spec, pages)
    expect(result).toMatchObject({ deleted: 10, errors: [] })
  })

  it('refuses mass deletion when Notion returns far fewer rows', async () => {
    const existing = Array.from({ length: 100 }, (_, i) => `id-${i}`)
    const { db, batches } = fakeDb(existing)
    const pages = existing.slice(0, 50).map(id => climbPage({}, id))
    const result = await syncTable(db, spec, pages)

    expect(result.deleted).toBe(0)
    expect(result.errors[0]).toMatch(/Skipped deleting 50 climbs rows/)
    expect(batches[0].some(s => s.sql.startsWith('DELETE'))).toBe(false)
  })

  it('never deletes when Notion returns nothing', async () => {
    const { db, batches } = fakeDb(['a', 'b'])
    const result = await syncTable(db, spec, [])
    expect(result.deleted).toBe(0)
    expect(result.errors).toHaveLength(1)
    expect(batches).toHaveLength(0)
  })
})
