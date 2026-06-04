import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { createPhotosApp } from '../../../../../utils/photos-api'

export const prerender = false

/**
 * Build the photos Hono app once per isolate and reuse it across requests.
 * Lazily initialized so the Cloudflare `env` binding is available on first use.
 */
let photosApp: ReturnType<typeof createPhotosApp> | undefined
function getPhotosApp() {
  if (!photosApp) {
    photosApp = createPhotosApp({
      DB: env.DB,
      R2_IMAGES: env.R2_IMAGES,
      IMAGES: env.IMAGES,
    })
  }
  return photosApp
}

// Handles all /api/admin/photos/* routes
export const GET: APIRoute = async ({ request }) => {
  return getPhotosApp().fetch(request)
}

export const POST: APIRoute = async ({ request }) => {
  return getPhotosApp().fetch(request)
}

export const PATCH: APIRoute = async ({ request }) => {
  return getPhotosApp().fetch(request)
}

export const DELETE: APIRoute = async ({ request }) => {
  return getPhotosApp().fetch(request)
}
