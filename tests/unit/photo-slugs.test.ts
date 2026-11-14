import { describe, expect, it } from 'vitest'
import {
  candidateSlugs,
  currentSlugs,
  ensurePhotoSlug,
  isSlugShaped,
  resolveSlug,
  slugify,
  syncPhotoSlugs,
} from '../../src/lib/photo-slugs'
import { sqliteD1 } from '../helpers/sqlite-d1'

const migration = 'migrations/0008_photo_slugs.sql'

describe('slugify', () => {
  it('turns real titles into readable slugs', () => {
    expect(slugify('Tunnel View')).toBe('tunnel-view')
    expect(slugify('“Point of No Return”')).toBe('point-of-no-return')
    expect(slugify('Angel’s Landing View')).toBe('angels-landing-view')
    expect(slugify('Coffeepot & Potosi Peaks')).toBe('coffeepot-and-potosi-peaks')
    expect(slugify('Cottonwood Lake #3')).toBe('cottonwood-lake-3')
    expect(slugify('Hanakāpīʻai Falls, Oʻahu')).toBe('hanakapiai-falls-oahu')
    expect(slugify('Lower South Falls, up close')).toBe('lower-south-falls-up-close')
  })

  it('returns an empty string for titles with no usable characters', () => {
    expect(slugify(null)).toBe('')
    expect(slugify('   ')).toBe('')
    expect(slugify('🏔️')).toBe('')
  })

  it('caps long titles at a word boundary', () => {
    const slug = slugify(
      'A very long title about walking along a ridge for most of a day in late September weather',
    )
    expect(slug.length).toBeLessThanOrEqual(80)
    expect(slug.endsWith('-')).toBe(false)
    expect(isSlugShaped(slug)).toBe(true)
  })

  it('recognizes slug-shaped paths only', () => {
    expect(isSlugShaped('tunnel-view-2019')).toBe(true)
    expect(isSlugShaped('Tunnel-View')).toBe(false)
    expect(isSlugShaped('tunnel--view')).toBe(false)
    expect(isSlugShaped('tunnel-view.jpg')).toBe(false)
  })
})

describe('candidateSlugs', () => {
  it('prefers the base, then the year, then a counter', () => {
    expect(candidateSlugs('tunnel-view', '2019-07-04').slice(0, 4)).toEqual([
      'tunnel-view',
      'tunnel-view-2019',
      'tunnel-view-2019-2',
      'tunnel-view-2019-3',
    ])
    expect(candidateSlugs('tunnel-view', null).slice(0, 3)).toEqual([
      'tunnel-view',
      'tunnel-view-2',
      'tunnel-view-3',
    ])
  })
})

describe('ensurePhotoSlug', () => {
  it('issues a slug once and reuses it', async () => {
    const db = sqliteD1([migration])
    const photo = { id: 'a1', title: 'Tunnel View', date: '2019-07-04' }
    expect(await ensurePhotoSlug(db, photo)).toBe('tunnel-view')
    expect(await ensurePhotoSlug(db, photo)).toBe('tunnel-view')
    expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM photo_slugs').get()).toEqual({ n: 1 })
  })

  it('disambiguates shared titles by year, then counter', async () => {
    const db = sqliteD1([migration])
    expect(await ensurePhotoSlug(db, { id: 'a', title: 'Tunnel View', date: '2019-07-04' })).toBe(
      'tunnel-view',
    )
    expect(await ensurePhotoSlug(db, { id: 'b', title: 'Tunnel View', date: '2021-05-01' })).toBe(
      'tunnel-view-2021',
    )
    expect(await ensurePhotoSlug(db, { id: 'c', title: 'Tunnel View', date: '2021-05-02' })).toBe(
      'tunnel-view-2021-2',
    )
    expect(await ensurePhotoSlug(db, { id: 'd', title: 'Tunnel View', date: null })).toBe(
      'tunnel-view-2',
    )
  })

  it('issues a new slug when the title changes and redirects the old one', async () => {
    const db = sqliteD1([migration])
    await ensurePhotoSlug(db, { id: 'a', title: 'Fog Bank', date: '2020-01-01' })
    expect(
      await ensurePhotoSlug(db, { id: 'a', title: 'Fog over Tomales Bay', date: '2020-01-01' }),
    ).toBe('fog-over-tomales-bay')
    expect(await resolveSlug(db, 'fog-bank')).toEqual({
      photoId: 'a',
      currentSlug: 'fog-over-tomales-bay',
    })
    expect(await resolveSlug(db, 'fog-over-tomales-bay')).toEqual({
      photoId: 'a',
      currentSlug: 'fog-over-tomales-bay',
    })
  })

  it('reuses the earlier slug when a title changes back', async () => {
    const db = sqliteD1([migration])
    await ensurePhotoSlug(db, { id: 'a', title: 'Fog Bank', date: null })
    await ensurePhotoSlug(db, { id: 'a', title: 'Fog over Tomales Bay', date: null })
    expect(await ensurePhotoSlug(db, { id: 'a', title: 'Fog Bank', date: null })).toBe('fog-bank')
    expect(db.sqlite.prepare('SELECT COUNT(*) AS n FROM photo_slugs').get()).toEqual({ n: 2 })
    expect(await resolveSlug(db, 'fog-over-tomales-bay')).toEqual({
      photoId: 'a',
      currentSlug: 'fog-bank',
    })
  })

  it('never hands a retired slug to a different photo', async () => {
    const db = sqliteD1([migration])
    await ensurePhotoSlug(db, { id: 'a', title: 'Sunset', date: '2020-01-01' })
    await ensurePhotoSlug(db, { id: 'a', title: 'Sunset at Pillar Point', date: '2020-01-01' })
    expect(await ensurePhotoSlug(db, { id: 'b', title: 'Sunset', date: '2022-01-01' })).toBe(
      'sunset-2022',
    )
    expect(await resolveSlug(db, 'sunset')).toEqual({
      photoId: 'a',
      currentSlug: 'sunset-at-pillar-point',
    })
  })

  it('falls back to a generic slug for untitled photos', async () => {
    const db = sqliteD1([migration])
    expect(await ensurePhotoSlug(db, { id: 'a', title: null, date: '2020-01-01' })).toBe('photo')
    expect(await ensurePhotoSlug(db, { id: 'b', title: '', date: '2020-01-01' })).toBe('photo-2020')
  })

  it('keeps exactly one current slug per photo', async () => {
    const db = sqliteD1([migration])
    for (const title of ['One', 'Two', 'Three', 'Two'])
      await ensurePhotoSlug(db, { id: 'a', title, date: null })
    expect(
      db.sqlite.prepare('SELECT COUNT(*) AS n FROM photo_slugs WHERE is_current = 1').get(),
    ).toEqual({ n: 1 })
  })
})

describe('resolveSlug and currentSlugs', () => {
  it('returns null for unknown slugs', async () => {
    const db = sqliteD1([migration])
    expect(await resolveSlug(db, 'nope')).toBeNull()
  })

  it('looks up current slugs in batches', async () => {
    const db = sqliteD1([migration])
    const photos = Array.from({ length: 200 }, (_, index) => ({
      id: `p${index}`,
      title: `Photo ${index}`,
      date: null,
    }))
    for (const photo of photos) await ensurePhotoSlug(db, photo)
    const slugs = await currentSlugs(
      db,
      photos.map(photo => photo.id),
    )
    expect(slugs.size).toBe(200)
    expect(slugs.get('p150')).toBe('photo-150')
  })
})

describe('syncPhotoSlugs', () => {
  it('gives the oldest photo with a shared title the plain slug', async () => {
    const db = sqliteD1([migration])
    const result = await syncPhotoSlugs(db, [
      { id: 'new', title: 'River Crossing', date: '2024-08-01' },
      { id: 'old', title: 'River Crossing', date: '2018-06-01' },
    ])
    expect(result).toEqual({ checked: 2, issued: 2, errors: [] })
    const slugs = await currentSlugs(db, ['new', 'old'])
    expect(slugs.get('old')).toBe('river-crossing')
    expect(slugs.get('new')).toBe('river-crossing-2024')
  })

  it('counts only photos whose slug changed on a rerun', async () => {
    const db = sqliteD1([migration])
    await syncPhotoSlugs(db, [
      { id: 'a', title: 'One', date: null },
      { id: 'b', title: 'Two', date: null },
    ])
    const result = await syncPhotoSlugs(db, [
      { id: 'a', title: 'One', date: null },
      { id: 'b', title: 'Two again', date: null },
    ])
    expect(result).toEqual({ checked: 2, issued: 1, errors: [] })
  })
})
