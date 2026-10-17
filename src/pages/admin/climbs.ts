import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'

export const prerender = false

// Hike photo assignment lives in the photos-api admin (upload and edit pages).
export const GET: APIRoute = async () => {
  return Response.redirect(new URL('/admin/', env.PHOTOS_API_ORIGIN).toString(), 301)
}
