/**
 * Fetch wrapper with timeout support.
 * 
 * Workers have a 30-second CPU time limit, but external requests can hang
 * indefinitely without explicit timeouts. This utility ensures all external
 * calls have bounded execution time.
 */

/** Default timeout for external API calls (10 seconds) */
export const DEFAULT_TIMEOUT_MS = 10_000

/** Extended timeout for image downloads (30 seconds) */
export const IMAGE_TIMEOUT_MS = 30_000

/**
 * Error thrown when a fetch request times out.
 */
export class FetchTimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`Request to ${url} timed out after ${timeoutMs}ms`)
    this.name = 'FetchTimeoutError'
  }
}

/**
 * Fetch with an AbortSignal timeout.
 * 
 * @param url - The URL to fetch
 * @param options - Standard fetch options
 * @param timeoutMs - Timeout in milliseconds (default: 10s)
 * @returns The fetch Response
 * @throws FetchTimeoutError if the request times out
 * 
 * @example
 * ```ts
 * const res = await fetchWithTimeout('https://api.notion.com/v1/databases/...', {
 *   headers: { 'Authorization': `Bearer ${token}` }
 * }, 15_000)
 * ```
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new FetchTimeoutError(url, timeoutMs)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Fetch an image with extended timeout.
 * 
 * @param url - The image URL to fetch
 * @param timeoutMs - Timeout in milliseconds (default: 30s)
 * @returns The fetch Response
 */
export async function fetchImage(
  url: string,
  timeoutMs: number = IMAGE_TIMEOUT_MS
): Promise<Response> {
  return fetchWithTimeout(url, {}, timeoutMs)
}
