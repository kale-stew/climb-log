import type { APIRoute } from 'astro'
import { env } from 'cloudflare:workers'

// Valid size variants (pre-generated at migration time)
const VALID_SIZES = ['200', '800', '1600', 'original'] as const
type ImageSize = typeof VALID_SIZES[number]

// Content type mapping
const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
}

export const prerender = false

export const GET: APIRoute = async ({ params, request }) => {
  const R2_IMAGES = env.R2_IMAGES as R2Bucket | undefined
  const DB = env.DB as D1Database | undefined

  if (!R2_IMAGES) {
    return new Response('R2 bucket not configured', { status: 500 })
  }

  const key = params.key
  if (!key) {
    return new Response('Missing image key', { status: 400 })
  }

  // Parse size from query string (default: original)
  const url = new URL(request.url)
  const sizeParam = url.searchParams.get('size') || 'original'
  const size: ImageSize = VALID_SIZES.includes(sizeParam as ImageSize) 
    ? (sizeParam as ImageSize) 
    : 'original'

  // Try to redirect to new /img/ endpoint if key matches photos/{id}/ pattern
  if (DB && key.startsWith('photos/')) {
    const parts = key.split('/')
    if (parts.length >= 2) {
      const photoId = parts[1]
      // Verify photo exists
      const photo = await DB.prepare("SELECT id FROM photos WHERE id = ?").bind(photoId).first()
      if (photo) {
        const widthMap: Record<string, string> = { '200': '200', '800': '800', '1600': '1600', 'original': 'original' }
        const widthParam = widthMap[size]
        const redirectUrl = widthParam && widthParam !== 'original' 
          ? `/img/${photoId}?w=${widthParam}` 
          : `/img/${photoId}`
        return new Response(null, { 
          status: 301, 
          headers: { 
            'Location': redirectUrl,
            'Deprecation': 'true',
            'Sunset': 'Sat, 24 Nov 2026 00:00:00 GMT',
          } 
        })
      }
    }
  }

  // Legacy serving for non-photos/ keys or when photo not found
  let r2Key: string
  
  if (key.includes('/')) {
    // Structured path: photos/abc123/original.jpg -> photos/abc123/800.jpg
    const parts = key.split('/')
    const filename = parts.pop()!
    const ext = filename.split('.').pop() || 'jpg'
    const basePath = parts.join('/')
    r2Key = size === 'original' 
      ? `${basePath}/original.${ext}`
      : `${basePath}/${size}.${ext}`
  } else {
    // Simple key: image.jpg -> image-800.jpg
    const ext = key.split('.').pop() || 'jpg'
    const baseName = key.replace(/\.[^.]+$/, '')
    r2Key = size === 'original' 
      ? key 
      : `${baseName}-${size}.${ext}`
  }

  try {
    // Try to get the requested size, fall back to original
    let object = await R2_IMAGES.get(r2Key)
    
    if (!object && size !== 'original') {
      // Fall back to original if variant doesn't exist
      r2Key = key
      object = await R2_IMAGES.get(r2Key)
    }

    if (!object) {
      return new Response('Image not found', { status: 404 })
    }

    // Determine content type
    const ext = r2Key.split('.').pop()?.toLowerCase() || 'jpg'
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream'

    // Build response with cache headers
    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Cache-Control', 'public, max-age=31536000, immutable') // 1 year
    headers.set('ETag', object.etag)
    headers.set('Deprecation', 'true')
    headers.set('Sunset', 'Sat, 24 Nov 2026 00:00:00 GMT')
    
    // Add R2 metadata if available
    if (object.httpMetadata?.contentType) {
      headers.set('Content-Type', object.httpMetadata.contentType)
    }
    if (object.size) {
      headers.set('Content-Length', object.size.toString())
    }

    // Handle conditional requests
    const ifNoneMatch = request.headers.get('If-None-Match')
    if (ifNoneMatch === object.etag) {
      return new Response(null, { status: 304, headers })
    }

    return new Response(object.body, { headers })
  } catch (error) {
    console.error('Error fetching image from R2:', error)
    return new Response('Error fetching image', { status: 500 })
  }
}
