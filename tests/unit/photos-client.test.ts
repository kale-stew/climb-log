import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adaptCanonicalPhoto, clearPhotosCache, getCanonicalPhoto, getCanonicalPhotos } from '../../src/lib/photos-client'

const photo = {
  id: 'canonical-1',
  title: 'A photo',
  caption: null,
  location: 'Bridger-Teton - Wyoming',
  date: '2026-02-15',
  width: 1200,
  height: 800,
  blurhash: null,
  accent_color: '#123456',
  tags: '["snow"]',
  r2_key: 'photos/canonical-1',
}

beforeEach(clearPhotosCache)

describe('photos client', () => {
  it('adapts canonical location and image fields', () => {
    expect(adaptCanonicalPhoto(photo)).toMatchObject({
      id: 'canonical-1',
      url: '/img/canonical-1',
      area: 'Bridger-Teton',
      state: 'Wyoming',
    })
  })

  it('paginates canonical responses', async () => {
    const fetchFn = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(input instanceof Request ? input.url : input.toString())
      const offset = Number(url.searchParams.get('offset'))
      const count = offset === 0 ? 100 : 20
      return Response.json({
        photos: Array.from({ length: count }, (_, index) => ({ ...photo, id: `${offset + index}` })),
        meta: { count },
      })
    }) as typeof fetch

    const photos = await getCanonicalPhotos('https://photos.example', {
      limit: 120,
      ttlMs: 0,
      fetchFn,
    })

    expect(photos).toHaveLength(120)
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('degrades to an empty list when upstream fails', async () => {
    const fetchFn = vi.fn(async () => new Response('nope', { status: 503 })) as typeof fetch
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(getCanonicalPhotos('https://photos.example', { fetchFn, ttlMs: 0 })).resolves.toEqual([])
    error.mockRestore()
  })

  it('resolves one canonical photo by alias', async () => {
    const fetchFn = vi.fn(async () => Response.json(photo)) as typeof fetch

    await expect(getCanonicalPhoto('https://photos.example', 'legacy-alias', { fetchFn }))
      .resolves.toMatchObject({ id: 'canonical-1', area: 'Bridger-Teton' })
    expect(fetchFn).toHaveBeenCalledWith(
      new URL('https://photos.example/api/photos/legacy-alias'),
      expect.any(Object)
    )
  })

})
