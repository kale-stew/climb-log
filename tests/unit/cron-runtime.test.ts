import { beforeEach, describe, expect, it, vi } from 'vitest'
import { climbPage, fakeDb } from '../fixtures/notion-sync'
import { sqliteD1 } from '../helpers/sqlite-d1'

const notion = vi.hoisted(() => ({
  options: undefined as Record<string, unknown> | undefined,
  pagesByDb: {} as Record<string, unknown[]>,
  failDb: undefined as string | undefined,
}))

vi.mock('cloudflare:workers', () => ({ env: {} }))
vi.mock('@notionhq/client', () => ({
  isNotionClientError: () => false,
  Client: class {
    databases = {
      query: async ({ database_id }: { database_id: string }) => {
        if (database_id === notion.failDb) throw new Error('boom')
        return { results: notion.pagesByDb[database_id] ?? [], has_more: false, next_cursor: null }
      },
    }
    constructor(options: Record<string, unknown>) {
      notion.options = options
    }
  },
}))

const handle = vi.hoisted(() => vi.fn(async (_request: Request) => new Response('{}')))
vi.mock('@astrojs/cloudflare/handler', () => ({ handle }))

const { runSync, syncSlugs } = await import('../../src/pages/api/cron')
const worker = (await import('../../src/worker')).default

function env(db: D1Database, overrides: Record<string, unknown> = {}) {
  return {
    DB: db,
    NOTION_TOKEN: 'token',
    NOTION_CLIMBS_DB_ID: 'climbs-db',
    NOTION_PEAKS_DB_ID: 'peaks-db',
    NOTION_GEAR_DB_ID: 'gear-db',
    ...overrides,
  } as unknown as Cloudflare.Env
}

beforeEach(() => {
  notion.options = undefined
  notion.pagesByDb = { 'climbs-db': [climbPage({}, 'c1')] }
  notion.failDb = undefined
})

describe('runSync', () => {
  it('passes the platform fetch to the Notion client', async () => {
    await runSync(env(fakeDb(['c1']).db))
    expect(typeof notion.options?.fetch).toBe('function')
  })

  it('returns 500 and logs a partial sync when any table fails', async () => {
    notion.failDb = 'peaks-db'
    const { db, runs } = fakeDb(['c1'])
    const response = await runSync(env(db, { NOTION_GEAR_DB_ID: undefined }))
    const body = (await response.json()) as {
      success: boolean
      results: Array<{ table: string; errors: string[] }>
    }

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
    expect(body.results.find(r => r.table === 'climbs')?.errors).toEqual([])
    expect(body.results.find(r => r.table === 'peaks')?.errors[0]).toMatch(
      /Failed to fetch peaks: boom/,
    )
    expect(body.results.find(r => r.table === 'gear')?.errors[0]).toMatch(/not configured/)
    expect(runs.at(-1)?.args[0]).toBe('partial')
  })

  it('keeps syncing other tables when one table write fails', async () => {
    const { db } = fakeDb(['c1'])
    const batch = db.batch.bind(db)
    let calls = 0
    db.batch = (async (statements: D1PreparedStatement[]) => {
      calls++
      if (calls === 1) throw new Error('D1 down')
      return batch(statements)
    }) as typeof db.batch
    notion.pagesByDb['gear-db'] = []
    const response = await runSync(env(db))
    const body = (await response.json()) as { results: Array<{ table: string; errors: string[] }> }

    expect(body.results.map(r => r.table)).toEqual(['climbs', 'peaks', 'gear', 'photo_slugs'])
    expect(body.results[0].errors[0]).toMatch(/Failed to write climbs: D1 down/)
  })
})

describe('syncSlugs', () => {
  const portfolio = (photos: Array<{ id: string; title: string; date: string }>) =>
    (async () =>
      Response.json({ photos, meta: { count: photos.length, total: photos.length } })) as unknown as typeof fetch

  it('issues slugs for every portfolio photo', async () => {
    const db = sqliteD1(['migrations/0008_photo_slugs.sql'])
    const result = await syncSlugs(
      db,
      'https://photos.example',
      portfolio([
        { id: 'a', title: 'Tunnel View', date: '2019-01-01' },
        { id: 'b', title: 'Tunnel View', date: '2021-01-01' },
      ]),
    )
    expect(result).toEqual({ table: 'photo_slugs', inserted: 2, updated: 0, deleted: 0, errors: [] })
    expect(db.sqlite.prepare('SELECT slug FROM photo_slugs ORDER BY slug').all()).toEqual([
      { slug: 'tunnel-view' },
      { slug: 'tunnel-view-2021' },
    ])
  })

  it('reports a photos-api outage instead of syncing an empty list', async () => {
    const db = sqliteD1(['migrations/0008_photo_slugs.sql'])
    const down = (async () => new Response('down', { status: 503 })) as unknown as typeof fetch
    const result = await syncSlugs(db, 'https://photos.example', down)
    expect(result.errors[0]).toMatch(/Failed to sync photo slugs: photos-api returned 503/)
  })
})

describe('scheduled handler', () => {
  it('sends a same-origin POST so Astro checkOrigin accepts it', async () => {
    const waits: Promise<unknown>[] = []
    const ctx = { waitUntil: (p: Promise<unknown>) => waits.push(p) } as unknown as ExecutionContext
    await worker.scheduled?.(
      {} as ScheduledController,
      { CRON_SECRET: 's' } as unknown as Cloudflare.Env,
      ctx,
    )
    await Promise.all(waits)

    const request = handle.mock.calls[0][0]
    expect(request.method).toBe('POST')
    expect(new URL(request.url).origin).toBe(request.headers.get('Origin'))
    expect(request.headers.get('Authorization')).toBe('Bearer s')
  })
})
