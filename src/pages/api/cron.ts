import { env } from 'cloudflare:workers'
import { Client, isNotionClientError } from '@notionhq/client'
import type { APIRoute } from 'astro'
import {
  fetchAllPages,
  type NotionPage,
  syncTable,
  type TableSpec,
  tableSpecs,
} from '../../lib/notion-sync'
import { syncPhotoSlugs } from '../../lib/photo-slugs'
import { getAllCollectionPhotos } from '../../lib/photos-client'
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
  const notionDbIds: Record<TableSpec['table'], string | undefined> = {
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

  // The client's default node-fetch transport needs `https.request`, which the
  // Workers runtime does not provide; use the platform fetch instead.
  const notion = new Client({
    auth: notionToken,
    timeoutMs: NOTION_TIMEOUT_MS,
    fetch: (url, init) => fetch(url, init),
  })

  const results: SyncResult[] = []
  const startTime = Date.now()
  const today = new Date().toISOString().slice(0, 10)

  logSync('info', 'Starting Notion sync', {
    databases: Object.entries(notionDbIds)
      .filter(([, v]) => v)
      .map(([k]) => k),
  })

  try {
    for (const spec of tableSpecs(today)) {
      const dbId = notionDbIds[spec.table]
      if (!dbId) {
        results.push({
          table: spec.table,
          inserted: 0,
          updated: 0,
          deleted: 0,
          errors: [`Notion database ID for ${spec.table} is not configured`],
        })
        continue
      }

      let pages: NotionPage[]
      try {
        pages = await fetchAllPages(notion, dbId)
      } catch (error) {
        results.push({
          table: spec.table,
          inserted: 0,
          updated: 0,
          deleted: 0,
          errors: [`Failed to fetch ${spec.table}: ${formatError(error)}`],
        })
        continue
      }

      logSync('info', `Syncing ${spec.table}`, { count: pages.length })
      try {
        results.push(await syncTable(DB, spec, pages))
      } catch (error) {
        results.push({
          table: spec.table,
          inserted: 0,
          updated: 0,
          deleted: 0,
          errors: [`Failed to write ${spec.table}: ${formatError(error)}`],
        })
      }
    }

    results.push(await syncSlugs(DB, runtimeEnv.PHOTOS_API_ORIGIN))

    const duration = Date.now() - startTime
    const recordsSynced = results.reduce((sum, r) => sum + r.inserted + r.updated + r.deleted, 0)
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)
    const success = totalErrors === 0

    await DB.prepare(`
      INSERT INTO sync_log (sync_type, status, records_synced, error_message, completed_at)
      VALUES ('notion_sync', ?, ?, ?, datetime('now'))
    `)
      .bind(
        success ? 'success' : 'partial',
        recordsSynced,
        success
          ? null
          : results
              .flatMap(r => r.errors)
              .join('; ')
              .slice(0, 1000),
      )
      .run()

    logSync(success ? 'info' : 'error', 'Notion sync completed', {
      duration_ms: duration,
      recordsSynced,
      totalErrors,
      errors: results.flatMap(r => r.errors),
    })

    return new Response(
      JSON.stringify({
        success,
        duration_ms: duration,
        records_synced: recordsSynced,
        results,
      }),
      {
        status: success ? 200 : 500,
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
 * Keep /photos/{slug} URLs current for every gallery photo. Reads photos-api;
 * writes only climb-log's own photo_slugs table.
 */
export async function syncSlugs(
  DB: D1Database,
  apiOrigin: string | undefined,
  fetchFn?: typeof fetch,
): Promise<SyncResult> {
  const result: SyncResult = { table: 'photo_slugs', inserted: 0, updated: 0, deleted: 0, errors: [] }
  if (!apiOrigin) {
    result.errors.push('PHOTOS_API_ORIGIN is not configured')
    return result
  }
  try {
    const photos = await getAllCollectionPhotos(apiOrigin, 'portfolio', { fetchFn })
    const synced = await syncPhotoSlugs(DB, photos)
    logSync('info', 'Synced photo slugs', { checked: synced.checked, issued: synced.issued })
    result.inserted = synced.issued
    result.errors.push(...synced.errors.slice(0, 20))
  } catch (error) {
    result.errors.push(`Failed to sync photo slugs: ${formatError(error)}`)
  }
  return result
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
