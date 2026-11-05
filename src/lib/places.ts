import type { ClimbListItem } from './types'

export interface ChapterDefinition {
  slug: string
  name: string
  /** Normalized state names that belong to this chapter. Empty means "everything unclaimed". */
  states: string[]
}

export interface PlaceCount {
  name: string
  count: number
}

export interface Chapter extends ChapterDefinition {
  /** 1-based position in the route book, ordered by first visit. */
  number: number
  outings: ClimbListItem[]
  count: number
  miles: number
  gain: number
  firstDate: string | null
  lastDate: string | null
  topAreas: PlaceCount[]
  /** Distinct states inside the chapter, most visited first. */
  regions: PlaceCount[]
  cover: ClimbListItem | null
}

const STATE_ALIASES: Record<string, string> = {
  AZ: 'Arizona',
  CA: 'California',
  CO: 'Colorado',
  UT: 'Utah',
  WA: 'Washington',
  OR: 'Oregon',
}

export const CHAPTER_DEFINITIONS: ChapterDefinition[] = [
  { slug: 'colorado', name: 'Colorado', states: ['Colorado'] },
  { slug: 'utah', name: 'Utah', states: ['Utah'] },
  { slug: 'arizona', name: 'Arizona', states: ['Arizona'] },
  { slug: 'california', name: 'California', states: ['California'] },
  {
    slug: 'pacific-northwest',
    name: 'Pacific Northwest',
    states: ['Oregon', 'Washington', 'Idaho'],
  },
  { slug: 'elsewhere', name: 'Elsewhere', states: [] },
]

export function normalizeState(state: string | null): string | null {
  const trimmed = state?.trim()
  if (!trimmed) return null
  return STATE_ALIASES[trimmed.toUpperCase()] ?? trimmed
}

function definitionFor(state: string | null): ChapterDefinition {
  const normalized = normalizeState(state)
  return (
    CHAPTER_DEFINITIONS.find(chapter => normalized && chapter.states.includes(normalized)) ??
    CHAPTER_DEFINITIONS[CHAPTER_DEFINITIONS.length - 1]
  )
}

export function chapterSlugFor(state: string | null): string {
  return definitionFor(state).slug
}

function tally(values: (string | null)[]): PlaceCount[] {
  const counts = new Map<string, number>()
  for (const value of values) {
    if (!value) continue
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

function byDateDesc(a: ClimbListItem, b: ClimbListItem): number {
  return (b.date ?? '').localeCompare(a.date ?? '')
}

/** Group outings into place chapters, ordered by when each chapter began. */
export function buildChapters(climbs: ClimbListItem[]): Chapter[] {
  const grouped = new Map<string, ClimbListItem[]>()
  for (const climb of climbs) {
    const slug = chapterSlugFor(climb.state)
    const outings = grouped.get(slug) ?? []
    outings.push(climb)
    grouped.set(slug, outings)
  }

  const chapters = CHAPTER_DEFINITIONS.flatMap(definition => {
    const outings = (grouped.get(definition.slug) ?? []).slice().sort(byDateDesc)
    if (outings.length === 0) return []

    const dated = outings.filter(outing => outing.date)
    return [
      {
        ...definition,
        number: 0,
        outings,
        count: outings.length,
        miles: Math.round(outings.reduce((sum, outing) => sum + (outing.distance ?? 0), 0)),
        gain: Math.round(outings.reduce((sum, outing) => sum + (outing.gain ?? 0), 0)),
        firstDate: dated.at(-1)?.date ?? null,
        lastDate: dated[0]?.date ?? null,
        topAreas: tally(outings.map(outing => outing.area)),
        regions: tally(outings.map(outing => normalizeState(outing.state))),
        cover: outings.find(outing => outing.preview_img_url) ?? null,
      } satisfies Chapter,
    ]
  })

  chapters.sort((a, b) => {
    if (a.slug === 'elsewhere') return 1
    if (b.slug === 'elsewhere') return -1
    return (a.firstDate ?? '9999').localeCompare(b.firstDate ?? '9999')
  })
  chapters.forEach((chapter, index) => {
    chapter.number = index + 1
  })
  return chapters
}

export function yearOf(date: string | null): string | null {
  return date ? date.slice(0, 4) : null
}

export function yearSpan(chapter: Pick<Chapter, 'firstDate' | 'lastDate'>): string {
  const first = yearOf(chapter.firstDate)
  const last = yearOf(chapter.lastDate)
  if (!first) return ''
  if (!last || first === last) return first
  return `${first}–${last}`
}

/** Group outings by year, newest year first, preserving date order inside each year. */
export function groupByYear(
  outings: ClimbListItem[],
): { year: string; outings: ClimbListItem[] }[] {
  const years = new Map<string, ClimbListItem[]>()
  for (const outing of outings.slice().sort(byDateDesc)) {
    const year = yearOf(outing.date) ?? 'Undated'
    const list = years.get(year) ?? []
    list.push(outing)
    years.set(year, list)
  }
  return [...years.entries()].map(([year, list]) => ({ year, outings: list }))
}

export function outingHref(outing: Pick<ClimbListItem, 'id' | 'slug'>): string {
  return outing.slug
    ? `/blog/hike/${outing.slug}/`
    : `/climbs/?outing=${encodeURIComponent(outing.id)}`
}

const OUTING_TYPE =
  /^(Trail Run|Hike|Climb|Backpack|Ski|Scramble|Run|Attempt|Sunrise Hike|Sunset Hike|Sunset Run)\b\s*/i

export function outingType(title: string | null): string {
  return title?.match(OUTING_TYPE)?.[1]?.toLowerCase() ?? 'outing'
}

export function outingName(title: string | null): string {
  return title?.replace(OUTING_TYPE, '').trim() || title || 'Untitled outing'
}
