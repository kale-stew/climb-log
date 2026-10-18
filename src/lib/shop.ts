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
  /** Ordered imagery: the first entry is the card cover, and the full list is the quick-view gallery. */
  images: ShopImage[]
  /** Spec lines shown in the quick view, such as size and paper. */
  details?: string[]
  /** Stripe Payment Link. Falls back to an email request when unset. */
  checkoutUrl?: string
}

export interface PrintListing {
  photoId: string
  /** Optional caption override, such as summit elevation for a peak print. */
  note?: string
  /** Extra quick-view images shown after the photo itself, such as a framed shot. */
  images?: ShopImage[]
}

export type MockupTemplate =
  | 'calendar-cover'
  | 'calendar-month'
  | 'postcard-front'
  | 'postcard-back'

/**
 * One image in a product gallery.
 * - `photo`: a canonical photos-api photo, shown as-is.
 * - `mockup`: a product visual rendered in HTML/CSS around a canonical photo, for use before real product shots exist.
 * - `asset`: a static product shot committed under `public/shop/`, such as a photo of the printed proof.
 */
export type ShopImage =
  | { kind: 'photo'; photoId: string; alt?: string }
  | {
      kind: 'mockup'
      template: MockupTemplate
      photoId: string
      /** 1–12; the month shown on a `calendar-month` page. */
      month?: number
      alt?: string
    }
  | { kind: 'asset'; src: string; alt: string; width: number; height: number }

export const photo = (photoId: string, alt?: string): ShopImage => ({ kind: 'photo', photoId, alt })

export const mockup = (
  template: MockupTemplate,
  photoId: string,
  options: { month?: number; alt?: string } = {},
): ShopImage => ({ kind: 'mockup', template, photoId, ...options })

export const asset = (src: string, alt: string, width: number, height: number): ShopImage => ({
  kind: 'asset',
  src,
  alt,
  width,
  height,
})

export const CALENDAR_YEAR = 2027

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
    images: [
      mockup('calendar-cover', 'f6e666c3d224'),
      mockup('calendar-month', '41c7f22db347', { month: 1 }),
      mockup('calendar-month', '67216862f7b1', { month: 7 }),
      mockup('calendar-month', 'cc4957db86c2', { month: 10 }),
    ],
    details: [
      '11×8.5 closed, opens to 11×17',
      'Thirteen photos: a cover and one per month',
      'Wire-bound, with a hanging hole',
      'Ships the first week of December',
    ],
  },
  {
    slug: 'postcard-set',
    name: 'Postcard Set',
    blurb:
      'Eight heavyweight postcards: Norway, Utah, Colorado, and Sicily. Write on them or tape them to your monitor.',
    status: 'coming-soon',
    price: 18,
    images: [
      mockup('postcard-front', 'cc4957db86c2'),
      mockup('postcard-front', '882e9f19715c'),
      mockup('postcard-front', 'f968ed549f84'),
      mockup('postcard-back', 'cc4957db86c2'),
    ],
    details: [
      'Eight 4×6 cards on heavyweight matte stock',
      'Blank backs with a caption, ready to mail',
    ],
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

/** Canonical photo IDs a gallery needs fetched. Assets need none. */
export function imagePhotoIds(images: ShopImage[]): string[] {
  return images.flatMap(image => (image.kind === 'asset' ? [] : [image.photoId]))
}

/**
 * Pairs each image with its fetched photo and drops images whose photo could not be loaded,
 * so a missing photo hides one gallery entry rather than breaking the product.
 */
export function resolveImages<P>(
  images: ShopImage[],
  photos: ReadonlyMap<string, P>,
): Array<{ image: ShopImage; photo: P | null }> {
  return images.flatMap((image): Array<{ image: ShopImage; photo: P | null }> => {
    if (image.kind === 'asset') return [{ image, photo: null }]
    const found = photos.get(image.photoId)
    return found ? [{ image, photo: found }] : []
  })
}

export interface CalendarMonth {
  name: string
  /** Weeks starting Sunday; `null` pads days outside the month. */
  weeks: Array<Array<number | null>>
}

export function calendarMonth(year: number, month: number): CalendarMonth {
  const first = new Date(Date.UTC(year, month - 1, 1))
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells: Array<number | null> = Array(first.getUTCDay()).fill(null)
  for (let day = 1; day <= days; day++) cells.push(day)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  const name = first.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })
  return { name, weeks }
}

/** Stable DOM id for a product or print quick view, also used as the URL hash. */
export function quickViewSlug(item: { slug: string } | { photoId: string }): string {
  return 'slug' in item ? item.slug : `print-${item.photoId}`
}

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
