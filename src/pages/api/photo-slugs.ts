import { env } from 'cloudflare:workers'
import type { APIRoute } from 'astro'
import { currentSlugs, ensurePhotoSlug } from '../../lib/photo-slugs'
import { getCanonicalPhoto, showsOnKyliesPhotos } from '../../lib/photos-client'

export const prerender = false

const MAX_IDS = 60
// Issuing a slug needs a photos-api lookup, so cap how many one request creates.
const MAX_NEW_SLUGS = 5

/** GET /api/photo-slugs?ids=a,b,c → { slugs: { [photoId]: slug } } for photos shown on this site. */
export const GET: APIRoute = async ({ url }) => {
  if (!env.DB) return Response.json({ slugs: {} }, { status: 503 })
  const ids = [
    ...new Set(
      (url.searchParams.get('ids') ?? '')
        .split(',')
        .map(id => id.trim())
        .filter(Boolean),
    ),
  ].slice(0, MAX_IDS)
  const slugs = await currentSlugs(env.DB, ids)

  for (const id of ids.filter(id => !slugs.has(id)).slice(0, MAX_NEW_SLUGS)) {
    const photo = await getCanonicalPhoto(env.PHOTOS_API_ORIGIN, id)
    if (photo && photo.id === id && showsOnKyliesPhotos(photo))
      slugs.set(id, await ensurePhotoSlug(env.DB, photo))
  }

  return Response.json(
    { slugs: Object.fromEntries(slugs) },
    { headers: { 'Cache-Control': 'public, max-age=60' } },
  )
}
