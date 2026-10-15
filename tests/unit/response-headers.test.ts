import { describe, expect, it } from 'vitest'
import { addPreviewRobotsHeader } from '../../src/lib/response-headers'

describe('preview response headers', () => {
  it('noindexes workers.dev previews', () => {
    const response = addPreviewRobotsHeader(
      new Request('https://climb-log.kylieski.workers.dev/about/'),
      new Response('ok'),
    )

    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
  })

  it('does not noindex the custom domain', () => {
    const response = addPreviewRobotsHeader(
      new Request('https://kylies.photos/about/'),
      new Response('ok'),
    )

    expect(response.headers.has('X-Robots-Tag')).toBe(false)
  })
})
