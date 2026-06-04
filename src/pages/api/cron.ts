import type { APIRoute } from 'astro'
import { Client, isNotionClientError, APIErrorCode } from '@notionhq/client'
import { env } from 'cloudflare:workers'
import { fetchImage, IMAGE_TIMEOUT_MS, FetchTimeoutError } from '../../lib/fetch-with-timeout'
import type { SyncResult } from '../../lib/types'
import { getNotionProp, parseAreaFallback, parseTags } from '../../lib/notion-helpers'

export const prerender = false

// Notion database IDs from environment
const NOTION_DB_IDS = {
  climbs: import.meta.env.NOTION_CLIMBS_DB_ID,
  peaks: import.meta.env.NOTION_PEAKS_DB_ID,
  gear: import.meta.env.NOTION_GEAR_DB_ID,
  photos: import.meta.env.NOTION_PHOTOS_DB_ID,
}

/** Timeout for Notion API operations (15 seconds) */
const NOTION_TIMEOUT_MS = 15_000

/**
 * Generate a deterministic short URL-safe ID from any string.
 * Uses SHA-256 hash truncated to 8 hex chars.
 * Must match utils/photos-api.ts:generateShortId
 */
async function generateShortId(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex.slice(0, 8)
}

/**
 * Structured log helper for sync operations.
 * In production, these logs appear in Workers Logs.
 */
function logSync(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>): void {
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
  const expectedSecret = import.meta.env.CRON_SECRET
  if (!expectedSecret || secret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return runSync()
}

// Cloudflare cron trigger via POST
export const POST: APIRoute = async () => {
  return runSync()
}

async function runSync(): Promise<Response> {
  const DB = env.DB
  const R2_IMAGES = env.R2_IMAGES
  const notionToken = import.meta.env.NOTION_TOKEN

  if (!DB) {
    logSync('error', 'D1 not configured')
    return new Response(JSON.stringify({ error: 'D1 not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (!notionToken) {
    logSync('error', 'Notion token not configured')
    return new Response(JSON.stringify({ error: 'Notion token not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
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
    databases: Object.entries(NOTION_DB_IDS).filter(([, v]) => v).map(([k]) => k) 
  })

  try {
    // Sync each table
    if (NOTION_DB_IDS.climbs) {
      results.push(await syncClimbs(notion, DB, NOTION_DB_IDS.climbs))
    }
    if (NOTION_DB_IDS.peaks) {
      results.push(await syncPeaks(notion, DB, NOTION_DB_IDS.peaks))
    }
    if (NOTION_DB_IDS.gear) {
      results.push(await syncGear(notion, DB, NOTION_DB_IDS.gear))
    }
    if (NOTION_DB_IDS.photos) {
      results.push(await syncPhotos(notion, DB, R2_IMAGES, NOTION_DB_IDS.photos))
    }

    // Calculate totals
    const duration = Date.now() - startTime
    const recordsSynced = results.reduce((sum, r) => sum + r.inserted + r.updated, 0)
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)

    // Log sync result
    await DB.prepare(`
      INSERT INTO sync_log (sync_type, status, records_synced, error_message, completed_at)
      VALUES ('notion_sync', ?, ?, ?, datetime('now'))
    `).bind(
      totalErrors > 0 ? 'partial' : 'success',
      recordsSynced,
      totalErrors > 0 ? `${totalErrors} record errors` : null
    ).run()

    logSync('info', 'Notion sync completed', { duration_ms: duration, recordsSynced, totalErrors })

    return new Response(JSON.stringify({
      success: true,
      duration_ms: duration,
      records_synced: recordsSynced,
      results
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = formatError(error)
    
    logSync('error', 'Notion sync failed', { duration_ms: duration, error: errorMessage })

    // Log failed sync
    try {
      await DB.prepare(`
        INSERT INTO sync_log (sync_type, status, records_synced, error_message, completed_at)
        VALUES ('notion_sync', 'failed', 0, ?, datetime('now'))
      `).bind(errorMessage).run()
    } catch (dbError) {
      logSync('error', 'Failed to log sync error to D1', { error: formatError(dbError) })
    }

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      duration_ms: duration,
      results
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

/**
 * Format an error into a string message.
 * Handles Notion API errors, fetch timeout errors, and generic errors.
 */
function formatError(error: unknown): string {
  if (isNotionClientError(error)) {
    return `Notion API error: ${error.code} - ${error.message}`
  }
  if (error instanceof FetchTimeoutError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Unknown error'
}

// Helper to get all pages from a Notion database (handles pagination)
async function getAllPages(notion: Client, databaseId: string): Promise<Array<Record<string, unknown>>> {
  const pages: Array<Record<string, unknown>> = []
  let cursor: string | undefined

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    })
    pages.push(...(response.results as Array<Record<string, unknown>>))
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined
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

      await db.prepare(`
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
      `).bind(
        data.id, data.notion_id, data.date, data.title, data.slug, data.preview_img_url,
        data.distance, data.gain, data.max_elevation, data.moving_time,
        data.area, data.state, data.strava, data.alltrails, data.published ? 1 : 0
      ).run()

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

      await db.prepare(`
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
      `).bind(
        data.id, data.notion_id, data.name, data.elevation, data.prominence,
        data.range, data.first_completed, data.attempts, data.list_class
      ).run()

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

      await db.prepare(`
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
      `).bind(
        data.id, data.notion_id, data.name, data.brand, data.category,
        data.weight_oz, data.price, data.rating, data.status,
        data.notes, data.url, data.image_url
      ).run()

      if (existed) result.updated++
      else result.inserted++
    } catch (error) {
      const pageId = page.id as string
      result.errors.push(`Gear ${pageId}: ${formatError(error)}`)
    }
  }

  return result
}

async function syncPhotos(notion: Client, db: D1Database, r2: R2Bucket | undefined, dbId: string): Promise<SyncResult> {
  const result: SyncResult = { table: 'photos', inserted: 0, updated: 0, errors: [] }
  
  let pages: Array<Record<string, unknown>>
  try {
    pages = await getAllPages(notion, dbId)
  } catch (error) {
    result.errors.push(`Failed to fetch photos: ${formatError(error)}`)
    return result
  }

  logSync('info', 'Syncing photos', { count: pages.length })

  for (const page of pages) {
    try {
      const pageId = page.id as string
      const id = pageId.replace(/-/g, '')
      
      // Get raw Notion properties
      const url = (getNotionProp(page, 'href', 'url') || getNotionProp(page, 'Image', 'files')) as string | null
      const caption = (getNotionProp(page, 'Caption', 'title') || getNotionProp(page, 'Name', 'title')) as string | null
      const dateRaw = getNotionProp(page, 'Date', 'date') as string | null
      const areaFallback = getNotionProp(page, 'area_fallback', 'rich_text') as string | null
      const tagsRaw = getNotionProp(page, 'tags', 'rich_text') as string | null
      const width = getNotionProp(page, 'width', 'number') as number | null
      const height = getNotionProp(page, 'height', 'number') as number | null
      const exclude = getNotionProp(page, 'exclude', 'checkbox') as boolean

      if (!url) continue // Skip photos without images

      // Parse date: strip timezone if present (YYYY-MM-DDTHH:mm:ss... → YYYY-MM-DD)
      const date = dateRaw ? dateRaw.split('T')[0] : null

      // Parse area_fallback into area and state
      const { area, state } = parseAreaFallback(areaFallback)

      // Parse tags: lowercase, trim, dedupe, sort alphabetically
      const searchTags = parseTags(tagsRaw)

      // Derive format from URL extension
      const ext = url.split('.').pop()?.toLowerCase() || 'jpg'
      const format = ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpeg'
      const r2Key = `photos/${id}`

      // Generate deterministic short_id from Notion page ID for clean URLs
      const shortId = await generateShortId(pageId)

      const existed = await rowExists(db, 'photos', id)

      await db.prepare(`
        INSERT INTO photos (
          id, notion_id, r2_key, short_id, src, caption, date,
          area, state, width, height, search_tags, exclude,
          format, site, source, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'climb-log', 'notion', datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          notion_id = excluded.notion_id,
          r2_key = excluded.r2_key,
          short_id = COALESCE(excluded.short_id, photos.short_id),
          src = excluded.src,
          caption = excluded.caption,
          date = excluded.date,
          area = excluded.area,
          state = excluded.state,
          width = excluded.width,
          height = excluded.height,
          search_tags = excluded.search_tags,
          exclude = excluded.exclude,
          format = excluded.format,
          site = excluded.site,
          source = excluded.source,
          updated_at = datetime('now')
      `).bind(
        id, id, r2Key, shortId, url, caption, date,
        area, state, width, height, searchTags, exclude ? 1 : 0,
        format
      ).run()

      // Sync image to R2 so we can serve from our own storage.
      // Note: "inserted"/"updated" reflect the D1 row upsert; R2 image sync
      // failures are logged but do not change these counts.
      if (r2) {
        await syncImageToR2(r2, r2Key, format, url, id)
      }

      if (existed) result.updated++
      else result.inserted++
    } catch (error) {
      const pageId = page.id as string
      result.errors.push(`Photo ${pageId}: ${formatError(error)}`)
    }
  }

  return result
}

/**
 * Sync an image from a URL to R2 storage.
 * Uses fetch with timeout to prevent hanging on slow/unresponsive servers.
 */
async function syncImageToR2(
  r2: R2Bucket,
  r2Key: string,
  format: string,
  url: string,
  photoId: string
): Promise<void> {
  try {
    const r2ObjectKey = `${r2Key}/original.${format}`
    const existing = await r2.head(r2ObjectKey)

    if (!existing) {
      const imgRes = await fetchImage(url, IMAGE_TIMEOUT_MS)
      if (imgRes.ok) {
        const buffer = await imgRes.arrayBuffer()
        const contentType = imgRes.headers.get('content-type') || `image/${format}`
        await r2.put(r2ObjectKey, buffer, {
          httpMetadata: { contentType },
        })
      } else {
        logSync('warn', 'Failed to fetch image', { 
          photoId, 
          url, 
          status: imgRes.status 
        })
      }
    }
  } catch (error) {
    // Don't fail the whole sync if one image upload fails
    logSync('warn', 'Failed to sync image to R2', { 
      photoId, 
      url, 
      error: formatError(error) 
    })
  }
}
