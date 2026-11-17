import { env } from 'cloudflare:workers'
import type { APIRoute } from 'astro'
import { GEAR_IMAGE_WIDTHS, isGearPageId } from '../../../../lib/gear-images'
import { proxyGearImage } from '../../../../lib/photo-proxy'

export const prerender = false

const FILE = /^[0-9a-f]{12}\.(webp|png)$/

// Same-origin proxy for normalized gear images stored in photos-api.
export const GET: APIRoute = async ({ request, params }) => {
  const { id, file } = params
  const match = file ? FILE.exec(file) : null
  if (!isGearPageId(id) || !file || !match) return new Response('Not found', { status: 404 })

  const width = new URL(request.url).searchParams.get('w')
  if (match[1] === 'webp' && width !== null && !GEAR_IMAGE_WIDTHS.some(w => String(w) === width)) {
    return new Response('Invalid width', { status: 400 })
  }
  const search = match[1] === 'webp' && width ? `?w=${width}` : ''
  return proxyGearImage(request, id, file, search, env)
}
