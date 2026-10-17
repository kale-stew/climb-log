import { fetchWithTimeout } from './fetch-with-timeout'

const OG_WIDTH = 1600
const MAX_IMAGE_BYTES = 4 * 1024 * 1024

/**
 * Resolve a preview image reference to a URL the OG renderer can decode.
 * Same-origin `/img/{id}` references become absolute photos-api JPEG transforms
 * because the renderer cannot fetch relative URLs. The canonical service may
 * return WebP when a JPEG transform is unavailable, so those responses are
 * also accepted and inlined.
 */
export function ogImageSource(reference: string, photosApiOrigin: string | undefined): string | null {
  const photoId = reference.match(/^\/img\/([^/?#]+)/)?.[1]
  if (photoId) {
    if (!photosApiOrigin) return null
    const url = new URL(`/img/${photoId}`, photosApiOrigin)
    url.searchParams.set('w', String(OG_WIDTH))
    url.searchParams.set('format', 'jpeg')
    return url.toString()
  }
  try {
    const url = new URL(reference)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}

/** Fetch an image and inline it so rendering never depends on a second fetch. */
export async function fetchImageDataUri(url: string, images?: ImagesBinding): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(url, { headers: { Accept: 'image/jpeg,image/png' } })
    let imageResponse = response
    let contentType = response.headers.get('content-type')?.split(';')[0] ?? ''
    if (!response.ok || !['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) return null

    // The canonical service normally honors format=jpeg, but older deployments
    // can still return WebP. Convert it before passing it to workers-og.
    if (contentType === 'image/webp' && images && response.body) {
      const transformed = await images.input(response.body).output({ format: 'image/jpeg', quality: 85 })
      imageResponse = transformed.response()
      contentType = 'image/jpeg'
    }

    const bytes = new Uint8Array(await imageResponse.arrayBuffer())
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) return null

    let binary = ''
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
    }
    return `data:${contentType};base64,${btoa(binary)}`
  } catch (error) {
    console.error('Failed to fetch OG image:', error)
    return null
  }
}
