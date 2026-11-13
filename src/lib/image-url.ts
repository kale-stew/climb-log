// Previews are stored as 200px thumbnails (older rows as /img/{id}/?w=200). Request
// the width each surface needs, and drop the trailing slash so the request
// skips a redirect.
export function sizedImageUrl(url: string, width: number): string {
  if (!url.startsWith('/img/')) return url
  const path = url.replace(/\/(?=\?|$)/, '')
  if (/[?&]w=\d+/.test(path)) return path.replace(/([?&]w=)\d+/, (_, prefix) => `${prefix}${width}`)
  return `${path}${path.includes('?') ? '&' : '?'}w=${width}`
}
