import { describe, expect, it } from 'vitest'
import {
  asset,
  calendarMonth,
  cropFraction,
  cropNote,
  defaultPrintSize,
  effectiveDpi,
  formatShortDate,
  groupPrintSizes,
  imagePhotoIds,
  isFullFrame,
  largestPrintSize,
  MIN_PRINT_DPI,
  mockup,
  PRINT_SIZES,
  PRINTS,
  PRODUCTS,
  photo,
  printableSizes,
  productCta,
  productState,
  quickViewSlug,
  requestMailto,
  resolveImages,
  sizeShape,
} from '../../src/lib/shop'

const size = (label: string) => {
  const found = PRINT_SIZES.find(entry => entry.label === label)
  if (!found) throw new Error(`missing size ${label}`)
  return found
}

describe('effectiveDpi', () => {
  it('uses the full frame when aspect ratios match', () => {
    expect(effectiveDpi(6000, 4000, size('8×12'))).toBe(500)
  })

  it('ignores orientation', () => {
    expect(effectiveDpi(4000, 6000, size('8×12'))).toBe(effectiveDpi(6000, 4000, size('8×12')))
  })

  it('accounts for cropping to a squarer print', () => {
    // A 3:1 panorama cropped to 5:4 keeps only 3750px of its long edge.
    expect(effectiveDpi(9000, 3000, size('8×10'))).toBe(375)
  })

  it('returns 0 for missing dimensions', () => {
    expect(effectiveDpi(0, 4000, size('8×10'))).toBe(0)
  })
})

describe('printableSizes', () => {
  it('offers every size for a 54MP original', () => {
    expect(printableSizes(9000, 6000)).toHaveLength(PRINT_SIZES.length)
  })

  it('caps a 12MP phone photo at mid sizes', () => {
    const labels = printableSizes(4032, 3024).map(entry => entry.label)
    expect(labels).toContain('12×16')
    expect(labels).not.toContain('20×30')
  })

  it('offers nothing for web-sized images', () => {
    expect(printableSizes(766, 768)).toEqual([])
  })

  it('offers nothing when dimensions are unknown', () => {
    expect(printableSizes(null, 4000)).toEqual([])
  })

  it('respects a stricter threshold', () => {
    expect(printableSizes(4032, 3024, 300).length).toBeLessThan(
      printableSizes(4032, 3024, MIN_PRINT_DPI).length,
    )
  })
})

describe('catalog', () => {
  it('uses unique product slugs and print photos', () => {
    expect(new Set(PRODUCTS.map(product => product.slug)).size).toBe(PRODUCTS.length)
    expect(new Set(PRINTS.map(print => print.photoId)).size).toBe(PRINTS.length)
  })

  it('references canonical 12-character photo IDs', () => {
    const ids = [
      ...PRODUCTS.flatMap(product => imagePhotoIds(product.images)),
      ...PRINTS.flatMap(print => [print.photoId, ...imagePhotoIds(print.images ?? [])]),
    ]
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{12}$/)
  })

  it('gives every product a cover image', () => {
    for (const product of PRODUCTS) expect(product.images.length).toBeGreaterThan(0)
  })

  it('sets a valid month on every calendar page mockup', () => {
    const months = PRODUCTS.flatMap(product => product.images).flatMap(image =>
      image.kind === 'mockup' && image.template === 'calendar-month' ? [image.month] : [],
    )
    for (const month of months)
      expect(month).toSatisfy(m => Number.isInteger(m) && m >= 1 && m <= 12)
  })

  it('serves static product shots from public/shop/', () => {
    const assets = [
      ...PRODUCTS.flatMap(product => product.images),
      ...PRINTS.flatMap(print => print.images ?? []),
    ]
    for (const image of assets) if (image.kind === 'asset') expect(image.src).toMatch(/^\/shop\//)
  })

  it('uses unique quick-view slugs', () => {
    const slugs = [...PRODUCTS.map(quickViewSlug), ...PRINTS.map(quickViewSlug)]
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})

describe('shop images', () => {
  const images = [
    mockup('calendar-cover', 'aaaaaaaaaaaa'),
    photo('bbbbbbbbbbbb'),
    asset('/shop/proof.jpg', 'The printed proof', 1600, 1200),
  ]

  it('collects photo IDs from photos and mockups but not assets', () => {
    expect(imagePhotoIds(images)).toEqual(['aaaaaaaaaaaa', 'bbbbbbbbbbbb'])
  })

  it('drops images whose photo failed to load and keeps assets', () => {
    const resolved = resolveImages(images, new Map([['aaaaaaaaaaaa', { id: 'aaaaaaaaaaaa' }]]))
    expect(resolved.map(entry => entry.image.kind)).toEqual(['mockup', 'asset'])
    expect(resolved[1].photo).toBeNull()
  })
})

describe('calendarMonth', () => {
  it('starts January 2027 on a Friday', () => {
    const { name, weeks } = calendarMonth(2027, 1)
    expect(name).toBe('January')
    expect(weeks[0]).toEqual([null, null, null, null, null, 1, 2])
    expect(weeks.flat().filter(Boolean)).toHaveLength(31)
  })

  it('pads every week to seven days', () => {
    for (let month = 1; month <= 12; month++) {
      for (const week of calendarMonth(2027, month).weeks) expect(week).toHaveLength(7)
    }
  })

  it('handles February in a non-leap year', () => {
    expect(calendarMonth(2027, 2).weeks.flat().filter(Boolean)).toHaveLength(28)
  })
})

describe('requestMailto', () => {
  it('encodes spaces as %20 so mail clients do not show plus signs', () => {
    const href = requestMailto('Preorder: 2027 Wall Calendar', 'Quantity: 1')
    expect(href).toMatch(/^mailto:hi@kylies\.photos\?/)
    expect(href).not.toContain('+')
    expect(href).toContain('Preorder%3A%202027%20Wall%20Calendar')
  })
})

describe('print size shapes', () => {
  it('labels shapes as reduced ratios', () => {
    expect(sizeShape(size('16×24'))).toBe('2:3')
    expect(sizeShape(size('8×10'))).toBe('4:5')
    expect(sizeShape(size('18×24'))).toBe('3:4')
  })

  it('recognizes full-frame sizes in either orientation', () => {
    expect(isFullFrame(6000, 4000, size('8×12'))).toBe(true)
    expect(isFullFrame(4000, 6000, size('8×12'))).toBe(true)
    expect(isFullFrame(6000, 4000, size('8×10'))).toBe(false)
  })

  it('defaults to the smallest full-frame size, not the smallest size', () => {
    expect(defaultPrintSize(6000, 4000, PRINT_SIZES)?.label).toBe('8×12')
    expect(defaultPrintSize(4032, 3024, PRINT_SIZES)?.label).toBe('12×16')
  })

  it('falls back to the smallest size when no shape matches', () => {
    expect(defaultPrintSize(9000, 3000, PRINT_SIZES)?.label).toBe('8×10')
  })

  it('puts full-frame groups first', () => {
    const groups = groupPrintSizes(6000, 4000, PRINT_SIZES)
    expect(groups[0]).toMatchObject({ shape: '2:3', fullFrame: true })
    expect(groups[0].sizes.map(entry => entry.label)).toEqual(['8×12', '12×18', '16×24', '20×30'])
    expect(groups.slice(1).every(group => !group.fullFrame)).toBe(true)
  })

  it('finds the largest size by area', () => {
    expect(largestPrintSize(PRINT_SIZES)?.label).toBe('20×30')
  })
})

describe('cropFraction', () => {
  it('keeps the whole frame for a matching shape', () => {
    expect(cropFraction(6000, 4000, size('12×18'))).toEqual({ width: 1, height: 1 })
  })

  it('trims the sides of a landscape photo printed squarer', () => {
    const crop = cropFraction(6000, 4000, size('8×10'))
    expect(crop.height).toBe(1)
    expect(crop.width).toBeCloseTo(1.25 / 1.5)
  })

  it('trims top and bottom of a portrait photo printed squarer', () => {
    const crop = cropFraction(4000, 6000, size('8×10'))
    expect(crop.width).toBe(1)
    expect(crop.height).toBeCloseTo(1.25 / 1.5)
  })

  it('trims the sides of a 2:1 panorama printed at 2:3', () => {
    expect(cropFraction(4000, 2000, size('8×12'))).toEqual({ width: 0.75, height: 1 })
  })

  it('describes the trim in plain words', () => {
    expect(cropNote(6000, 4000, size('8×10'))).toBe(
      '8×10 trims about 17% from the left and right edges.',
    )
    expect(cropNote(6000, 4000, size('8×12'))).toBe('8×12 prints the full photo.')
  })
})

describe('productState', () => {
  const calendar = { status: 'preorder' as const, preorderCloses: '2026-11-30' }

  it('stays open through the end of the closing day, Pacific time', () => {
    expect(productState(calendar, new Date('2026-12-01T07:59:00Z'))).toBe('preorder')
  })

  it('closes after the closing day', () => {
    expect(productState(calendar, new Date('2026-12-01T08:00:00Z'))).toBe('preorder-closed')
  })

  it('leaves preorders without a date and other statuses alone', () => {
    expect(productState({ status: 'preorder' }, new Date('2030-01-01'))).toBe('preorder')
    expect(productState({ status: 'coming-soon', preorderCloses: '2020-01-01' })).toBe(
      'coming-soon',
    )
  })

  it('formats the closing date for the card', () => {
    expect(formatShortDate('2026-11-30')).toBe('Nov 30')
  })
})

describe('productCta', () => {
  it('says the button opens an email until checkout exists', () => {
    expect(productCta('preorder', false)).toBe('Email to preorder')
    expect(productCta('by-request', false)).toBe('Email to request')
    expect(productCta('preorder', true)).toBe('Preorder')
  })

  it('offers a notify-me email once a preorder closes or before launch', () => {
    expect(productCta('preorder-closed', true)).toBe('Email me when it’s ready')
    expect(productCta('coming-soon', false)).toBe('Email me when it’s ready')
  })
})

describe('postcard stacks', () => {
  it('fetches and resolves the cards behind the top one, skipping missing ones', () => {
    const stack = mockup('postcard-stack', 'aaaaaaaaaaaa', {
      behind: ['bbbbbbbbbbbb', 'cccccccccccc'],
    })
    expect(imagePhotoIds([stack])).toEqual(['aaaaaaaaaaaa', 'bbbbbbbbbbbb', 'cccccccccccc'])
    const photos = new Map([
      ['aaaaaaaaaaaa', { id: 'a' }],
      ['cccccccccccc', { id: 'c' }],
    ])
    expect(resolveImages([stack], photos)[0].behind).toEqual([{ id: 'c' }])
  })
})
