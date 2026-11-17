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

/** photos-api answers a superseded gear version with a redirect to the current one. */
function rewriteGearRedirect(response: Response): Response {
  const location = response.headers.get('Location')
  if (!location) return response
  const upstreamPath = new URL(location, 'https://photos-api.invalid')
  if (!upstreamPath.pathname.startsWith('/gear/')) return response
  const headers = new Headers(response.headers)
  headers.set(
    'Location',
    `/gear/img/${upstreamPath.pathname.slice('/gear/'.length)}${upstreamPath.search}`,
  )
  return new Response(null, { status: response.status, headers })
}

/**
 * Fetch a gear image from photos-api through the service binding, falling back
 * to the public origin. Redirects to a newer version are passed through with
 * the same-origin path.
 */
export async function proxyGearImage(
  request: Request,
  pageId: string,
  file: string,
  search: string,
  runtimeEnv: { PHOTOS_API_ORIGIN?: string; PHOTOS_API?: Fetcher },
): Promise<Response> {
  if (!runtimeEnv.PHOTOS_API_ORIGIN)
    return new Response('Photo service not configured', { status: 503 })

  const upstreamUrl = new URL(
    `/gear/${encodeURIComponent(pageId)}/${encodeURIComponent(file)}`,
    runtimeEnv.PHOTOS_API_ORIGIN,
  )
  upstreamUrl.search = search
  const upstream = () =>
    new Request(upstreamUrl, { method: 'GET', headers: request.headers, redirect: 'manual' })
  const usable = (response: Response) =>
    response.ok || (response.status >= 300 && response.status < 400) || response.status === 404

  try {
    if (runtimeEnv.PHOTOS_API) {
      try {
        const serviceResponse = await runtimeEnv.PHOTOS_API.fetch(upstream())
        if (usable(serviceResponse)) return rewriteGearRedirect(serviceResponse)
        console.warn(
          `Photos API service binding returned ${serviceResponse.status} for a gear image; falling back to origin`,
        )
      } catch (error) {
        console.warn(
          'Photos API service binding failed for a gear image; falling back to origin:',
          error,
        )
      }
    }
    return rewriteGearRedirect(await fetch(upstream()))
  } catch (error) {
    console.error('Gear image request failed:', error)
    return new Response('Photo service unavailable', { status: 502 })
  }
}
