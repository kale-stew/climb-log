import type { NotionPage } from '../../src/lib/notion-sync'

export const text = (value: string) => [{ plain_text: value }]

/** A climbs-database page with every property the sync maps. */
export function climbPage(
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
      summits: {
        type: 'multi_select',
        multi_select: [{ name: 'Mount Tamalpais' }, { name: 'Mount Diablo' }],
      },
      ...overrides,
    } as NotionPage['properties'],
  }
}

/** Minimal D1 fake that records batched and single-statement writes. */
export function fakeDb(existingIds: string[]) {
  const batches: Array<Array<{ sql: string; args: unknown[] }>> = []
  const runs: Array<{ sql: string; args: unknown[] }> = []
  const db = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            sql,
            args,
            async run() {
              runs.push({ sql, args })
              return {}
            },
          }
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
  return { db: db as unknown as D1Database, batches, runs }
}
