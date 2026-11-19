import { describe, expect, it } from 'vitest'
import { HIKE_POST_SLUGS, hikePostPath } from '../../src/lib/blog-posts'
import { outingHref } from '../../src/lib/places'

describe('hikePostPath', () => {
  it('knows the trip reports in the repo', () => {
    expect(HIKE_POST_SLUGS.has('solo-citadel')).toBe(true)
    expect(HIKE_POST_SLUGS.has('first-grand-traverse')).toBe(true)
  })

  it('links only to posts that exist', () => {
    expect(hikePostPath('solo-citadel')).toBe('/blog/hike/solo-citadel')
    expect(hikePostPath('solo-shavano')).toBeNull()
    expect(hikePostPath(null)).toBeNull()
    expect(hikePostPath('', new Set(['']))).toBeNull()
  })

  it('sends outings with a missing post to their journal entry', () => {
    expect(outingHref({ id: 'abc', slug: 'hiking-with-goats' })).toBe('/journal?outing=abc')
    expect(outingHref({ id: 'abc', slug: 'solo-citadel' })).toBe('/blog/hike/solo-citadel')
  })
})
