import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { createPhotosApp } from '../../../utils/photos-api'

export const prerender = false

export const GET: APIRoute = async ({ request, params }) => {
  const app = createPhotosApp({
    DB: env.DB as D1Database,
    R2_IMAGES: env.R2_IMAGES as R2Bucket,
    IMAGES: (env as any).IMAGES as ImagesBinding,
  })

  // Rewrite the URL to include the path param
  const url = new URL(request.url)
  const photoId = params.id
  if (photoId) {
    url.pathname = `/img/${photoId}`
  }

  const newRequest = new Request(url, request)
  return app.fetch(newRequest)
}
