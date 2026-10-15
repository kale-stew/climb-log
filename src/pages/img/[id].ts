import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { createPhotosApp } from '../../../utils/photos-api'

export const prerender = false

export const GET: APIRoute = async ({ request, params }) => {
  const photoId = params.id
  if (!photoId) return new Response('Missing photo ID', { status: 400 })

  // Canonical storage is authoritative. Keep this same-origin route so every
  // published /img/{legacy-or-canonical-id} URL remains stable during cutover.
  if (env.PHOTOS_API_ORIGIN) {
    try {
      const upstreamUrl = new URL(`/img/${encodeURIComponent(photoId)}`, env.PHOTOS_API_ORIGIN)
      upstreamUrl.search = new URL(request.url).search
      const upstream = await fetch(new Request(upstreamUrl, request))
      if (upstream.status !== 404) return upstream
    } catch (error) {
      console.error('Canonical image request failed; trying legacy storage:', error)
    }
  }

  // Temporary rollback path for identifiers not imported into the canonical
  // service yet. Remove only after the full reference audit passes.
  const app = createPhotosApp({
    DB: env.DB as D1Database,
    R2_IMAGES: env.R2_IMAGES as R2Bucket,
    IMAGES: (env as any).IMAGES as ImagesBinding,
  })

  // Rewrite the URL to include the path param
  const url = new URL(request.url)
  url.pathname = `/img/${photoId}`

  const newRequest = new Request(url, request)
  return app.fetch(newRequest)
}
