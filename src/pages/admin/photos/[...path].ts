import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'

export const prerender = false

// Photo administration lives in photos-api.
export const GET: APIRoute = async () => {
  return Response.redirect(new URL('/admin/', env.PHOTOS_API_ORIGIN).toString(), 301)
}
