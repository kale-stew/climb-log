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
  const R2_IMAGES = env.R2_IMAGES as R2Bucket | undefined
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
      results.push(await syncPhotos(notion, DB, R2_IMAGES, NOTION_DB_IDS.photos))
    }

    // Log sync result
    const recordsSynced = results.reduce((sum, r) => sum + r.inserted + r.updated, 0)
    await DB.prepare(`
      INSERT INTO sync_log (sync_type, status, records_synced, error_message, completed_at)
      VALUES ('notion_sync', 'success', ?, NULL, datetime('now'))
    `).bind(recordsSynced).run()

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
      INSERT INTO sync_log (sync_type, status, records_synced, error_message, completed_at)
      VALUES ('notion_sync', 'failed', 0, ?, datetime('now'))
    `).bind(errorMessage).run()

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

async function syncPhotos(notion: Client, db: D1Database, r2: R2Bucket | undefined, dbId: string): Promise<SyncResult> {
  const result: SyncResult = { table: 'photos', inserted: 0, updated: 0, errors: [] }
  const pages = await getAllPages(notion, dbId)

  for (const page of pages) {
    try {
      const id = page.id.replace(/-/g, '')
      
      // Get raw Notion properties
      const url = getNotionProp(page, 'href', 'url') || getNotionProp(page, 'Image', 'files')
      const caption = getNotionProp(page, 'Caption', 'title') || getNotionProp(page, 'Name', 'title')
      const dateRaw = getNotionProp(page, 'Date', 'date')
      const areaFallback = getNotionProp(page, 'area_fallback', 'rich_text')
      const tagsRaw = getNotionProp(page, 'tags', 'rich_text')
      const width = getNotionProp(page, 'width', 'number')
      const height = getNotionProp(page, 'height', 'number')
      const exclude = getNotionProp(page, 'exclude', 'checkbox')

      if (!url) continue // Skip photos without images

      // Parse date: strip timezone if present (YYYY-MM-DDTHH:mm:ss... → YYYY-MM-DD)
      const date = dateRaw ? dateRaw.split('T')[0] : null

      // Parse area_fallback into area and state
      // Formats: "Area Name, State" or "Area Name- State" or "Area Name - State"
      let area: string | null = null
      let state: string | null = null
      
      if (areaFallback) {
        // Try comma separator first
        if (areaFallback.includes(',')) {
          const parts = areaFallback.split(',').map((s: string) => s.trim())
          area = parts[0] || null
          state = normalizeStateName(parts[1]) || null
        }
        // Try dash separator
        else if (areaFallback.includes('-')) {
          const parts = areaFallback.split('-').map((s: string) => s.trim())
          area = parts[0] || null
          state = normalizeStateName(parts[1]) || null
        }
        // No separator - just area
        else {
          area = areaFallback
        }
        
        // Clean up area spacing (e.g., "Bridger- Teton" → "Bridger-Teton")
        if (area) {
          area = area.replace(/\s*-\s*/g, '-').trim()
        }
      }

      // Parse tags: lowercase, trim, dedupe, sort alphabetically
      let searchTags: string | null = null
      if (tagsRaw) {
        const tags = tagsRaw
          .split(',')
          .map((t: string) => t.trim().toLowerCase())
          .filter((t: string) => t.length > 0)
        const uniqueTags = Array.from(new Set(tags)).sort()
        searchTags = uniqueTags.join(', ')
      }

      // Derive format from URL extension
      const ext = url.split('.').pop()?.toLowerCase() || 'jpg'
      const format = ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpeg'
      const r2Key = `photos/${id}`

      // Generate deterministic short_id from Notion page ID for clean URLs
      // This ensures the same photo always gets the same short_id, preventing URL breakage
      const shortId = await generateShortId(page.id)

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

      // Sync image to R2 so we can serve from our own storage
      if (r2) {
        try {
          const r2ObjectKey = `${r2Key}/original.${format}`
          const existing = await r2.head(r2ObjectKey)

          if (!existing) {
            const imgRes = await fetch(url)
            if (imgRes.ok) {
              const buffer = await imgRes.arrayBuffer()
              const contentType = imgRes.headers.get('content-type') || `image/${format}`
              await r2.put(r2ObjectKey, buffer, {
                httpMetadata: { contentType },
              })
            }
          }
        } catch (r2Error) {
          // Don't fail the whole sync if one image upload fails
          console.error(`Failed to sync image ${id} to R2:`, r2Error)
        }
      }

      result.inserted++
    } catch (error) {
      result.errors.push(`Photo ${page.id}: ${error}`)
    }
  }

  return result
}

// Helper to normalize state names to full names
function normalizeStateName(state: string | null | undefined): string | null {
  if (!state) return null
  
  const stateMap: Record<string, string> = {
    'AZ': 'Arizona',
    'CA': 'California',
    'CO': 'Colorado',
    'ID': 'Idaho',
    'MT': 'Montana',
    'NM': 'New Mexico',
    'NV': 'Nevada',
    'OR': 'Oregon',
    'UT': 'Utah',
    'WA': 'Washington',
    'WY': 'Wyoming',
    'Alaska': 'Alaska',
    'Washington State': 'Washington'
  }
  
  const trimmed = state.trim()
  return stateMap[trimmed] || trimmed
}
