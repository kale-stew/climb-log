export type ProductStatus = 'preorder' | 'by-request' | 'coming-soon'

export interface PrintSize {
  label: string
  /** Short edge in inches. */
  short: number
  /** Long edge in inches. */
  long: number
  /** Placeholder retail price in USD; confirm against lab quotes before launch. */
  price: number
}

export interface ShopProduct {
  slug: string
  name: string
  blurb: string
  status: ProductStatus
  /** Placeholder retail price in USD. */
  price: number
  /** Canonical photos-api IDs used as the product imagery. */
  photoIds: string[]
  /** Stripe Payment Link or Shopify checkout URL. Falls back to an email request when unset. */
  checkoutUrl?: string
}

export interface PrintListing {
  photoId: string
  /** Optional caption override, such as summit elevation for a peak print. */
  note?: string
}

/** Minimum effective resolution for a sharp fine-art print viewed at arm's length. */
export const MIN_PRINT_DPI = 200

export const PRINT_SIZES: PrintSize[] = [
  { label: '8×10', short: 8, long: 10, price: 40 },
  { label: '8×12', short: 8, long: 12, price: 40 },
  { label: '12×16', short: 12, long: 16, price: 75 },
  { label: '12×18', short: 12, long: 18, price: 80 },
  { label: '16×20', short: 16, long: 20, price: 120 },
  { label: '16×24', short: 16, long: 24, price: 140 },
  { label: '18×24', short: 18, long: 24, price: 150 },
  { label: '20×30', short: 20, long: 30, price: 220 },
]

export const SHOP_EMAIL = 'hi@kylies.photos'

export const PRODUCTS: ShopProduct[] = [
  {
    slug: 'calendar-2027',
    name: '2027 Wall Calendar',
    blurb:
      'Twelve months from the mountains, opening to 11×17. Printed in a small run and packed by hand in San Francisco.',
    status: 'preorder',
    price: 32,
    photoIds: ['f6e666c3d224', '41c7f22db347', '67216862f7b1'],
  },
  {
    slug: 'postcard-set',
    name: 'Postcard Set',
    blurb:
      'Eight heavyweight postcards: Norway, Utah, Colorado, and Sicily. Write on them or tape them to your monitor.',
    status: 'coming-soon',
    price: 18,
    photoIds: ['cc4957db86c2', '882e9f19715c', 'f968ed549f84'],
  },
]

export const PRINTS: PrintListing[] = [
  { photoId: 'f6e666c3d224' },
  { photoId: 'cc4957db86c2' },
  { photoId: '35d9ded65926' },
  { photoId: '41c7f22db347' },
  { photoId: '882e9f19715c' },
  { photoId: 'f968ed549f84' },
  { photoId: '67216862f7b1' },
  { photoId: '6c0e91103a5b' },
]

/**
 * Effective DPI when the image is center-cropped to the print's aspect ratio
 * and printed in the image's own orientation.
 */
export function effectiveDpi(widthPx: number, heightPx: number, size: PrintSize): number {
  const longPx = Math.max(widthPx, heightPx)
  const shortPx = Math.min(widthPx, heightPx)
  if (longPx <= 0 || shortPx <= 0) return 0

  const printAspect = size.long / size.short
  const cropLong = Math.min(longPx, shortPx * printAspect)
  const cropShort = cropLong / printAspect
  return Math.floor(Math.min(cropLong / size.long, cropShort / size.short))
}

/** Print sizes this image can fill at or above `minDpi`, smallest first. */
export function printableSizes(
  widthPx: number | null,
  heightPx: number | null,
  minDpi = MIN_PRINT_DPI,
  sizes = PRINT_SIZES,
): PrintSize[] {
  if (!widthPx || !heightPx) return []
  return sizes.filter(size => effectiveDpi(widthPx, heightPx, size) >= minDpi)
}

export function formatPrice(usd: number): string {
  return `$${usd.toLocaleString('en-US')}`
}

export function requestMailto(subject: string, body = ''): string {
  const params = new URLSearchParams({ subject, body })
  return `mailto:${SHOP_EMAIL}?${params.toString().replaceAll('+', '%20')}`
}

export function statusLabel(status: ProductStatus): string {
  switch (status) {
    case 'preorder':
      return 'Preorder'
    case 'by-request':
      return 'By request'
    case 'coming-soon':
      return 'Coming soon'
  }
}
