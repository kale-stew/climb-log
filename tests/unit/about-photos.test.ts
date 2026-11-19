import { describe, expect, it } from 'vitest'
import { aboutPhotoPool, fillAboutStep, type PhotoCollectionsRpc } from '../../src/lib/about-photos'
import type { DisplayPhoto } from '../../src/lib/photos-client'

const photo = (id: string, tags: string | null = null) => ({ id, tags }) as DisplayPhoto
const general = [photo('a', '["kylie"]'), photo('b', '["ridge"]')]

function collectionFetch(photos: Array<{ id: string }>, status = 200): typeof fetch {
  return (async () =>
    new Response(JSON.stringify({ photos, meta: { count: photos.length, total: photos.length } }), {
      status,
    })) as unknown as typeof fetch
}

describe('aboutPhotoPool', () => {
  it('uses the about collection, hidden photos included', async () => {
    const pool = await aboutPhotoPool(
      'https://photos.test',
      general,
      collectionFetch([{ id: 'hidden' }]),
    )
    expect(pool.map(p => p.id)).toEqual(['hidden'])
  })

  it('falls back to kylie-tagged photos when the collection is empty or down', async () => {
    expect(
      (await aboutPhotoPool('https://photos.test', general, collectionFetch([]))).map(p => p.id),
    ).toEqual(['a'])
    expect(
      (await aboutPhotoPool('https://photos.test', general, collectionFetch([], 500))).map(
        p => p.id,
      ),
    ).toEqual(['a'])
  })
})

describe('fillAboutStep', () => {
  it('is skipped in astro dev so local runs never write to production photos-api', async () => {
    let called = false
    const rpc: PhotoCollectionsRpc = {
      fillAboutCollection: async () => {
        called = true
        return { added: [], total: 0 }
      },
    }
    expect(await fillAboutStep(rpc, true)).toBeNull()
    expect(called).toBe(false)
  })

  it('reports added photos as inserted', async () => {
    const rpc: PhotoCollectionsRpc = {
      fillAboutCollection: async () => ({ added: ['x', 'y'], total: 18 }),
    }
    expect(await fillAboutStep(rpc, false)).toMatchObject({
      table: 'about_photos',
      inserted: 2,
      errors: [],
    })
  })

  it('reports a missing binding or RPC failure without throwing', async () => {
    expect((await fillAboutStep(undefined, false))?.errors).toEqual([
      'PHOTO_COLLECTIONS service binding is not configured',
    ])
    const rpc: PhotoCollectionsRpc = {
      fillAboutCollection: async () => {
        throw new Error('boom')
      },
    }
    expect((await fillAboutStep(rpc, false))?.errors).toEqual([
      'Failed to fill the about collection: boom',
    ])
  })
})
