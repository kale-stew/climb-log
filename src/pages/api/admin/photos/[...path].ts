import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { createPhotosApp } from '../../../../../utils/photos-api'

export const prerender = false

// Handles all /api/admin/photos/* routes
export const GET: APIRoute = async ({ request }) => {
  const app = createPhotosApp({
    DB: env.DB as D1Database,
    R2_IMAGES: env.R2_IMAGES as R2Bucket,
    IMAGES: (env as any).IMAGES as ImagesBinding,
  })
  return app.fetch(request)
}

export const POST: APIRoute = async ({ request }) => {
  const app = createPhotosApp({
    DB: env.DB as D1Database,
    R2_IMAGES: env.R2_IMAGES as R2Bucket,
    IMAGES: (env as any).IMAGES as ImagesBinding,
  })
  return app.fetch(request)
}

export const PATCH: APIRoute = async ({ request }) => {
  const app = createPhotosApp({
    DB: env.DB as D1Database,
    R2_IMAGES: env.R2_IMAGES as R2Bucket,
    IMAGES: (env as any).IMAGES as ImagesBinding,
  })
  return app.fetch(request)
}

export const DELETE: APIRoute = async ({ request }) => {
  const app = createPhotosApp({
    DB: env.DB as D1Database,
    R2_IMAGES: env.R2_IMAGES as R2Bucket,
    IMAGES: (env as any).IMAGES as ImagesBinding,
  })
  return app.fetch(request)
}
