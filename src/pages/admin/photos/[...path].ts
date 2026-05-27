import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { createPhotosApp } from '../../../../utils/photos-api'

export const prerender = false

// Handles all /admin/photos/* routes (admin UI)
export const GET: APIRoute = async ({ request }) => {
  const app = createPhotosApp({
    DB: env.DB,
    R2_IMAGES: env.R2_IMAGES,
    IMAGES: env.IMAGES,
  })
  return app.fetch(request)
}
