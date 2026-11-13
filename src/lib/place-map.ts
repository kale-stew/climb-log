import frames from './place-map-frames.json'

export interface MapFrame {
  zoom: number
  x0: number
  y0: number
  width: number
  height: number
}

export interface MapOuting {
  id: string
  date: string | null
  title: string | null
  href: string
  cover: string | null
  latitude: number
  longitude: number
  /** The place this outing belongs to, for maps that span several places. */
  group?: { name: string; href: string }
}

export interface MapPin {
  /** Position as a fraction of the map's width and height. */
  x: number
  y: number
  count: number
  /** Newest outing in the pin; its cover is the pin's thumbnail. */
  lead: MapOuting
  /** Every outing in the pin, newest first. */
  members: MapOuting[]
  /** Places the pin's outings belong to, most outings first. */
  groups: { name: string; href: string; count: number }[]
}

const FRAMES: Record<string, MapFrame> = frames

export function mapFrame(slug: string): MapFrame | null {
  return FRAMES[slug] ?? null
}

/** Web Mercator, matching the terrain tiles and d3 projection the maps were drawn with. */
export function project(
  frame: MapFrame,
  latitude: number,
  longitude: number,
): { x: number; y: number } | null {
  const size = 256 * 2 ** frame.zoom
  const rad = (latitude * Math.PI) / 180
  const px = ((longitude + 180) / 360) * size
  const py = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * size
  const x = (px - frame.x0) / frame.width
  const y = (py - frame.y0) / frame.height
  return x >= 0 && x <= 1 && y >= 0 && y <= 1 ? { x, y } : null
}

/**
 * Merge outings whose pins would overlap. `size` is the pin's width as a
 * fraction of the map width; pins are squares with a short tail below, so they
 * collide only when both offsets are under a pin's size. Newest outings claim
 * their spot first, so each pin shows its most recent photo.
 */
export function clusterPins(frame: MapFrame, outings: MapOuting[], size: number): MapPin[] {
  const aspect = frame.height / frame.width
  const newestFirst = outings.slice().sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  const clusters: { x: number; y: number; members: MapOuting[] }[] = []

  for (const outing of newestFirst) {
    const point = project(frame, outing.latitude, outing.longitude)
    if (!point) continue
    const near = clusters.find(
      cluster =>
        Math.abs(cluster.x - point.x) < size &&
        Math.abs(cluster.y - point.y) * aspect < size * 1.15,
    )
    if (near) near.members.push(outing)
    else clusters.push({ ...point, members: [outing] })
  }

  return clusters.map(cluster => {
    const groups = new Map<string, { name: string; href: string; count: number }>()
    for (const { group } of cluster.members) {
      if (!group) continue
      const entry = groups.get(group.href) ?? { ...group, count: 0 }
      entry.count++
      groups.set(group.href, entry)
    }
    return {
      x: cluster.x,
      y: cluster.y,
      count: cluster.members.length,
      lead: cluster.members.find(member => member.cover) ?? cluster.members[0],
      members: cluster.members,
      // Stable sort: ties keep first-seen order, which is newest first.
      groups: [...groups.values()].sort((a, b) => b.count - a.count),
    }
  })
}

export interface OutingLocation {
  latitude: number
  longitude: number
}

/** Visible outing locations by climb id. Empty if the table is missing or the query fails. */
export async function loadOutingLocations(
  db: D1Database | undefined,
): Promise<Map<string, OutingLocation>> {
  if (!db) return new Map()
  try {
    const result = await db
      .prepare('SELECT climb_id, latitude, longitude FROM climb_locations WHERE hidden = 0')
      .all<{ climb_id: string; latitude: number; longitude: number }>()
    return new Map((result.results ?? []).map(row => [row.climb_id, row]))
  } catch (error) {
    // The map is an extra: without locations the page renders as it did before.
    console.error('Failed to load outing locations:', error)
    return new Map()
  }
}
