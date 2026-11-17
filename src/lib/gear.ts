/**
 * View model for /gear: status, display categories, pack lists, weights, and
 * climb links derived from the Notion-synced `gear` and `climbs` tables.
 */

import { GEAR_IMAGE_WIDTHS, gearImagePath, isGearImageVersion } from './gear-images'

export interface GearRow {
  id: string
  title: string
  brand: string | null
  category: string | null
  img_version: string | null
  url: string | null
  more_info: string | null
  acquired_on: string | null
  retired_on: string | null
  pack_list: string | null
  weight_g: number | null
}

export interface GearClimbLink {
  gear_id: string
  id: string
  title: string | null
  date: string | null
}

export type GearStatus = 'current' | 'retired'
export type StatusFilter = GearStatus | 'all'

export interface GearCategory {
  slug: string
  label: string
  emoji: string
}

export interface GearImage {
  src: string
  srcset: string
  thumb: string
}

export interface GearItem {
  id: string
  title: string
  brand: string | null
  status: GearStatus
  category: GearCategory
  image: GearImage | null
  url: string | null
  story: string | null
  retiredYear: string | null
  retiredOn: string | null
  packLists: string[]
  weightG: number | null
  climbs: Array<{ id: string; title: string; date: string | null }>
}

export interface PackList {
  slug: string
  /** Name as written in Notion, used for matching. */
  name: string
  /** Sentence-case name for display. */
  label: string
}

/** Notion's legacy status-as-category; retired items carry no real category yet. */
export const RETIRED_CATEGORY = '🪦 Retired Items'

/** Packing order, not alphabetical. Unknown categories sort after these. */
export const CATEGORY_ORDER = [
  'climbing-gear',
  'winter-gear',
  'layers',
  'backpacking-gear',
  'ski-gear',
  'running-gear',
  'summer-gear',
  'cooking-tools',
  'car-camping-items',
  'travel',
  'expedition',
  'other',
]

const OTHER: GearCategory = { slug: 'other', label: 'Other', emoji: '🎒' }
const GRAMS_PER_OUNCE = 28.3495

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** "🧦 Layers" → { label: "Layers", emoji: "🧦", slug: "layers" } */
export function parseCategory(raw: string | null): GearCategory {
  if (!raw || raw === RETIRED_CATEGORY) return OTHER
  const match = /^([^\p{L}\p{N}]*)(.*)$/u.exec(raw.trim())
  const emoji = match?.[1].trim() ?? ''
  const label = (match?.[2] ?? raw).trim() || raw.trim()
  const slug = slugify(label)
  return slug ? { slug, label, emoji: emoji || OTHER.emoji } : OTHER
}

export function gearStatus(row: Pick<GearRow, 'retired_on' | 'category'>): GearStatus {
  return row.retired_on || row.category === RETIRED_CATEGORY ? 'retired' : 'current'
}

export function categoryRank(slug: string): number {
  const index = CATEGORY_ORDER.indexOf(slug)
  return index === -1 ? CATEGORY_ORDER.length : index
}

export function gearImage(row: Pick<GearRow, 'id' | 'img_version'>): GearImage | null {
  if (!isGearImageVersion(row.img_version)) return null
  const version = row.img_version
  return {
    src: gearImagePath(row.id, version, 400),
    srcset: GEAR_IMAGE_WIDTHS.map(w => `${gearImagePath(row.id, version, w)} ${w}w`).join(', '),
    thumb: gearImagePath(row.id, version, 200),
  }
}

export function splitPackLists(value: string | null): string[] {
  return value
    ? value
        .split(',')
        .map(name => name.trim())
        .filter(Boolean)
    : []
}

/** One weight format everywhere: g and oz under a kilogram, kg and lb above. */
export function formatWeight(grams: number | null): string | null {
  if (grams === null || !(grams > 0)) return null
  if (grams >= 1000) return `${(grams / 1000).toFixed(2)} kg · ${(grams / 453.592).toFixed(1)} lb`
  const ounces = grams / GRAMS_PER_OUNCE
  const oz = ounces < 10 ? ounces.toFixed(1).replace(/\.0$/, '') : String(Math.round(ounces))
  return `${Math.round(grams)} g · ${oz} oz`
}

export function buildGearItems(rows: GearRow[], links: GearClimbLink[] = []): GearItem[] {
  const climbsByGear = new Map<string, GearItem['climbs']>()
  for (const link of links) {
    const list = climbsByGear.get(link.gear_id) ?? []
    if (!list.some(climb => climb.id === link.id)) {
      list.push({ id: link.id, title: link.title?.trim() || 'Untitled outing', date: link.date })
    }
    climbsByGear.set(link.gear_id, list)
  }

  return rows
    .map(row => {
      const status = gearStatus(row)
      const climbs = (climbsByGear.get(row.id) ?? []).sort((a, b) =>
        (b.date ?? '').localeCompare(a.date ?? ''),
      )
      return {
        id: row.id,
        title: row.title,
        brand: row.brand,
        status,
        category: parseCategory(row.category),
        image: gearImage(row),
        url: row.url && /^https?:\/\//i.test(row.url) ? row.url : null,
        story: row.more_info?.trim() || null,
        retiredYear: row.retired_on?.slice(0, 4) ?? null,
        retiredOn: row.retired_on,
        packLists: splitPackLists(row.pack_list),
        weightG: row.weight_g,
        climbs,
      } satisfies GearItem
    })
    .sort(compareItems)
}

function compareItems(a: GearItem, b: GearItem): number {
  if (a.status !== b.status) return a.status === 'current' ? -1 : 1
  if (a.status === 'retired') {
    const byDate = (b.retiredOn ?? '').localeCompare(a.retiredOn ?? '')
    if (byDate !== 0) return byDate
  } else {
    const byCategory = categoryRank(a.category.slug) - categoryRank(b.category.slug)
    if (byCategory !== 0) return byCategory
    const byLabel = a.category.label.localeCompare(b.category.label)
    if (byLabel !== 0) return byLabel
  }
  return a.title.localeCompare(b.title) || (a.brand ?? '').localeCompare(b.brand ?? '')
}

/** Categories present in the data, in packing order. */
export function categoriesOf(items: GearItem[]): GearCategory[] {
  const bySlug = new Map<string, GearCategory>()
  for (const item of items)
    if (!bySlug.has(item.category.slug)) bySlug.set(item.category.slug, item.category)
  return [...bySlug.values()].sort(
    (a, b) => categoryRank(a.slug) - categoryRank(b.slug) || a.label.localeCompare(b.label),
  )
}

/** Pack lists used by current gear, alphabetical, with stable slugs. */
export function packListsOf(items: GearItem[]): PackList[] {
  const bySlug = new Map<string, PackList>()
  for (const item of items) {
    if (item.status !== 'current') continue
    for (const name of item.packLists) {
      const slug = slugify(name)
      if (slug && !bySlug.has(slug)) {
        bySlug.set(slug, { slug, name, label: name.charAt(0).toUpperCase() + name.slice(1) })
      }
    }
  }
  return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function groupByCategory(
  items: GearItem[],
): Array<{ category: GearCategory; items: GearItem[] }> {
  const groups = new Map<string, { category: GearCategory; items: GearItem[] }>()
  for (const item of items) {
    const group = groups.get(item.category.slug) ?? { category: item.category, items: [] }
    group.items.push(item)
    groups.set(item.category.slug, group)
  }
  return [...groups.values()].sort(
    (a, b) =>
      categoryRank(a.category.slug) - categoryRank(b.category.slug) ||
      a.category.label.localeCompare(b.category.label),
  )
}

export interface GearFilters {
  status: StatusFilter
  category: string | null
  list: PackList | null
}

/** Read filters from the URL, falling back to defaults for unknown values. */
export function parseGearFilters(
  params: URLSearchParams,
  categories: GearCategory[],
  lists: PackList[],
): GearFilters {
  const status = params.get('status')
  const category = params.get('cat')
  const list = params.get('list')
  return {
    status: status === 'retired' || status === 'all' ? status : 'current',
    category: category && categories.some(c => c.slug === category) ? category : null,
    list: lists.find(l => l.slug === list) ?? null,
  }
}

export function matchesFilters(
  item: GearItem,
  filters: Pick<GearFilters, 'status' | 'category'>,
): boolean {
  if (filters.status !== 'all' && item.status !== filters.status) return false
  if (filters.category && item.category.slug !== filters.category) return false
  return true
}

export interface PackListView {
  list: PackList
  groups: Array<{ category: GearCategory; items: GearItem[]; grams: number; unweighed: number }>
  count: number
  totalGrams: number
  unweighed: number
}

/** Current gear on one pack list, grouped by category with weight subtotals. */
export function packListView(items: GearItem[], list: PackList): PackListView {
  const onList = items.filter(
    item => item.status === 'current' && item.packLists.some(name => slugify(name) === list.slug),
  )
  const groups = groupByCategory(onList).map(group => ({
    ...group,
    grams: group.items.reduce((sum, item) => sum + (item.weightG ?? 0), 0),
    unweighed: group.items.filter(item => !(item.weightG && item.weightG > 0)).length,
  }))
  return {
    list,
    groups,
    count: onList.length,
    totalGrams: groups.reduce((sum, group) => sum + group.grams, 0),
    unweighed: onList.filter(item => !(item.weightG && item.weightG > 0)).length,
  }
}

/**
 * Gear-to-climb links through shared Primary Calendars events. Selects only
 * climb fields; calendar ids stay in the database.
 */
export const GEAR_CLIMB_LINKS_SQL = `
  SELECT DISTINCT g.id AS gear_id, c.id AS id, c.title AS title, c.date AS date
  FROM gear g
  JOIN json_each(CASE WHEN json_valid(g.event_ids) THEN g.event_ids ELSE '[]' END) ge
  JOIN climbs c ON c.calendar_event_ids IS NOT NULL
  JOIN json_each(CASE WHEN json_valid(c.calendar_event_ids) THEN c.calendar_event_ids ELSE '[]' END) ce
    ON ce.value = ge.value
`

export const GEAR_ROWS_SQL = `
  SELECT id, title, brand, category, img_version, url, more_info,
         acquired_on, retired_on, pack_list, weight_g
  FROM gear
`
