import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'
import { proxyPhotoImage } from '../../lib/photo-proxy'

export const prerender = false

// Same-origin proxy so every published /img/{legacy-or-canonical-id} URL keeps
// resolving. photos-api resolves canonical IDs and every compatibility alias.
export const GET: APIRoute = async ({ request, params }) => {
  const photoId = params.id
  if (!photoId) return new Response('Missing photo ID', { status: 400 })
  return proxyPhotoImage(request, photoId, new URL(request.url).search, env)
}
