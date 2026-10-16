import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ClimbTable from '../../src/components/ClimbTable'
import PhotoGallery from '../../src/components/PhotoGallery'

describe('server-rendered collection pages', () => {
  it('includes the first page of outings in HTML', () => {
    const html = renderToStaticMarkup(
      createElement(ClimbTable, {
        climbs: [
          {
            id: 'outing-1',
            date: '2026-02-15',
            title: 'Hike Horseplay Canyon',
            slug: null,
            preview_img_url: null,
            distance: 5.2,
            gain: 900,
            area: 'Garfield County',
            state: 'Utah',
            strava: null,
          },
        ],
      }),
    )

    expect(html).toContain('Hike Horseplay Canyon')
    expect(html).toContain('Garfield County')
  })

  it('renders the server-provided page and offers more from the collection', () => {
    const photos = Array.from({ length: 60 }, (_, index) => ({
      id: `photo-${index}`,
      url: `/img/photo-${index}/`,
      caption: `Mountain photo ${index}`,
      date: '2026-02-15',
      area: 'The mountains',
      state: null,
      width: 800,
      height: 600,
    }))

    const html = renderToStaticMarkup(createElement(PhotoGallery, { photos, total: 847 }))

    expect(html).toContain('Mountain photo 0')
    expect(html).toContain('Mountain photo 59')
    expect(html).toContain('Showing 60 of 847 photos')
    expect(html).toContain('Load more photos')
    expect(html).toContain('Show more photos')
    expect(html).toContain('Show larger photos')
  })
})
