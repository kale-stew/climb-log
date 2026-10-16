# Shop

`/shop` sells paper goods and prints from canonical photos-api images. This is a spike: checkout is an email request until a payment provider is chosen.

## How it works

- The catalog lives in `src/lib/shop.ts`. Products and prints reference canonical 12-character photos-api IDs; nothing reads the local `photos` table.
- `src/pages/shop.astro` fetches metadata for those IDs at request time and renders images through `/img/{id}`.
- Print sizes are derived from each original's pixel dimensions. A size is offered only when the center crop prints at `MIN_PRINT_DPI` (200) or better, so web-sized images never appear.
- A product with `checkoutUrl` links there. Without one, the button opens a prefilled email to `hi@kylies.photos`.

## Before launch

- Replace placeholder prices with lab quotes plus packaging and postage, keeping at least 50% margin.
- Replace the sample photo selection with the curated launch set.
- Choose checkout (Stripe Payment Links or Shopify) and set `checkoutUrl` per product.
- Publish shipping, returns, and damaged-in-transit policies.
- Add a dedicated OG image for `/shop/`.

## Calendar spike (weekend of Oct 17–18)

- [ ] Review prior Shutterfly exports (PNG and PDF): size, layout, what worked.
- [ ] Pick 12 images plus a cover; confirm each prints at 300 DPI at full size.
- [ ] Get bulk quotes for 25, 50, and 100 copies, including proof turnaround.
- [ ] Build the layout and order a physical proof.
- [ ] Set the price from per-unit cost, mailer, and postage.
- [ ] Draft the preorder post and set the calendar `checkoutUrl`.

Timeline: proof approved about Oct 26, preorders through about Nov 16, print order about Nov 17, ship Dec 1–5.
