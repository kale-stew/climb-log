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

const text = (value: string) => [{ plain_text: value }]

function climbPage(
  overrides: Record<string, unknown> = {},
  id = 'aaaaaaaa-0000-0000-0000-000000000001',
): NotionPage {
  return {
    id,
    properties: {
      hike_title: { type: 'title', title: text('Mount Tam') },
      date: { type: 'date', date: { start: '2026-03-01' } },
      related_slug: { type: 'rich_text', rich_text: text('mount-tam') },
      related_img: {
        type: 'formula',
        formula: {
          type: 'string',
          string: 'https://live.staticflickr.com/a.jpg,https://live.staticflickr.com/b.jpg',
        },
      },
      distance: { type: 'number', number: 7.2 },
      gain: { type: 'number', number: 2100 },
      area: { type: 'rich_text', rich_text: text('Mount Tamalpais SP, CA') },
      strava: { type: 'url', url: 'https://strava.com/1' },
      ...overrides,
    } as NotionPage['properties'],
  }
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
      hike_title: { type: 'title', title: [...text('Mount '), ...text('Tam')] },
    })
    expect(mapClimb(page, '2026-11-05')?.title).toBe('Mount Tam')
  })
})

describe('mapPeak and mapGear', () => {
  it('maps peaks and skips rows missing NOT NULL columns', () => {
    const page: NotionPage = {
      id: 'p1',
      properties: {
        peak_name: { type: 'title', title: text('Longs Peak') },
        elevation: { type: 'number', number: 14255 },
        range: { type: 'select', select: { name: 'Front Range' } },
        first_completed_on: { type: 'date', date: { start: '2020-08-01' } },
        rank: { type: 'number', number: 15 },
        img_url: { type: 'url', url: null },
      },
    }
    expect(mapPeak(page)).toEqual({
      id: 'p1',
      title: 'Longs Peak',
      elevation: 14255,
      first_completed: '2020-08-01',
      range: 'Front Range',
      rank: 15,
      img: null,
    })
    expect(mapPeak({ id: 'p2', properties: { peak_name: page.properties.peak_name } })).toBeNull()
  })

  it('maps acquired gear with comma-joined pack lists', () => {
    const page: NotionPage = {
      id: 'g1',
      properties: {
        title: { type: 'title', title: text('Boots') },
        acquired_on: { type: 'date', date: { start: '2024-01-01' } },
        img_slug: { type: 'rich_text', rich_text: text('boots') },
        pack_list: {
          type: 'multi_select',
          multi_select: [{ name: 'alpine ski' }, { name: 'expedition' }],
        },
      },
    }
    expect(mapGear(page)).toMatchObject({
      id: 'g1',
      title: 'Boots',
      img: 'boots.png',
      pack_list: 'alpine ski,expedition',
    })
    expect(mapGear({ id: 'g2', properties: { title: page.properties.title } })).toBeNull()
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

/** Minimal D1 fake that records batched statements. */
function fakeDb(existingIds: string[]) {
  const batches: Array<Array<{ sql: string; args: unknown[] }>> = []
  const db = {
    prepare(sql: string) {
      return {
        sql,
        args: [] as unknown[],
        bind(...args: unknown[]) {
          return { sql, args }
        },
        async all() {
          return { results: existingIds.map(id => ({ id })) }
        },
      }
    },
    async batch(statements: Array<{ sql: string; args: unknown[] }>) {
      batches.push(statements)
      return []
    },
  }
  return { db: db as unknown as D1Database, batches }
}

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
    const deletes = batches[0].filter(s => s.sql.startsWith('DELETE'))
    expect(deletes).toEqual([{ sql: 'DELETE FROM climbs WHERE id = ?', args: ['untitled'] }])
  })

  it('counts new rows as inserts', async () => {
    const { db } = fakeDb(ids)
    const result = await syncTable(
      db,
      spec,
      [...ids, 'new'].map(id => climbPage({}, id)),
    )
    expect(result).toMatchObject({ inserted: 1, updated: 20, deleted: 0 })
  })

  it('refuses mass deletion when Notion returns far fewer rows', async () => {
    const existing = Array.from({ length: 100 }, (_, i) => `id-${i}`)
    const { db, batches } = fakeDb(existing)
    const result = await syncTable(
      db,
      spec,
      existing.slice(0, 50).map(id => climbPage({}, id)),
    )

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
