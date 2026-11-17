/**
 * Gear images live in photos-api, keyed by Notion page id. The nightly sync
 * hands photos-api the current (short-lived) Notion file URL for every
 * published gear page; photos-api normalizes changed images and returns a
 * content version that the page puts in an immutable URL.
 */

import { fmt, mapGear, type NotionPage } from './notion-sync'
import type { SyncResult } from './types'

export type GearImageStatus =
  | 'ready'
  | 'needs_review'
  | 'missing'
  | 'unsupported'
  | 'pending'
  | 'failed'

export interface GearImageResult {
  id: string
  status: GearImageStatus
  version?: string
  error?: string
}

/**
 * Typed view of photos-api's `GearAssets` RPC entrypoint. Keep in step with
 * photos-api `src/gear-assets.ts` (GearImageItem, GearImageResult, options).
 */
export interface GearAssetsRpc {
  syncGearImages(
    items: Array<{ id: string; url: string | null }>,
    options?: { maxProcess?: number; dryRun?: boolean },
  ): Promise<{ results: GearImageResult[]; cleaned: number }>
}

export const GEAR_IMAGE_WIDTHS = [200, 400, 800] as const
const VERSION = /^[0-9a-f]{12}$/
const PAGE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const MAX_CLEAR_FRACTION = 0.1
const MIN_CLEAR_ALLOWANCE = 5

export function isGearImageVersion(value: unknown): value is string {
  return typeof value === 'string' && VERSION.test(value)
}

export function isGearPageId(value: unknown): value is string {
  return typeof value === 'string' && PAGE_ID.test(value)
}

export function gearImagePath(id: string, version: string, width: number): string {
  return `/gear/img/${id}/${version}.webp?w=${width}`
}

/** Published gear pages and their current Notion image URL. */
export function gearImageItems(pages: NotionPage[]): Array<{ id: string; url: string | null }> {
  const items: Array<{ id: string; url: string | null }> = []
  for (const page of pages) {
    let published = false
    try {
      published = mapGear(page) !== null
    } catch {
      published = false
    }
    if (!published) continue
    const url = fmt(page.properties.img)
    items.push({ id: page.id, url: typeof url === 'string' ? url : null })
  }
  return items
}

export interface GearImageSummary extends SyncResult {
  statuses: Partial<Record<GearImageStatus, number>>
  needs_review: string[]
  /** Pages whose image isn't a Notion upload (for example an external link); they keep their old version. */
  unsupported: string[]
}

/**
 * Ask photos-api to bring every gear image up to date, then record versions.
 * Pending and unsupported images keep their current value; a mass "missing"
 * response is treated like a mass delete and refused.
 */
export async function syncGearImages(
  db: D1Database,
  rpc: GearAssetsRpc,
  pages: NotionPage[],
): Promise<GearImageSummary> {
  const summary: GearImageSummary = {
    table: 'gear_images',
    inserted: 0,
    updated: 0,
    deleted: 0,
    errors: [],
    statuses: {},
    needs_review: [],
    unsupported: [],
  }
  const items = gearImageItems(pages)
  if (items.length === 0) return summary

  const { results } = await rpc.syncGearImages(items)
  const current = await db
    .prepare('SELECT id, img_version FROM gear')
    .all<{ id: string; img_version: string | null }>()
  const versions = new Map((current.results ?? []).map(row => [row.id, row.img_version]))

  const sets: Array<{ id: string; version: string }> = []
  const clears: string[] = []
  for (const result of results) {
    summary.statuses[result.status] = (summary.statuses[result.status] ?? 0) + 1
    if (!versions.has(result.id)) continue
    const existing = versions.get(result.id) ?? null
    if (result.status === 'ready' || result.status === 'needs_review') {
      if (!isGearImageVersion(result.version)) {
        summary.errors.push(`gear image ${result.id}: invalid version from photos-api`)
        continue
      }
      if (result.status === 'needs_review') summary.needs_review.push(result.id)
      if (existing !== result.version) sets.push({ id: result.id, version: result.version })
    } else if (result.status === 'missing') {
      if (existing !== null) clears.push(result.id)
    } else if (result.status === 'unsupported') {
      summary.unsupported.push(result.id)
    } else if (result.status === 'failed') {
      summary.errors.push(`gear image ${result.id}: ${result.error ?? 'failed'}`)
    }
  }

  const clearLimit = Math.max(MIN_CLEAR_ALLOWANCE, Math.floor(versions.size * MAX_CLEAR_FRACTION))
  const canClear = clears.length <= clearLimit
  if (!canClear) {
    summary.errors.push(
      `Skipped clearing ${clears.length} gear images reported missing (limit ${clearLimit})`,
    )
  }

  const update = db.prepare(
    "UPDATE gear SET img_version = ?, updated_at = datetime('now') WHERE id = ?",
  )
  const statements = sets.map(({ id, version }) => update.bind(version, id))
  if (canClear) statements.push(...clears.map(id => update.bind(null, id)))
  if (statements.length > 0) await db.batch(statements)

  summary.updated = sets.length
  summary.deleted = canClear ? clears.length : 0
  return summary
}
