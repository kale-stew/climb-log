import { describe, expect, it } from 'vitest'
import {
  effectiveDpi,
  MIN_PRINT_DPI,
  PRINT_SIZES,
  PRINTS,
  PRODUCTS,
  printableSizes,
  requestMailto,
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
      ...PRODUCTS.flatMap(product => product.photoIds),
      ...PRINTS.map(print => print.photoId),
    ]
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{12}$/)
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
