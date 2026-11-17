import { describe, expect, it, vi } from 'vitest'
import {
  type GearAssetsRpc,
  type GearImageResult,
  gearImageItems,
  syncGearImages,
} from '../../src/lib/gear-images'
import type { NotionPage } from '../../src/lib/notion-sync'
import { text } from '../fixtures/notion-sync'
import { sqliteD1 } from '../helpers/sqlite-d1'

vi.mock('cloudflare:workers', () => ({ env: {} }))
vi.mock('@astrojs/cloudflare/handler', () => ({ handle: vi.fn() }))

const { syncGearImageStep } = await import('../../src/pages/api/cron')

const MIGRATIONS = [
  'migrations/0001_initial_schema.sql',
  'migrations/0002_fix_nullable.sql',
  'migrations/0009_gear_assets.sql',
]
const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const url = (n: number) =>
  `https://prod-files-secure.s3.us-west-2.amazonaws.com/ws/f${n}/x.png?sig=1`

function gearPage(n: number, overrides: Record<string, unknown> = {}): NotionPage {
  const empty = Object.fromEntries(
    ['brand', 'category', 'color', 'more_info', 'product', 'url'].map(name => [
      name,
      { type: 'rich_text', rich_text: [] },
    ]),
  )
  return {
    id: id(n),
    properties: {
      ...empty,
      title: { type: 'title', title: text(`Item ${n}`) },
      acquired_on: { type: 'date', date: { start: '2024-01-01' } },
      retired_on: { type: 'date', date: null },
      pack_list: { type: 'multi_select', multi_select: [] },
      weight_g: { type: 'number', number: null },
      weight_oz: { type: 'number', number: null },
      events: { type: 'relation', relation: [], has_more: false },
      img: { type: 'files', files: [{ file: { url: url(n) } }] },
      ...overrides,
    } as NotionPage['properties'],
  }
}

function dbWith(rows: Array<{ n: number; version: string | null }>) {
  const db = sqliteD1(MIGRATIONS)
  for (const { n, version } of rows) {
    db.sqlite
      .prepare("INSERT INTO gear (id, title, img, img_version) VALUES (?, ?, 'legacy.png', ?)")
      .run(id(n), `Item ${n}`, version)
  }
  return db
}

function rpcReturning(results: GearImageResult[]) {
  const calls: unknown[] = []
  const rpc: GearAssetsRpc = {
    async syncGearImages(items) {
      calls.push(items)
      return { results, cleaned: 0 }
    },
  }
  return { rpc, calls }
}

const versionOf = (db: ReturnType<typeof dbWith>, n: number) =>
  db.sqlite.prepare('SELECT img_version, img FROM gear WHERE id = ?').get(id(n)) as {
    img_version: string | null
    img: string | null
  }

describe('gearImageItems', () => {
  it('sends only published gear, with or without an image', () => {
    const unpublished = gearPage(3, { acquired_on: { type: 'date', date: null } })
    const noImage = gearPage(2, { img: { type: 'files', files: [] } })
    expect(gearImageItems([gearPage(1), noImage, unpublished])).toEqual([
      { id: id(1), url: url(1) },
      { id: id(2), url: null },
    ])
  })
})

describe('syncGearImages', () => {
  it('records versions for ready and needs-review images', async () => {
    const db = dbWith([
      { n: 1, version: null },
      { n: 2, version: 'aaaaaaaaaaaa' },
    ])
    const { rpc } = rpcReturning([
      { id: id(1), status: 'ready', version: '0123456789ab' },
      { id: id(2), status: 'needs_review', version: 'bbbbbbbbbbbb' },
    ])
    const summary = await syncGearImages(db, rpc, [gearPage(1), gearPage(2)])
    expect(summary.errors).toEqual([])
    expect(summary.updated).toBe(2)
    expect(summary.needs_review).toEqual([id(2)])
    expect(versionOf(db, 1)).toEqual({ img_version: '0123456789ab', img: 'legacy.png' })
    expect(versionOf(db, 2).img_version).toBe('bbbbbbbbbbbb')
  })

  it('keeps the current version for pending, unsupported, and failed images', async () => {
    const db = dbWith([1, 2, 3].map(n => ({ n, version: 'aaaaaaaaaaaa' })))
    const { rpc } = rpcReturning([
      { id: id(1), status: 'pending' },
      { id: id(2), status: 'unsupported', error: 'external' },
      { id: id(3), status: 'failed', error: 'source returned 403' },
    ])
    const summary = await syncGearImages(db, rpc, [gearPage(1), gearPage(2), gearPage(3)])
    expect(summary.errors).toEqual([`gear image ${id(3)}: source returned 403`])
    expect(summary.statuses).toEqual({ pending: 1, unsupported: 1, failed: 1 })
    for (const n of [1, 2, 3]) expect(versionOf(db, n).img_version).toBe('aaaaaaaaaaaa')
  })

  it('clears the version when the Notion image is removed', async () => {
    const db = dbWith([{ n: 1, version: 'aaaaaaaaaaaa' }])
    const { rpc } = rpcReturning([{ id: id(1), status: 'missing' }])
    const summary = await syncGearImages(db, rpc, [
      gearPage(1, { img: { type: 'files', files: [] } }),
    ])
    expect(summary.deleted).toBe(1)
    expect(versionOf(db, 1).img_version).toBeNull()
  })

  it('refuses to clear many images at once', async () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ n: i + 1, version: 'aaaaaaaaaaaa' }))
    const db = dbWith(rows)
    const { rpc } = rpcReturning(rows.map(({ n }) => ({ id: id(n), status: 'missing' as const })))
    const summary = await syncGearImages(
      db,
      rpc,
      rows.map(({ n }) => gearPage(n)),
    )
    expect(summary.errors[0]).toMatch(/Skipped clearing 20 gear images/)
    expect(versionOf(db, 1).img_version).toBe('aaaaaaaaaaaa')
  })

  it('rejects malformed versions instead of writing them into URLs', async () => {
    const db = dbWith([{ n: 1, version: null }])
    const { rpc } = rpcReturning([{ id: id(1), status: 'ready', version: '../x' }])
    const summary = await syncGearImages(db, rpc, [gearPage(1)])
    expect(summary.errors[0]).toMatch(/invalid version/)
    expect(versionOf(db, 1).img_version).toBeNull()
  })
})

describe('syncGearImageStep', () => {
  it('is skipped in astro dev so local runs never write to production photos-api', async () => {
    const { rpc, calls } = rpcReturning([])
    expect(await syncGearImageStep(dbWith([]), rpc, [gearPage(1)], true)).toBeNull()
    expect(calls).toEqual([])
  })

  it('is skipped when the gear table did not sync cleanly', async () => {
    const { rpc, calls } = rpcReturning([])
    expect(await syncGearImageStep(dbWith([]), rpc, null, false)).toBeNull()
    expect(calls).toEqual([])
  })

  it('reports a missing binding as a configuration error', async () => {
    const result = await syncGearImageStep(dbWith([]), undefined, [gearPage(1)], false)
    expect(result?.errors).toEqual(['GEAR_ASSETS service binding is not configured'])
  })

  it('reports an RPC failure without throwing', async () => {
    const rpc: GearAssetsRpc = {
      syncGearImages: async () => {
        throw new Error('entrypoint not found')
      },
    }
    const result = await syncGearImageStep(
      dbWith([{ n: 1, version: null }]),
      rpc,
      [gearPage(1)],
      false,
    )
    expect(result?.errors[0]).toMatch(/Failed to sync gear images: entrypoint not found/)
  })
})
