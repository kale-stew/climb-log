export type ProductStatus = 'preorder' | 'by-request' | 'coming-soon'

/** What a product shows right now: a preorder past its close date reads as closed. */
export type ProductState = ProductStatus | 'preorder-closed'

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
  /** Short ship-date chip for preorders, such as "Ships mid-Dec". */
  shipNote?: string
  /** Last day to preorder (YYYY-MM-DD, Pacific time). The preorder closes at the end of this day. */
  preorderCloses?: string
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
  | 'postcard-stack'

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
      /** Cards stacked behind the front one on a `postcard-stack`, back to front. */
      behind?: string[]
      alt?: string
    }
  | { kind: 'asset'; src: string; alt: string; width: number; height: number }

export const photo = (photoId: string, alt?: string): ShopImage => ({ kind: 'photo', photoId, alt })

export const mockup = (
  template: MockupTemplate,
  photoId: string,
  options: { month?: number; behind?: string[]; alt?: string } = {},
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
    blurb: 'Twelve months from the mountains, opening to 11×17. Printed in a small run.',
    status: 'preorder',
    shipNote: 'Ships mid-Dec',
    preorderCloses: '2026-11-30',
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
      'Preorders close November 30 and ship in mid-December',
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
      mockup('postcard-stack', 'cc4957db86c2', { behind: ['f968ed549f84', '882e9f19715c'] }),
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
  return images.flatMap(image => {
    if (image.kind === 'asset') return []
    if (image.kind === 'mockup') return [image.photoId, ...(image.behind ?? [])]
    return [image.photoId]
  })
}

/**
 * Pairs each image with its fetched photo and drops images whose photo could not be loaded,
 * so a missing photo hides one gallery entry rather than breaking the product.
 */
export interface ResolvedImage<P> {
  image: ShopImage
  photo: P | null
  /** Photos for the cards behind a `postcard-stack`, back to front; missing ones are skipped. */
  behind: P[]
}

export function resolveImages<P>(
  images: ShopImage[],
  photos: ReadonlyMap<string, P>,
): Array<ResolvedImage<P>> {
  return images.flatMap((image): Array<ResolvedImage<P>> => {
    if (image.kind === 'asset') return [{ image, photo: null, behind: [] }]
    const found = photos.get(image.photoId)
    if (!found) return []
    const behind =
      image.kind === 'mockup' ? (image.behind ?? []).flatMap(id => photos.get(id) ?? []) : []
    return [{ image, photo: found, behind }]
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

/** A size's shape as a short ratio label, such as "2:3" for 8×12 or 16×24. */
export function sizeShape(size: Pick<PrintSize, 'short' | 'long'>): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const divisor = gcd(size.short, size.long)
  return `${size.short / divisor}:${size.long / divisor}`
}

/** Whether a print size has the photo's own shape, so it prints the full frame. */
export function isFullFrame(
  widthPx: number,
  heightPx: number,
  size: PrintSize,
  tolerance = 0.02,
): boolean {
  const photoAspect = Math.max(widthPx, heightPx) / Math.min(widthPx, heightPx)
  return Math.abs(photoAspect - size.long / size.short) / photoAspect <= tolerance
}

/**
 * The centered region of the photo a size keeps, as fractions of the photo's width and height,
 * printed in the photo's own orientation.
 */
export function cropFraction(
  widthPx: number,
  heightPx: number,
  size: PrintSize,
): { width: number; height: number } {
  const photoAspect = widthPx / heightPx
  const printAspect = widthPx >= heightPx ? size.long / size.short : size.short / size.long
  if (isFullFrame(widthPx, heightPx, size)) return { width: 1, height: 1 }
  return printAspect < photoAspect
    ? { width: printAspect / photoAspect, height: 1 }
    : { width: 1, height: photoAspect / printAspect }
}

/** Plain-language note for what a size does to the photo. */
export function cropNote(widthPx: number, heightPx: number, size: PrintSize): string {
  const crop = cropFraction(widthPx, heightPx, size)
  if (crop.width === 1 && crop.height === 1) return `${size.label} prints the full photo.`
  const lost = Math.round((1 - Math.min(crop.width, crop.height)) * 100)
  const edges = crop.width < 1 ? 'left and right edges' : 'top and bottom'
  return `${size.label} trims about ${lost}% from the ${edges}.`
}

export interface PrintSizeGroup {
  shape: string
  fullFrame: boolean
  sizes: PrintSize[]
}

/** Groups sizes by shape, full-frame shapes first, each smallest first. */
export function groupPrintSizes(
  widthPx: number,
  heightPx: number,
  sizes: PrintSize[],
): PrintSizeGroup[] {
  const groups = new Map<string, PrintSizeGroup>()
  for (const size of sizes) {
    const shape = sizeShape(size)
    const group = groups.get(shape) ?? {
      shape,
      fullFrame: isFullFrame(widthPx, heightPx, size),
      sizes: [],
    }
    group.sizes.push(size)
    groups.set(shape, group)
  }
  return [...groups.values()].sort((a, b) => Number(b.fullFrame) - Number(a.fullFrame))
}

/** The size picked first: the smallest full-frame size, or the smallest size when none matches. */
export function defaultPrintSize(
  widthPx: number,
  heightPx: number,
  sizes: PrintSize[],
): PrintSize | undefined {
  return sizes.find(size => isFullFrame(widthPx, heightPx, size)) ?? sizes[0]
}

/** The largest size by area, for "up to" copy. */
export function largestPrintSize(sizes: PrintSize[]): PrintSize | undefined {
  return sizes.reduce<PrintSize | undefined>(
    (largest, size) =>
      !largest || size.short * size.long > largest.short * largest.long ? size : largest,
    undefined,
  )
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

/** The end of a Pacific calendar day, as an instant. PST (UTC−8) is close enough for a preorder cutoff. */
function endOfPacificDay(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number)
  return Date.UTC(year, month - 1, day + 1, 8)
}

export function productState(
  product: Pick<ShopProduct, 'status' | 'preorderCloses'>,
  now: Date = new Date(),
): ProductState {
  if (
    product.status === 'preorder' &&
    product.preorderCloses &&
    now.getTime() >= endOfPacificDay(product.preorderCloses)
  )
    return 'preorder-closed'
  return product.status
}

/** "Nov 30" from "2026-11-30". */
export function formatShortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function statusLabel(state: ProductState): string {
  switch (state) {
    case 'preorder':
      return 'Preorder'
    case 'preorder-closed':
      return 'Preorders closed'
    case 'by-request':
      return 'By request'
    case 'coming-soon':
      return 'Coming soon'
  }
}

/**
 * Button text. Without a checkout link the button starts an email, so it says so;
 * a "Preorder" button that opens a mail client reads like a broken checkout.
 */
export function productCta(state: ProductState, hasCheckout: boolean): string {
  if (state === 'coming-soon' || state === 'preorder-closed') return 'Email me when it’s ready'
  if (hasCheckout) return state === 'preorder' ? 'Preorder' : 'Buy'
  return state === 'preorder' ? 'Email to preorder' : 'Email to request'
}
