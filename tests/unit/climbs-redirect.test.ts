import { describe, expect, it } from 'vitest'
import { GET } from '../../src/pages/climbs'

describe('/climbs redirect', () => {
  it('sends old journal links to /journal with their query string', async () => {
    const url = new URL('https://kylies.photos/climbs?outing=abc&page=2')
    const redirect = (location: string, status: number) =>
      new Response(null, { status, headers: { Location: location } })
    const response = await GET({ url, redirect } as unknown as Parameters<typeof GET>[0])

    expect(response.status).toBe(301)
    expect(response.headers.get('Location')).toBe('/journal?outing=abc&page=2')
  })
})
