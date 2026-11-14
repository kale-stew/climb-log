import { describe, expect, it, vi } from 'vitest'
import {
  imageSearch,
  photoImagePath,
  resolvePhotoImage,
  resolvePhotoPage,
} from '../../src/lib/photo-pages'
import { ensurePhotoSlug } from '../../src/lib/photo-slugs'
import { sqliteD1 } from '../helpers/sqlite-d1'

const migration = 'migrations/0008_photo_slugs.sql'
const origin = 'https://photos.example'

interface ApiPhoto {
  id: string
  title: string
  date: string
  visibility: string
  site: string
}

// photos-api resolves canonical IDs and aliases; this fake knows one alias.
function photosApi(photos: ApiPhoto[], aliases: Record<string, string> = {}) {
  return vi.fn(async (input: URL | RequestInfo) => {
    const identifier = decodeURIComponent(new URL(String(input)).pathname.split('/').pop() ?? '')
    const photo = photos.find(candidate => candidate.id === (aliases[identifier] ?? identifier))
    return photo ? Response.json(photo) : new Response('Not found', { status: 404 })
  }) as unknown as typeof fetch
}

const tunnel: ApiPhoto = {
  id: 'abc123def456',
  title: 'Tunnel View',
  date: '2019-07-04',
  visibility: 'public',
  site: 'both',
}

describe('resolvePhotoPage', () => {
  it('renders a photo at its current slug', async () => {
    const db = sqliteD1([migration])
    await ensurePhotoSlug(db, tunnel)
    const result = await resolvePhotoPage(db, origin, 'tunnel-view', photosApi([tunnel]))
    expect(result.kind).toBe('photo')
    expect(result.kind === 'photo' && result.photo.title).toBe('Tunnel View')
  })

  it('redirects canonical IDs and legacy aliases to the slug, issuing it on first visit', async () => {
    const db = sqliteD1([migration])
    const api = photosApi([tunnel], { '991d0662': tunnel.id })
    expect(await resolvePhotoPage(db, origin, tunnel.id, api)).toEqual({
      kind: 'redirect',
      slug: 'tunnel-view',
    })
    expect(await resolvePhotoPage(db, origin, '991d0662', api)).toEqual({
      kind: 'redirect',
      slug: 'tunnel-view',
    })
  })

  it('redirects to a new slug after the title changes, and from the old slug too', async () => {
    const db = sqliteD1([migration])
    await ensurePhotoSlug(db, tunnel)
    const api = photosApi([{ ...tunnel, title: 'Tunnel View at Dawn' }])
    expect(await resolvePhotoPage(db, origin, 'tunnel-view', api)).toEqual({
      kind: 'redirect',
      slug: 'tunnel-view-at-dawn',
    })
    expect((await resolvePhotoPage(db, origin, 'tunnel-view-at-dawn', api)).kind).toBe('photo')
    expect(await resolvePhotoPage(db, origin, 'tunnel-view', api)).toEqual({
      kind: 'redirect',
      slug: 'tunnel-view-at-dawn',
    })
  })

  it('hides photos that are not public on kylies.photos', async () => {
    const db = sqliteD1([migration])
    await ensurePhotoSlug(db, tunnel)
    for (const change of [{ visibility: 'unlisted' }, { site: 'kylieis-online' }]) {
      const api = photosApi([{ ...tunnel, ...change }])
      expect(await resolvePhotoPage(db, origin, 'tunnel-view', api)).toEqual({ kind: 'not-found' })
      expect(await resolvePhotoPage(db, origin, tunnel.id, api)).toEqual({ kind: 'not-found' })
    }
  })

  it('returns not found for unknown paths without issuing slugs', async () => {
    const db = sqliteD1([migration])
    expect(await resolvePhotoPage(db, origin, 'no-such-photo', photosApi([tunnel]))).toEqual({
      kind: 'not-found',
    })
    expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM photo_slugs').get()).toEqual({ n: 0 })
  })
})

describe('slugged image URLs', () => {
  it('serves the current slug and redirects old ones', async () => {
    const db = sqliteD1([migration])
    await ensurePhotoSlug(db, tunnel)
    await ensurePhotoSlug(db, { ...tunnel, title: 'Tunnel View at Dawn' })
    expect(await resolvePhotoImage(db, 'tunnel-view-at-dawn')).toEqual({
      kind: 'image',
      photoId: tunnel.id,
    })
    expect(await resolvePhotoImage(db, 'tunnel-view')).toEqual({
      kind: 'redirect',
      slug: 'tunnel-view-at-dawn',
    })
    expect(await resolvePhotoImage(db, 'nope')).toEqual({ kind: 'not-found' })
    expect(await resolvePhotoImage(db, '../etc')).toEqual({ kind: 'not-found' })
  })

  it('maps the extension to a format and defaults the width', () => {
    expect(imageSearch(new URL('https://kylies.photos/photos/a.jpg'), 'jpg')).toBe(
      '?w=1600&format=jpeg',
    )
    expect(
      imageSearch(new URL('https://kylies.photos/photos/a.webp?w=800&v=abc&x=1'), 'webp'),
    ).toBe('?w=800&format=webp&v=abc')
  })

  it('builds versioned image paths', () => {
    expect(photoImagePath('tunnel-view', 'webp', 800, 'a1b2c3')).toBe(
      '/photos/tunnel-view.webp?w=800&v=a1b2c3',
    )
    expect(photoImagePath('tunnel-view', 'jpg', 1600, null)).toBe('/photos/tunnel-view.jpg?w=1600')
  })
})
