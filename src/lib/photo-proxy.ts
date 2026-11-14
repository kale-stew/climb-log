/**
 * Fetch an image from photos-api through the service binding, falling back to
 * the public origin. `search` carries transform parameters such as `w`,
 * `format`, and the cache-busting `v`.
 */
export async function proxyPhotoImage(
  request: Request,
  photoId: string,
  search: string,
  runtimeEnv: { PHOTOS_API_ORIGIN?: string; PHOTOS_API?: Fetcher },
): Promise<Response> {
  if (!runtimeEnv.PHOTOS_API_ORIGIN)
    return new Response('Photo service not configured', { status: 503 })

  const upstreamUrl = new URL(`/img/${encodeURIComponent(photoId)}`, runtimeEnv.PHOTOS_API_ORIGIN)
  upstreamUrl.search = search
  const upstreamRequest = new Request(upstreamUrl, request)

  try {
    if (runtimeEnv.PHOTOS_API) {
      try {
        const serviceResponse = await runtimeEnv.PHOTOS_API.fetch(upstreamRequest)
        if (serviceResponse.ok) return serviceResponse
        console.warn(
          `Photos API service binding returned ${serviceResponse.status}; falling back to origin`,
        )
      } catch (error) {
        console.warn('Photos API service binding failed; falling back to origin:', error)
      }
    }

    return await fetch(upstreamRequest)
  } catch (error) {
    console.error('Canonical image request failed:', error)
    return new Response('Photo service unavailable', { status: 502 })
  }
}
