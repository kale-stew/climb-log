import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'

export const prerender = false

// Hike photo assignment moved to photos-api formal hike links.
export const ALL: APIRoute = async () => {
  return Response.json(
    {
      error: 'Hike photo assignment moved to photos-api',
      admin: new URL('/admin/', env.PHOTOS_API_ORIGIN).toString(),
    },
    { status: 410 },
  )
}
