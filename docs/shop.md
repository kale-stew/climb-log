# Shop

`/shop` sells paper goods and prints from canonical photos-api images. This is a spike: checkout is an email request until a payment provider is chosen.

## How it works

- The catalog lives in `src/lib/shop.ts`. Products and prints reference canonical 12-character photos-api IDs; nothing reads the local `photos` table.
- `src/pages/shop.astro` fetches metadata for those IDs at request time and renders images through `/img/{id}`.
- Print sizes are derived from each original's pixel dimensions. A size is offered only when the center crop prints at `MIN_PRINT_DPI` (200) or better, so web-sized images never appear.
- A product with `checkoutUrl` links there. Without one, the button opens a prefilled email to `hi@kylies.photos`.
- Every card opens a quick-view `<dialog>` (`src/components/shop/QuickView.astro`) with a swipeable gallery, thumbnails, details, and the CTA. `/shop#calendar-2027` and `/shop#print-{photoId}` deep-link to it. Without JS, the link scrolls to the card.

## Product images

Each product's `images` list is ordered: the first entry is the card cover, and the full list is the quick-view gallery. Build entries with the helpers in `src/lib/shop.ts`:

| Helper | Renders | Use for |
|---|---|---|
| `photo(id)` | The canonical photo as-is | Prints, plain photo views |
| `mockup(template, id, { month })` | An HTML/CSS product visual around a canonical photo: `calendar-cover`, `calendar-month`, `postcard-front`, `postcard-back` | Calendar and postcard previews before real product shots exist |
| `asset(src, alt, width, height)` | A static image under `public/shop/` | Photos of the printed proof, flat lays, packaging |

Mockups render at any size from the same markup (container query units), so card, quick view, and thumbnails stay consistent. Once the physical proof arrives, swap `mockup(...)` entries for `asset(...)` photos of the real thing. Product shots are not portfolio photography, so they live in `public/shop/` rather than photos-api.

Prints show the photo first; add `images` on a `PrintListing` to append extra views such as a framed shot.

## Before launch

- Replace placeholder prices with lab quotes plus packaging and postage, keeping at least 50% margin.
- Replace the sample photo selection with the curated launch set.
- Choose checkout (Stripe Payment Links or Shopify) and set `checkoutUrl` per product.
- Publish shipping, returns, and damaged-in-transit policies.
- Add a dedicated OG image for `/shop`.

## Calendar spike (weekend of Oct 17–18)

- [ ] Review prior Shutterfly exports (PNG and PDF): size, layout, what worked.
- [ ] Pick 12 images plus a cover; confirm each prints at 300 DPI at full size.
- [ ] Get bulk quotes for 25, 50, and 100 copies, including proof turnaround.
- [ ] Build the layout and order a physical proof.
- [ ] Set the price from per-unit cost, mailer, and postage.
- [ ] Draft the preorder post and set the calendar `checkoutUrl`.

Timeline: proof approved about Oct 26, preorders through about Nov 16, print order about Nov 17, ship Dec 1–5.
