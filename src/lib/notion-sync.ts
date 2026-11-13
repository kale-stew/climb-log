/**
 * Notion -> D1 sync for climbs, peaks, and gear.
 *
 * Property names and transforms mirror `scripts/export-data.mjs`, which produced
 * the original seed data, so synced rows keep the same IDs (dashed Notion page
 * IDs) and value formats as the seeded rows they replace.
 */

import type { SyncResult } from './types'

type NotionProperty = { type: string } & Record<string, unknown>
export interface NotionPage {
  id: string
  properties: Record<string, NotionProperty>
  cover?: { file?: { url?: string }; external?: { url?: string } } | null
}

export interface NotionQueryClient {
  databases: {
    query(args: { database_id: string; start_cursor?: string; page_size?: number }): Promise<{
      results: unknown[]
      has_more: boolean
      next_cursor: string | null
    }>
  }
}

type Value = string | number | null
type Row = { id: string } & Record<string, Value>

/** Format a Notion property value the same way the export script does. */
export function fmt(
  field: NotionProperty | undefined,
): string | number | boolean | string[] | null {
  if (!field) return null
  type RichText = Array<{ plain_text: string }>
  type FileItem = { file?: { url?: string }; external?: { url?: string } }
  const f = field as {
    checkbox?: boolean
    date?: { start?: string } | null
    files?: FileItem[]
    formula?: { string?: string | null; number?: number | null }
    multi_select?: Array<{ name: string }>
    number?: number | null
    rich_text?: RichText
    select?: { name?: string } | null
    title?: RichText
    url?: string | null
  }
  const joined = (parts: RichText | undefined) =>
    parts && parts.length > 0 ? parts.map(part => part.plain_text).join('') : null
  switch (field.type) {
    case 'checkbox':
      return f.checkbox ?? false
    case 'date':
      return f.date?.start ?? null
    case 'files': {
      const first = f.files?.[0]
      return first?.file?.url ?? first?.external?.url ?? null
    }
    case 'formula':
      return f.formula?.string ?? f.formula?.number ?? null
    case 'multi_select':
      return f.multi_select && f.multi_select.length > 0 ? f.multi_select.map(s => s.name) : null
    case 'number':
      return f.number ?? null
    case 'rich_text':
      return joined(f.rich_text)
    case 'select':
      return f.select?.name ?? null
    case 'title':
      return joined(f.title)
    case 'url':
      return f.url ?? null
    default:
      return null
  }
}

function str(value: ReturnType<typeof fmt>): string | null {
  if (value === null || value === undefined || value === '') return null
  // Arrays (multi_select) are stored comma-joined, matching the seed output.
  return Array.isArray(value) ? value.join(',') : String(value)
}

function num(value: ReturnType<typeof fmt>): number | null {
  return typeof value === 'number' ? value : null
}

const AREA_ABBREVIATIONS: Record<string, string> = {
  NF: 'National Forest',
  NP: 'National Park',
  OS: 'Open Space',
  RA: 'Recreation Area',
  RP: 'Regional Park',
  SP: 'State Park',
  WA: 'Wilderness',
}

function buildAreaName(area: string | undefined): string | null {
  if (!area) return null
  for (const [abbr, full] of Object.entries(AREA_ABBREVIATIONS)) {
    if (area.includes(abbr)) return area.replace(abbr, full)
  }
  return area
}

export function parseArea(value: string | null): { area: string | null; state: string | null } {
  if (!value) return { area: null, state: null }
  const parts = value.split(', ')
  return { area: buildAreaName(parts[0]), state: parts[1] ?? null }
}

/** Notion-hosted file URLs are signed and expire within hours, so never persist them. */
export function isExpiringNotionUrl(url: string): boolean {
  return (
    url.includes('amazonaws.com') ||
    url.includes('notion-static.com') ||
    url.includes('notionusercontent.com')
  )
}

/**
 * Notion returns every database property on every page, even when empty, so a
 * missing key means the property was renamed or removed. Fail loudly instead of
 * overwriting the column with NULL on every row.
 */
function requireProperties(page: NotionPage, names: string[]): void {
  const missing = names.filter(name => !(name in page.properties))
  if (missing.length > 0) throw new Error(`missing Notion properties: ${missing.join(', ')}`)
}

const CLIMB_PROPERTIES = [
  'date',
  'hike_title',
  'related_slug',
  'related_img',
  'distance',
  'gain',
  'area',
  'strava',
  'summits',
]
const PEAK_PROPERTIES = ['peak_name', 'elevation', 'first_completed_on', 'range', 'rank', 'img_url']
const GEAR_PROPERTIES = [
  'title',
  'acquired_on',
  'brand',
  'category',
  'color',
  'img_slug',
  'more_info',
  'pack_list',
  'product',
  'retired_on',
  'url',
]

export function mapClimb(page: NotionPage, today: string): Row | null {
  requireProperties(page, CLIMB_PROPERTIES)
  const props = page.properties
  const date = str(fmt(props.date))
  // Future-dated climbs are intentionally unpublished.
  if (date && date > today) return null

  let preview = str(fmt(props.related_img))
  if (!preview && page.cover) preview = page.cover.file?.url ?? page.cover.external?.url ?? null
  preview = preview?.split(',')[0]?.trim() || null
  if (preview && isExpiringNotionUrl(preview)) preview = null

  const { area, state } = parseArea(str(fmt(props.area)))
  return {
    id: page.id,
    date,
    title: str(fmt(props.hike_title)),
    slug: str(fmt(props.related_slug)),
    preview_img_url: preview,
    distance: num(fmt(props.distance)),
    gain: num(fmt(props.gain)),
    area,
    state,
    strava: str(fmt(props.strava)),
    summits: str(fmt(props.summits)),
  }
}

export function mapPeak(page: NotionPage): Row | null {
  requireProperties(page, PEAK_PROPERTIES)
  const props = page.properties
  const title = str(fmt(props.peak_name))
  const elevation = num(fmt(props.elevation))
  // Both columns are NOT NULL in D1; treat gaps as errors so the row is not deleted.
  if (!title || elevation === null) throw new Error('peak is missing a name or elevation')
  return {
    id: page.id,
    title,
    elevation,
    first_completed: str(fmt(props.first_completed_on)),
    range: str(fmt(props.range)),
    rank: num(fmt(props.rank)),
    img: str(fmt(props.img_url)),
  }
}

export function mapGear(page: NotionPage): Row | null {
  requireProperties(page, GEAR_PROPERTIES)
  const props = page.properties
  const acquiredOn = str(fmt(props.acquired_on))
  // Only acquired gear is published.
  if (!acquiredOn) return null
  const title = str(fmt(props.title))
  // title is NOT NULL in D1; treat a gap as an error so the row is not deleted.
  if (!title) throw new Error('gear is missing a title')
  const imgSlug = str(fmt(props.img_slug))
  return {
    id: page.id,
    title,
    acquired_on: acquiredOn,
    brand: str(fmt(props.brand)),
    category: str(fmt(props.category)),
    color: str(fmt(props.color)),
    img: imgSlug ? `${imgSlug}.png` : null,
    more_info: str(fmt(props.more_info)),
    pack_list: str(fmt(props.pack_list)),
    product_str: str(fmt(props.product)),
    retired_on: str(fmt(props.retired_on)),
    url: str(fmt(props.url)),
  }
}

export interface TableSpec {
  table: 'climbs' | 'peaks' | 'gear'
  columns: string[]
  map: (page: NotionPage) => Row | null
  /** Per-column SQL used on conflict instead of `excluded.<column>`. */
  updateOverrides?: Record<string, string>
}

export function tableSpecs(today: string): TableSpec[] {
  return [
    {
      table: 'climbs',
      columns: [
        'id',
        'date',
        'title',
        'slug',
        'preview_img_url',
        'distance',
        'gain',
        'area',
        'state',
        'strava',
        'summits',
      ],
      map: page => mapClimb(page, today),
      // Seeded previews were rewritten to canonical `/img/{id}` paths; keep those
      // rather than reverting them to the external URL stored in Notion.
      updateOverrides: {
        preview_img_url:
          "CASE WHEN climbs.preview_img_url LIKE '/img/%' THEN climbs.preview_img_url ELSE excluded.preview_img_url END",
      },
    },
    {
      table: 'peaks',
      columns: ['id', 'title', 'elevation', 'first_completed', 'range', 'rank', 'img'],
      map: mapPeak,
    },
    {
      table: 'gear',
      columns: [
        'id',
        'title',
        'acquired_on',
        'brand',
        'category',
        'color',
        'img',
        'more_info',
        'pack_list',
        'product_str',
        'retired_on',
        'url',
      ],
      map: mapGear,
    },
  ]
}

export async function fetchAllPages(
  notion: NotionQueryClient,
  databaseId: string,
): Promise<NotionPage[]> {
  const pages: NotionPage[] = []
  let cursor: string | undefined
  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    })
    for (const result of response.results) {
      if (result && typeof result === 'object' && 'properties' in result)
        pages.push(result as NotionPage)
    }
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
  } while (cursor)
  return pages
}

/** Refuse deletions that look like a broken source rather than real removals. */
export const MAX_DELETE_FRACTION = 0.1
const MIN_DELETE_ALLOWANCE = 5

export function upsertSql(spec: TableSpec): string {
  const placeholders = spec.columns.map(() => '?').join(', ')
  const updates = spec.columns
    .filter(column => column !== 'id')
    .map(column => `${column} = ${spec.updateOverrides?.[column] ?? `excluded.${column}`}`)
  return `INSERT INTO ${spec.table} (${spec.columns.join(', ')}) VALUES (${placeholders})
ON CONFLICT(id) DO UPDATE SET ${updates.join(', ')}, updated_at = datetime('now')`
}

/**
 * Mirror one Notion database into its D1 table: upsert every published row and
 * delete rows that no longer exist in Notion. Writes run as one atomic batch.
 */
export async function syncTable(
  db: D1Database,
  spec: TableSpec,
  pages: NotionPage[],
): Promise<SyncResult> {
  const result: SyncResult = { table: spec.table, inserted: 0, updated: 0, deleted: 0, errors: [] }

  const rows: Row[] = []
  for (const page of pages) {
    try {
      const row = spec.map(page)
      if (row) rows.push(row)
    } catch (error) {
      result.errors.push(
        `${spec.table} ${page.id}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  const existing = await db.prepare(`SELECT id FROM ${spec.table}`).all<{ id: string }>()
  const existingIds = new Set((existing.results ?? []).map(row => row.id))
  const keepIds = new Set(rows.map(row => row.id))
  const staleIds = [...existingIds].filter(id => !keepIds.has(id))

  const deleteLimit = Math.max(
    MIN_DELETE_ALLOWANCE,
    Math.floor(existingIds.size * MAX_DELETE_FRACTION),
  )
  const canDelete = result.errors.length === 0 && rows.length > 0 && staleIds.length <= deleteLimit
  if (staleIds.length > 0 && !canDelete) {
    result.errors.push(
      `Skipped deleting ${staleIds.length} ${spec.table} rows missing from Notion (limit ${deleteLimit}, ${rows.length} rows fetched)`,
    )
  }

  const upsert = db.prepare(upsertSql(spec))
  const statements = rows.map(row =>
    upsert.bind(...spec.columns.map(column => row[column] ?? null)),
  )
  if (canDelete) {
    const remove = db.prepare(`DELETE FROM ${spec.table} WHERE id = ?`)
    statements.push(...staleIds.map(id => remove.bind(id)))
  }
  if (statements.length > 0) await db.batch(statements)

  for (const row of rows) {
    if (existingIds.has(row.id)) result.updated++
    else result.inserted++
  }
  if (canDelete) result.deleted = staleIds.length
  return result
}
