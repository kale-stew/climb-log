import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'

export const prerender = false

// Photo administration lives in photos-api. Do not forward mutations across origins.
export const ALL: APIRoute = async () => {
  return Response.json(
    {
      error: 'Photo administration moved to photos-api',
      admin: new URL('/admin/', env.PHOTOS_API_ORIGIN).toString(),
    },
    { status: 410 },
  )
}
