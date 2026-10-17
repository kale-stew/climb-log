import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'

export const prerender = false

// Same-origin proxy so every published /img/{legacy-or-canonical-id} URL keeps
// resolving. photos-api resolves canonical IDs and every compatibility alias.
export const GET: APIRoute = async ({ request, params }) => {
  const photoId = params.id
  if (!photoId) return new Response('Missing photo ID', { status: 400 })
  if (!env.PHOTOS_API_ORIGIN) return new Response('Photo service not configured', { status: 503 })

  const upstreamUrl = new URL(`/img/${encodeURIComponent(photoId)}`, env.PHOTOS_API_ORIGIN)
  upstreamUrl.search = new URL(request.url).search
  const upstreamRequest = new Request(upstreamUrl, request)

  try {
    return env.PHOTOS_API ? await env.PHOTOS_API.fetch(upstreamRequest) : await fetch(upstreamRequest)
  } catch (error) {
    console.error('Canonical image request failed:', error)
    return new Response('Photo service unavailable', { status: 502 })
  }
}
