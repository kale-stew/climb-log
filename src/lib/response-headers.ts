export function addPreviewRobotsHeader(request: Request, response: Response): Response {
  if (!new URL(request.url).hostname.endsWith('.workers.dev')) return response

  const headers = new Headers(response.headers)
  headers.set('X-Robots-Tag', 'noindex, nofollow')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
