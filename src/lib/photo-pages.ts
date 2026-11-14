import { ensurePhotoSlug, isSlugShaped, resolveSlug } from './photo-slugs'
import { type DisplayPhoto, getCanonicalPhoto, showsOnKyliesPhotos } from './photos-client'

export type PhotoPageResolution =
  | { kind: 'photo'; photo: DisplayPhoto; slug: string }
  | { kind: 'redirect'; slug: string }
  | { kind: 'not-found' }

export const IMAGE_FORMATS = { jpg: 'jpeg', webp: 'webp' } as const
export type ImageExtension = keyof typeof IMAGE_FORMATS

export function photoPath(slug: string): string {
  return `/photos/${slug}`
}

export function photoImagePath(
  slug: string,
  extension: ImageExtension,
  width: number,
  version: string | null,
): string {
  const params = new URLSearchParams({ w: String(width) })
  if (version) params.set('v', version)
  return `/photos/${slug}.${extension}?${params}`
}

/**
 * Decide what /photos/{param} shows. A current slug renders the photo; an old
 * slug, a canonical ID, or a legacy alias redirects to the current slug. A
 * title change issues a new slug on the next visit and redirects to it.
 */
export async function resolvePhotoPage(
  db: D1Database,
  apiOrigin: string | undefined,
  param: string,
  fetchFn?: typeof fetch,
): Promise<PhotoPageResolution> {
  const match = isSlugShaped(param) ? await resolveSlug(db, param) : null
  const photo = await getCanonicalPhoto(apiOrigin, match?.photoId ?? param, { fetchFn })
  if (!photo || !showsOnKyliesPhotos(photo)) return { kind: 'not-found' }

  const slug = await ensurePhotoSlug(db, photo)
  return slug === param ? { kind: 'photo', photo, slug } : { kind: 'redirect', slug }
}

export type ImageResolution =
  | { kind: 'image'; photoId: string }
  | { kind: 'redirect'; slug: string }
  | { kind: 'not-found' }

/** Slugged image URLs resolve from the slug table alone; photos-api enforces visibility. */
export async function resolvePhotoImage(db: D1Database, slug: string): Promise<ImageResolution> {
  if (!isSlugShaped(slug)) return { kind: 'not-found' }
  const match = await resolveSlug(db, slug)
  if (!match) return { kind: 'not-found' }
  return match.currentSlug === slug
    ? { kind: 'image', photoId: match.photoId }
    : { kind: 'redirect', slug: match.currentSlug }
}

/** Transform parameters for a slugged image: the extension picks the format; width defaults to 1600. */
export function imageSearch(requestUrl: URL, extension: ImageExtension): string {
  const params = new URLSearchParams()
  params.set('w', requestUrl.searchParams.get('w') ?? '1600')
  params.set('format', IMAGE_FORMATS[extension])
  const version = requestUrl.searchParams.get('v')
  if (version) params.set('v', version)
  return `?${params}`
}
