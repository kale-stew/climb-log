import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { createPhotosApp } from '../../../../utils/photos-api'

export const prerender = false

/**
 * Create the photos Hono app with bindings from the Cloudflare environment.
 * Factored out to avoid duplication across HTTP methods.
 */
function getPhotosApp() {
  return createPhotosApp({
    DB: env.DB,
    R2_IMAGES: env.R2_IMAGES,
    IMAGES: env.IMAGES,
  })
}

// Handles all /api/photos/* routes
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
