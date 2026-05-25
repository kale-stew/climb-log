import type { APIRoute } from 'astro'
import { Client } from '@notionhq/client'
import { env } from 'cloudflare:workers'

export const prerender = false

// Notion database IDs from environment
const NOTION_DB_IDS = {
  climbs: import.meta.env.NOTION_CLIMBS_DB_ID,
  peaks: import.meta.env.NOTION_PEAKS_DB_ID,
  gear: import.meta.env.NOTION_GEAR_DB_ID,
  photos: import.meta.env.NOTION_PHOTOS_DB_ID,
}

interface SyncResult {
  table: string
  inserted: number
  updated: number
  errors: string[]
}

// Manual trigger via GET request with secret
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url)
  const secret = url.searchParams.get('secret')
  
  // Verify secret for manual triggers
  const expectedSecret = import.meta.env.CRON_SECRET
  if (!expectedSecret || secret !== expectedSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  return runSync()
}

// Cloudflare cron trigger via POST
export const POST: APIRoute = async () => {
  return runSync()
}

async function runSync(): Promise<Response> {
  const DB = env.DB as D1Database | undefined
  const notionToken = import.meta.env.NOTION_TOKEN

  if (!DB) {
    return new Response(JSON.stringify({ error: 'D1 not configured' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (!notionToken) {
    return new Response(JSON.stringify({ error: 'Notion token not configured' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const notion = new Client({ auth: notionToken })
  const results: SyncResult[] = []
  const startTime = Date.now()

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
      results.push(await syncPhotos(notion, DB, NOTION_DB_IDS.photos))
    }

    // Log sync result
    const duration = Date.now() - startTime
    await DB.prepare(`
      INSERT INTO sync_log (synced_at, duration_ms, records_synced, status, error_message)
      VALUES (datetime('now'), ?, ?, 'success', NULL)
    `).bind(
      duration,
      results.reduce((sum, r) => sum + r.inserted + r.updated, 0)
    ).run()

    return new Response(JSON.stringify({
      success: true,
      duration_ms: duration,
      results
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Log failed sync
    await DB.prepare(`
      INSERT INTO sync_log (synced_at, duration_ms, records_synced, status, error_message)
      VALUES (datetime('now'), ?, 0, 'failed', ?)
    `).bind(Date.now() - startTime, errorMessage).run()

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      results
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// Helper to get all pages from a Notion database (handles pagination)
async function getAllPages(notion: Client, databaseId: string) {
  const pages: any[] = []
  let cursor: string | undefined

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    })
    pages.push(...response.results)
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined
  } while (cursor)

  return pages
}

// Helper to extract property values from Notion
function getNotionProp(page: any, name: string, type: string): any {
  const prop = page.properties[name]
  if (!prop) return null

  switch (type) {
    case 'title':
      return prop.title?.[0]?.plain_text || null
    case 'rich_text':
      return prop.rich_text?.[0]?.plain_text || null
    case 'number':
      return prop.number ?? null
    case 'date':
      return prop.date?.start || null
    case 'select':
      return prop.select?.name || null
    case 'multi_select':
      return prop.multi_select?.map((s: any) => s.name) || []
    case 'url':
      return prop.url || null
    case 'checkbox':
      return prop.checkbox ?? false
    case 'files':
      return prop.files?.[0]?.file?.url || prop.files?.[0]?.external?.url || null
    default:
      return null
  }
}

async function syncClimbs(notion: Client, db: D1Database, dbId: string): Promise<SyncResult> {
  const result: SyncResult = { table: 'climbs', inserted: 0, updated: 0, errors: [] }
  const pages = await getAllPages(notion, dbId)

  for (const page of pages) {
    try {
      const id = page.id.replace(/-/g, '')
      const data = {
        id,
        date: getNotionProp(page, 'Date', 'date'),
        title: getNotionProp(page, 'Name', 'title'),
        slug: getNotionProp(page, 'Slug', 'rich_text'),
        preview_img_url: getNotionProp(page, 'Preview Image', 'files'),
        distance: getNotionProp(page, 'Distance', 'number'),
        gain: getNotionProp(page, 'Gain', 'number'),
        max_elevation: getNotionProp(page, 'Max Elevation', 'number'),
        moving_time: getNotionProp(page, 'Moving Time', 'number'),
        area: getNotionProp(page, 'Area', 'select'),
        state: getNotionProp(page, 'State', 'select'),
        strava: getNotionProp(page, 'Strava', 'url'),
        alltrails: getNotionProp(page, 'AllTrails', 'url'),
        published: getNotionProp(page, 'Published', 'checkbox'),
      }

      await db.prepare(`
        INSERT INTO climbs (id, date, title, slug, preview_img_url, distance, gain, max_elevation, moving_time, area, state, strava, alltrails, published, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
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
        data.id, data.date, data.title, data.slug, data.preview_img_url,
        data.distance, data.gain, data.max_elevation, data.moving_time,
        data.area, data.state, data.strava, data.alltrails, data.published ? 1 : 0
      ).run()

      result.inserted++
    } catch (error) {
      result.errors.push(`Climb ${page.id}: ${error}`)
    }
  }

  return result
}

async function syncPeaks(notion: Client, db: D1Database, dbId: string): Promise<SyncResult> {
  const result: SyncResult = { table: 'peaks', inserted: 0, updated: 0, errors: [] }
  const pages = await getAllPages(notion, dbId)

  for (const page of pages) {
    try {
      const id = page.id.replace(/-/g, '')
      const data = {
        id,
        name: getNotionProp(page, 'Name', 'title'),
        elevation: getNotionProp(page, 'Elevation', 'number'),
        prominence: getNotionProp(page, 'Prominence', 'number'),
        range: getNotionProp(page, 'Range', 'select'),
        first_completed: getNotionProp(page, 'First Completed', 'date'),
        attempts: getNotionProp(page, 'Attempts', 'number'),
        list_class: getNotionProp(page, 'Class', 'select'),
      }

      await db.prepare(`
        INSERT INTO peaks (id, name, elevation, prominence, range, first_completed, attempts, list_class, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          elevation = excluded.elevation,
          prominence = excluded.prominence,
          range = excluded.range,
          first_completed = excluded.first_completed,
          attempts = excluded.attempts,
          list_class = excluded.list_class,
          updated_at = datetime('now')
      `).bind(
        data.id, data.name, data.elevation, data.prominence,
        data.range, data.first_completed, data.attempts, data.list_class
      ).run()

      result.inserted++
    } catch (error) {
      result.errors.push(`Peak ${page.id}: ${error}`)
    }
  }

  return result
}

async function syncGear(notion: Client, db: D1Database, dbId: string): Promise<SyncResult> {
  const result: SyncResult = { table: 'gear', inserted: 0, updated: 0, errors: [] }
  const pages = await getAllPages(notion, dbId)

  for (const page of pages) {
    try {
      const id = page.id.replace(/-/g, '')
      const data = {
        id,
        name: getNotionProp(page, 'Name', 'title'),
        brand: getNotionProp(page, 'Brand', 'select'),
        category: getNotionProp(page, 'Category', 'select'),
        weight_oz: getNotionProp(page, 'Weight (oz)', 'number'),
        price: getNotionProp(page, 'Price', 'number'),
        rating: getNotionProp(page, 'Rating', 'number'),
        status: getNotionProp(page, 'Status', 'select'),
        notes: getNotionProp(page, 'Notes', 'rich_text'),
        url: getNotionProp(page, 'URL', 'url'),
        image_url: getNotionProp(page, 'Image', 'files'),
      }

      await db.prepare(`
        INSERT INTO gear (id, name, brand, category, weight_oz, price, rating, status, notes, url, image_url, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
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
        data.id, data.name, data.brand, data.category,
        data.weight_oz, data.price, data.rating, data.status,
        data.notes, data.url, data.image_url
      ).run()

      result.inserted++
    } catch (error) {
      result.errors.push(`Gear ${page.id}: ${error}`)
    }
  }

  return result
}

async function syncPhotos(notion: Client, db: D1Database, dbId: string): Promise<SyncResult> {
  const result: SyncResult = { table: 'photos', inserted: 0, updated: 0, errors: [] }
  const pages = await getAllPages(notion, dbId)

  for (const page of pages) {
    try {
      const id = page.id.replace(/-/g, '')
      const data = {
        id,
        url: getNotionProp(page, 'Image', 'files'),
        caption: getNotionProp(page, 'Caption', 'title') || getNotionProp(page, 'Name', 'title'),
        date: getNotionProp(page, 'Date', 'date'),
        location: getNotionProp(page, 'Location', 'rich_text'),
        camera: getNotionProp(page, 'Camera', 'select'),
        width: getNotionProp(page, 'Width', 'number'),
        height: getNotionProp(page, 'Height', 'number'),
      }

      if (!data.url) continue // Skip photos without images

      // Derive format from URL extension
      const urlStr = data.url || ''
      const ext = urlStr.split('.').pop()?.toLowerCase() || 'jpg'
      const format = ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpeg'
      const r2Key = `photos/${data.id}`

      await db.prepare(`
        INSERT INTO photos (id, notion_id, r2_key, src, caption, date, location, camera, width, height, format, site, source, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'climb-log', 'notion', datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          notion_id = excluded.notion_id,
          r2_key = excluded.r2_key,
          src = excluded.src,
          caption = excluded.caption,
          date = excluded.date,
          location = excluded.location,
          camera = excluded.camera,
          width = excluded.width,
          height = excluded.height,
          format = excluded.format,
          site = excluded.site,
          source = excluded.source,
          updated_at = datetime('now')
      `).bind(
        data.id, data.id, r2Key, data.url, data.caption, data.date,
        data.location, data.camera, data.width, data.height, format
      ).run()

      result.inserted++
    } catch (error) {
      result.errors.push(`Photo ${page.id}: ${error}`)
    }
  }

  return result
}
