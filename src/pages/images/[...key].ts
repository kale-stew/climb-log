import type { APIRoute } from 'astro'

export const prerender = false

const WIDTHS = new Set(['200', '800', '1600'])

// Legacy R2 paths (`/images/photos/{id}/...`) redirect to the canonical
// /img/{id} route. Local bucket storage is retired.
export const GET: APIRoute = async ({ params, request }) => {
  const [prefix, photoId] = (params.key ?? '').split('/')
  if (prefix !== 'photos' || !photoId) return new Response('Image not found', { status: 404 })

  const size = new URL(request.url).searchParams.get('size') ?? ''
  const location = WIDTHS.has(size) ? `/img/${photoId}/?w=${size}` : `/img/${photoId}/`
  return new Response(null, {
    status: 301,
    headers: { Location: location, Deprecation: 'true' },
  })
}
