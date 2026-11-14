import { env } from 'cloudflare:workers'
import type { APIRoute } from 'astro'
import { type ImageExtension, imageSearch, resolvePhotoImage } from './photo-pages'
import { proxyPhotoImage } from './photo-proxy'

/** GET /photos/{slug}.{jpg|webp}: a readable image URL proxied to photos-api. */
export function photoImageRoute(extension: ImageExtension): APIRoute {
  return async ({ request, params }) => {
    const slug = params.slug ?? ''
    if (!env.DB) return new Response('Photo pages are not configured', { status: 503 })
    const resolution = await resolvePhotoImage(env.DB, slug)
    if (resolution.kind === 'not-found') return new Response('Photo not found', { status: 404 })
    const url = new URL(request.url)
    if (resolution.kind === 'redirect') {
      return new Response(null, {
        status: 301,
        headers: { Location: `/photos/${resolution.slug}.${extension}${url.search}` },
      })
    }
    return proxyPhotoImage(request, resolution.photoId, imageSearch(url, extension), env)
  }
}
