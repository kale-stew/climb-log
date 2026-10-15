import { parseAreaFallback } from './notion-helpers'

export interface CanonicalPhoto {
  id: string
  title: string | null
  caption: string | null
  location: string | null
  date: string | null
  width: number | null
  height: number | null
  blurhash: string | null
  accent_color: string | null
  tags: string | null
  r2_key: string | null
}

export interface DisplayPhoto extends CanonicalPhoto {
  url: string
  area: string | null
  state: string | null
}

interface PhotosResponse {
  photos: CanonicalPhoto[]
  meta: { count: number }
}

interface PhotosOptions {
  limit?: number
  site?: string
  ttlMs?: number
  fetchFn?: typeof fetch
}

interface PhotoOptions {
  fetchFn?: typeof fetch
}

const PAGE_SIZE = 100
const DEFAULT_TTL_MS = 60_000
const cache = new Map<string, { expiresAt: number; photos: Promise<DisplayPhoto[]> }>()

function normalizeOrigin(origin: string): string {
  const url = new URL(origin)
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('PHOTOS_API_ORIGIN must use HTTP or HTTPS')
  return url.origin
}

const REGION_NAMES: Record<string, string> = {
  CA: 'California',
  CO: 'Colorado',
  HI: 'Hawaiʻi',
  IL: 'Illinois',
  UT: 'Utah',
}

const PLACE_NAMES: Record<string, string> = {
  Oahu: 'Oʻahu',
}

export function normalizePhotoText(value: string | null): string | null {
  if (!value) return value
  return value
    .replaceAll('HanakāpīʻAi', 'Hanakāpīʻai')
    .replaceAll('Kailalau Trail', 'Kalalau Trail')
    .replaceAll('Napali', 'Nā Pali')
}

export function normalizePhotoLocation(value: string | null): string | null {
  if (!value) return value
  if (value === 'Ocean Beach, SF, CA') return 'Ocean Beach, San Francisco'

  const parts = value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
  if (parts.length < 2) return value.trim()

  const region = parts.pop() ?? ''
  const place = parts.join(', ')
  return `${PLACE_NAMES[place] ?? place}, ${REGION_NAMES[region] ?? region}`
}

export function adaptCanonicalPhoto(photo: CanonicalPhoto): DisplayPhoto {
  const location = normalizePhotoLocation(photo.location)
  const { area, state } = parseAreaFallback(location)
  return {
    ...photo,
    title: normalizePhotoText(photo.title),
    caption: normalizePhotoText(photo.caption),
    location,
    url: `/img/${encodeURIComponent(photo.id)}/`,
    area,
    state,
  }
}

async function fetchPages(
  origin: string,
  limit: number,
  site: string,
  fetchFn: typeof fetch,
): Promise<DisplayPhoto[]> {
  const photos: DisplayPhoto[] = []

  while (photos.length < limit) {
    const pageLimit = Math.min(PAGE_SIZE, limit - photos.length)
    const url = new URL('/api/photos', origin)
    url.searchParams.set('site', site)
    url.searchParams.set('limit', String(pageLimit))
    url.searchParams.set('offset', String(photos.length))

    const response = await fetchFn(url, { headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`photos-api returned ${response.status}`)

    const body = (await response.json()) as PhotosResponse
    const page = body.photos.map(adaptCanonicalPhoto)
    photos.push(...page)
    if (page.length < pageLimit) break
  }

  return photos
}

/** Fetch public canonical photos, degrading to an empty list if the service is unavailable. */
export async function getCanonicalPhotos(
  origin: string | undefined,
  options: PhotosOptions = {},
): Promise<DisplayPhoto[]> {
  if (!origin) return []

  const limit = Math.max(1, options.limit ?? 500)
  const site = options.site ?? 'climb-log'
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS
  const fetchFn = options.fetchFn ?? fetch

  try {
    const normalizedOrigin = normalizeOrigin(origin)
    const cacheKey = `${normalizedOrigin}|${site}|${limit}`
    const cached = cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return await cached.photos

    const photos = fetchPages(normalizedOrigin, limit, site, fetchFn)
    cache.set(cacheKey, { expiresAt: Date.now() + ttlMs, photos })
    return await photos
  } catch (error) {
    console.error('Failed to fetch canonical photos:', error)
    return []
  }
}

export async function getCanonicalPhoto(
  origin: string | undefined,
  identifier: string,
  options: PhotoOptions = {},
): Promise<DisplayPhoto | null> {
  if (!origin) return null

  try {
    const url = new URL(`/api/photos/${encodeURIComponent(identifier)}`, normalizeOrigin(origin))
    const response = await (options.fetchFn ?? fetch)(url, {
      headers: { Accept: 'application/json' },
    })
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`photos-api returned ${response.status}`)
    return adaptCanonicalPhoto((await response.json()) as CanonicalPhoto)
  } catch (error) {
    console.error('Failed to fetch canonical photo:', error)
    return null
  }
}

export function clearPhotosCache(): void {
  cache.clear()
}
