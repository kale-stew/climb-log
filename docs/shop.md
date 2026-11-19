# Shop

`/shop` sells paper goods and prints from canonical photos-api images. Checkout will use Stripe Payment Links; until links are created, buttons fall back to an email request.

## How it works

- The canonical URL is `/shop` (without a trailing slash), matching the site's `trailingSlash: 'never'` setting. `/shop/` redirects for compatibility.
- The catalog lives in `src/lib/shop.ts`. Products and prints reference canonical 12-character photos-api IDs; nothing reads the local `photos` table.
- `src/pages/shop.astro` fetches metadata for those IDs at request time and renders images through `/img/{id}`.
- Print sizes are derived from each original's pixel dimensions. A size is offered only when the center crop prints at `MIN_PRINT_DPI` (200) or better, so web-sized images never appear.
- The size picker groups sizes by shape. Sizes with the photo's own shape come first under "Full photo", and the smallest of them is selected by default. Choosing a size with another shape dims the parts of the photo it trims and says how much is lost.
- A product with `checkoutUrl` links to its Stripe Payment Link. Without one, the button says "Email to …" and opens a prefilled email to `hi@kylies.photos`, so nobody mistakes it for a broken checkout.
- A preorder with `preorderCloses` (YYYY-MM-DD) switches itself to "Preorders closed" with a notify-me email after the end of that day, Pacific time. Change the date to extend it.
- Photo metadata lookups are cached per isolate for 10 minutes and time out after 3 seconds, so one slow photo hides that item instead of stalling the page.
- Every card opens a quick-view `<dialog>` (`src/components/shop/QuickView.astro`) with a swipeable gallery, thumbnails, details, and the CTA. `/shop#calendar-2027` and `/shop#print-{photoId}` deep-link to it. Without JS, the link scrolls to the card.

## Product images

Each product's `images` list is ordered: the first entry is the card cover, and the full list is the quick-view gallery. Build entries with the helpers in `src/lib/shop.ts`:

| Helper | Renders | Use for |
|---|---|---|
| `photo(id)` | The canonical photo as-is | Prints, plain photo views |
| `mockup(template, id, { month, behind })` | An HTML/CSS product visual around a canonical photo: `calendar-cover`, `calendar-month`, `postcard-front`, `postcard-back`, `postcard-stack` (`behind` lists up to three photo IDs for the cards under the top one) | Calendar and postcard previews before real product shots exist |
| `asset(src, alt, width, height)` | A static image under `public/shop/` | Photos of the printed proof, flat lays, packaging |

Mockups render at any size from the same markup (container query units), so card, quick view, and thumbnails stay consistent. Once the physical proof arrives, swap `mockup(...)` entries for `asset(...)` photos of the real thing. Product shots are not portfolio photography, so they live in `public/shop/` rather than photos-api.

Prints show the photo first; add `images` on a `PrintListing` to append extra views such as a framed shot.

## Before launch

- Replace placeholder prices with lab quotes plus packaging and postage, keeping at least 50% margin.
- Replace the sample photo selection with the curated launch set.
- Create the Stripe products/payment links, configure shipping and tax settings, and set each product's `checkoutUrl`.
- Confirm Stripe's payment, preorder, refund, and receipt emails with a test purchase; no Shopify connection is required.
- Publish shipping costs, print turnaround, and returns and damaged-in-transit policies in "Good to know".
- Add a dedicated OG image for `/shop`.

## Calendar spike (weekend of Oct 17–18)

- [ ] Review prior Shutterfly exports (PNG and PDF): size, layout, what worked.
- [ ] Pick 12 images plus a cover; confirm each prints at 300 DPI at full size.
- [ ] Get bulk quotes for 25, 50, and 100 copies, including proof turnaround.
- [ ] Build the layout and order a physical proof.
- [ ] Set the price from per-unit cost, mailer, and postage.
- [ ] Draft the preorder post, create the Stripe Payment Link, and set the calendar `checkoutUrl`.

Timeline: preorders extended through Nov 30 (`preorderCloses` in `src/lib/shop.ts`), then the print order, shipping mid-December.
