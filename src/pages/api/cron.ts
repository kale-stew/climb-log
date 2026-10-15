import { env } from 'cloudflare:workers'
import { Client, isNotionClientError } from '@notionhq/client'
import type { APIRoute } from 'astro'
import { getNotionProp } from '../../lib/notion-helpers'
import type { SyncResult } from '../../lib/types'

export const prerender = false

/** Timeout for Notion API operations (15 seconds) */
const NOTION_TIMEOUT_MS = 15_000

/**
 * Structured log helper for sync operations.
 * In production, these logs appear in Workers Logs.
 */
function logSync(
  level: 'info' | 'warn' | 'error',
  message: string,
  context?: Record<string, unknown>,
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  }
  if (level === 'error') {
    console.error(JSON.stringify(entry))
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry))
  } else {
    console.log(JSON.stringify(entry))
  }
}

// Manual trigger via GET request with secret
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url)
  const secret = url.searchParams.get('secret')

  // Verify secret for manual triggers
  const expectedSecret = env.CRON_SECRET
  if (!expectedSecret || secret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return runSync(env)
}

// Authenticated HTTP trigger for operational retries.
export const POST: APIRoute = async ({ request }) => {
  const expectedSecret = env.CRON_SECRET
  const authHeader = request.headers.get('Authorization')
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return runSync(env)
}

export async function runSync(runtimeEnv: Cloudflare.Env): Promise<Response> {
  const DB = runtimeEnv.DB
  const notionToken = runtimeEnv.NOTION_TOKEN
  const notionDbIds = {
    climbs: runtimeEnv.NOTION_CLIMBS_DB_ID,
    peaks: runtimeEnv.NOTION_PEAKS_DB_ID,
    gear: runtimeEnv.NOTION_GEAR_DB_ID,
  }

  if (!DB) {
    logSync('error', 'D1 not configured')
    return new Response(JSON.stringify({ error: 'D1 not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!notionToken) {
    logSync('error', 'Notion token not configured')
    return new Response(JSON.stringify({ error: 'Notion token not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Configure Notion client with timeout
  const notion = new Client({
    auth: notionToken,
    timeoutMs: NOTION_TIMEOUT_MS,
  })

  const results: SyncResult[] = []
  const startTime = Date.now()

  logSync('info', 'Starting Notion sync', {
    databases: Object.entries(notionDbIds)
      .filter(([, v]) => v)
      .map(([k]) => k),
  })

  try {
    // Sync each table
    if (notionDbIds.climbs) {
      results.push(await syncClimbs(notion, DB, notionDbIds.climbs))
    }
    if (notionDbIds.peaks) {
      results.push(await syncPeaks(notion, DB, notionDbIds.peaks))
    }
    if (notionDbIds.gear) {
      results.push(await syncGear(notion, DB, notionDbIds.gear))
    }

    // Calculate totals
    const duration = Date.now() - startTime
    const recordsSynced = results.reduce((sum, r) => sum + r.inserted + r.updated, 0)
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)

    // Log sync result
    await DB.prepare(`
      INSERT INTO sync_log (sync_type, status, records_synced, error_message, completed_at)
      VALUES ('notion_sync', ?, ?, ?, datetime('now'))
    `)
      .bind(
        totalErrors > 0 ? 'partial' : 'success',
        recordsSynced,
        totalErrors > 0 ? `${totalErrors} record errors` : null,
      )
      .run()

    logSync('info', 'Notion sync completed', { duration_ms: duration, recordsSynced, totalErrors })

    return new Response(
      JSON.stringify({
        success: true,
        duration_ms: duration,
        records_synced: recordsSynced,
        results,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = formatError(error)

    logSync('error', 'Notion sync failed', { duration_ms: duration, error: errorMessage })

    // Log failed sync
    try {
      await DB.prepare(`
        INSERT INTO sync_log (sync_type, status, records_synced, error_message, completed_at)
        VALUES ('notion_sync', 'failed', 0, ?, datetime('now'))
      `)
        .bind(errorMessage)
        .run()
    } catch (dbError) {
      logSync('error', 'Failed to log sync error to D1', { error: formatError(dbError) })
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        duration_ms: duration,
        results,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}

/**
 * Format an error into a string message.
 * Handles Notion API errors and generic errors.
 */
function formatError(error: unknown): string {
  if (isNotionClientError(error)) {
    return `Notion API error: ${error.code} - ${error.message}`
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Unknown error'
}

// Helper to get all pages from a Notion database (handles pagination)
async function getAllPages(
  notion: Client,
  databaseId: string,
): Promise<Array<Record<string, unknown>>> {
  const pages: Array<Record<string, unknown>> = []
  let cursor: string | undefined

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    })
    pages.push(...(response.results as Array<Record<string, unknown>>))
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
  } while (cursor)

  return pages
}

/**
 * Check whether a row with the given id already exists in a table.
 * Used to distinguish inserts from updates when reporting sync counts.
 * `table` is always a hardcoded literal (never user input), so interpolation is safe.
 */
async function rowExists(db: D1Database, table: string, id: string): Promise<boolean> {
  const row = await db.prepare(`SELECT 1 FROM ${table} WHERE id = ? LIMIT 1`).bind(id).first()
  return row !== null
}

async function syncClimbs(notion: Client, db: D1Database, dbId: string): Promise<SyncResult> {
  const result: SyncResult = { table: 'climbs', inserted: 0, updated: 0, errors: [] }

  let pages: Array<Record<string, unknown>>
  try {
    pages = await getAllPages(notion, dbId)
  } catch (error) {
    result.errors.push(`Failed to fetch climbs: ${formatError(error)}`)
    return result
  }

  logSync('info', 'Syncing climbs', { count: pages.length })

  for (const page of pages) {
    try {
      const pageId = page.id as string
      const id = pageId.replace(/-/g, '')
      const data = {
        id,
        notion_id: pageId,
        date: getNotionProp(page, 'Date', 'date') as string | null,
        title: getNotionProp(page, 'Name', 'title') as string | null,
        slug: getNotionProp(page, 'Slug', 'rich_text') as string | null,
        preview_img_url: getNotionProp(page, 'Preview Image', 'files') as string | null,
        distance: getNotionProp(page, 'Distance', 'number') as number | null,
        gain: getNotionProp(page, 'Gain', 'number') as number | null,
        max_elevation: getNotionProp(page, 'Max Elevation', 'number') as number | null,
        moving_time: getNotionProp(page, 'Moving Time', 'number') as number | null,
        area: getNotionProp(page, 'Area', 'select') as string | null,
        state: getNotionProp(page, 'State', 'select') as string | null,
        strava: getNotionProp(page, 'Strava', 'url') as string | null,
        alltrails: getNotionProp(page, 'AllTrails', 'url') as string | null,
        published: getNotionProp(page, 'Published', 'checkbox') as boolean,
      }

      const existed = await rowExists(db, 'climbs', id)

      await db
        .prepare(`
        INSERT INTO climbs (id, notion_id, date, title, slug, preview_img_url, distance, gain, max_elevation, moving_time, area, state, strava, alltrails, published, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          notion_id = excluded.notion_id,
          date = excluded.date,
          title = excluded.title,
          slug = excluded.slug,
          preview_img_url = excluded.preview_img_url,
          distance = excluded.distance,
          gain = excluded.gain,
          max_elevation = excluded.max_elevation,
          moving_time = excluded.moving_time,
          area = excluded.area,
          state = excluded.state,
          strava = excluded.strava,
          alltrails = excluded.alltrails,
          published = excluded.published,
          updated_at = datetime('now')
      `)
        .bind(
          data.id,
          data.notion_id,
          data.date,
          data.title,
          data.slug,
          data.preview_img_url,
          data.distance,
          data.gain,
          data.max_elevation,
          data.moving_time,
          data.area,
          data.state,
          data.strava,
          data.alltrails,
          data.published ? 1 : 0,
        )
        .run()

      if (existed) result.updated++
      else result.inserted++
    } catch (error) {
      const pageId = page.id as string
      result.errors.push(`Climb ${pageId}: ${formatError(error)}`)
    }
  }

  return result
}

async function syncPeaks(notion: Client, db: D1Database, dbId: string): Promise<SyncResult> {
  const result: SyncResult = { table: 'peaks', inserted: 0, updated: 0, errors: [] }

  let pages: Array<Record<string, unknown>>
  try {
    pages = await getAllPages(notion, dbId)
  } catch (error) {
    result.errors.push(`Failed to fetch peaks: ${formatError(error)}`)
    return result
  }

  logSync('info', 'Syncing peaks', { count: pages.length })

  for (const page of pages) {
    try {
      const pageId = page.id as string
      const id = pageId.replace(/-/g, '')
      const data = {
        id,
        notion_id: pageId,
        name: getNotionProp(page, 'Name', 'title') as string | null,
        elevation: getNotionProp(page, 'Elevation', 'number') as number | null,
        prominence: getNotionProp(page, 'Prominence', 'number') as number | null,
        range: getNotionProp(page, 'Range', 'select') as string | null,
        first_completed: getNotionProp(page, 'First Completed', 'date') as string | null,
        attempts: getNotionProp(page, 'Attempts', 'number') as number | null,
        list_class: getNotionProp(page, 'Class', 'select') as string | null,
      }

      const existed = await rowExists(db, 'peaks', id)

      await db
        .prepare(`
        INSERT INTO peaks (id, notion_id, name, elevation, prominence, range, first_completed, attempts, list_class, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          notion_id = excluded.notion_id,
          name = excluded.name,
          elevation = excluded.elevation,
          prominence = excluded.prominence,
          range = excluded.range,
          first_completed = excluded.first_completed,
          attempts = excluded.attempts,
          list_class = excluded.list_class,
          updated_at = datetime('now')
      `)
        .bind(
          data.id,
          data.notion_id,
          data.name,
          data.elevation,
          data.prominence,
          data.range,
          data.first_completed,
          data.attempts,
          data.list_class,
        )
        .run()

      if (existed) result.updated++
      else result.inserted++
    } catch (error) {
      const pageId = page.id as string
      result.errors.push(`Peak ${pageId}: ${formatError(error)}`)
    }
  }

  return result
}

async function syncGear(notion: Client, db: D1Database, dbId: string): Promise<SyncResult> {
  const result: SyncResult = { table: 'gear', inserted: 0, updated: 0, errors: [] }

  let pages: Array<Record<string, unknown>>
  try {
    pages = await getAllPages(notion, dbId)
  } catch (error) {
    result.errors.push(`Failed to fetch gear: ${formatError(error)}`)
    return result
  }

  logSync('info', 'Syncing gear', { count: pages.length })

  for (const page of pages) {
    try {
      const pageId = page.id as string
      const id = pageId.replace(/-/g, '')
      const data = {
        id,
        notion_id: pageId,
        name: getNotionProp(page, 'Name', 'title') as string | null,
        brand: getNotionProp(page, 'Brand', 'select') as string | null,
        category: getNotionProp(page, 'Category', 'select') as string | null,
        weight_oz: getNotionProp(page, 'Weight (oz)', 'number') as number | null,
        price: getNotionProp(page, 'Price', 'number') as number | null,
        rating: getNotionProp(page, 'Rating', 'number') as number | null,
        status: getNotionProp(page, 'Status', 'select') as string | null,
        notes: getNotionProp(page, 'Notes', 'rich_text') as string | null,
        url: getNotionProp(page, 'URL', 'url') as string | null,
        image_url: getNotionProp(page, 'Image', 'files') as string | null,
      }

      const existed = await rowExists(db, 'gear', id)

      await db
        .prepare(`
        INSERT INTO gear (id, notion_id, name, brand, category, weight_oz, price, rating, status, notes, url, image_url, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          notion_id = excluded.notion_id,
          name = excluded.name,
          brand = excluded.brand,
          category = excluded.category,
          weight_oz = excluded.weight_oz,
          price = excluded.price,
          rating = excluded.rating,
          status = excluded.status,
          notes = excluded.notes,
          url = excluded.url,
          image_url = excluded.image_url,
          updated_at = datetime('now')
      `)
        .bind(
          data.id,
          data.notion_id,
          data.name,
          data.brand,
          data.category,
          data.weight_oz,
          data.price,
          data.rating,
          data.status,
          data.notes,
          data.url,
          data.image_url,
        )
        .run()

      if (existed) result.updated++
      else result.inserted++
    } catch (error) {
      const pageId = page.id as string
      result.errors.push(`Gear ${pageId}: ${formatError(error)}`)
    }
  }

  return result
}
