# Implementation & Development Notes

Plain-language notes explaining what was built, how it works, and why.
Updated as development progresses.

---

## 1. What we are building

A small slice of a multi-vendor marketplace:

- **Sellers** sign up, add a product (the Prague Divan Bed) with photos and all its options and prices.
- **Buyers** browse, search, filter, pick options on the product page with a live price, add to the basket and check out (no real payment).
- **Sellers** see incoming orders and change the status: New → Confirmed → Shipped → Delivered.
- **Buyers** see their orders and the current status.
- **Admins** approve or hide sellers, and show or hide listings.
- **AI:** sellers upload a photo and AI suggests a title and description.
- **Mobile:** the same website is responsive and installable as an app (PWA).

**Time constraint:** this was built in about one day, so scope was cut on purpose (see section 8).

## 2. Technology and why

| Part | Choice | Why |
|---|---|---|
| Frontend + server routes | **Next.js 15** (React, JavaScript) | One project gives us pages *and* small server endpoints (checkout, AI). It deploys to Vercel in one click. |
| Styling | **Tailwind CSS** + design tokens in `app/globals.css` | Quick to make pages responsive (`sm:`, `md:` prefixes). Colours and fonts are defined once in `@theme` (e.g. `text-ink`, `bg-sand`, `text-walnut`). Fonts (Inter and Fraunces) are loaded with Next.js's built-in `next/font`, so no extra package. |
| Database + login + file storage | **Supabase** (PostgreSQL) | It gives us a real Postgres database, secure password login and image storage in one free service, so we don't write our own auth. |
| Mobile app | **PWA** (manifest + service worker) | The same code and backend as the website, installable on the home screen. No second codebase. |
| AI | **Google Gemini API** (free tier), via plain `fetch` | It can read images and has a free key with no card needed. No SDK is installed, which keeps dependencies small. |

**Dependencies added beyond the Next.js starter:** only `@supabase/supabase-js`.

## 3. How the parts talk to each other

```
Browser (pages in app/)  ──supabase-js + anon key──►  Supabase Postgres (RLS rules decide access)
        │
        └── fetch with login token ──► Next.js API routes (app/api/*) ──service key──► Supabase
                                                    └──► Google Gemini API (AI feature)
```

- **Most reads and writes** go straight from the browser to Supabase using the *public* anon key.
  - This is safe because **Row Level Security (RLS)** rules in the database check who the user is on every request. For example, a seller can only edit their own products.
- **Two things go through our own server routes**, because they need secrets or must not be trusted to the browser:
  1. **Checkout** (`app/api/checkout/route.js`) re-calculates prices from the database and creates orders with the secret service key.
  2. **AI** (`app/api/ai-describe/route.js`) keeps the Gemini API key on the server.
- The browser proves who it is to these routes by sending its login token. `lib/supabaseServer.js` → `getUserFromRequest()` checks it.

## 4. Database (supabase/schema.sql)

| Table | Purpose |
|---|---|
| `profiles` | One row per user: `role` (buyer, seller or admin) and `status` (pending, approved or hidden). It's created automatically by a database trigger at sign-up. |
| `categories` | Furniture > Divan Beds (`parent_id` makes the tree). |
| `products` | Title, description, `base_price` and `compare_at_price` as **numeric**, status (active or hidden), seller. |
| `product_images` | Gallery images with a `position` for their order. |
| `product_options` | **One table for all option groups.** `group_name` is colour, size, storage, headboard, base or addon. Each row has a `name`, `price_extra` (numeric), `swatch_hex` (colours) and `position`. |
| `orders` | One per buyer per seller: customer name, address, total and status. |
| `order_items` | A **copy** of the title, the chosen options (JSON) and the unit price at the time of purchase. If the seller changes a price later, old orders stay correct. |

**Why one options table?** Adding a new storage option or a whole new choice is just a new row, entered in the seller form. No code change is needed.

**Security rules (RLS), in summary:**
- Shoppers only see *active* products from *approved* sellers.
- Sellers manage only their own products, options and images.
- Orders are visible to their buyer, their seller and admins.
- Sellers can update **only the `status` column** of their orders (a column-level grant), so they can't change totals.
- Users can't make themselves admin. The sign-up trigger only allows buyer or seller.

## 5. Features: how each one works, and where it lives

### Login and roles
- **Files:** `app/login/page.js`, `lib/useUser.js`, `components/NavBar.js`
- Supabase Auth handles email and password. The sign-up form sends `role` and `full_name` as metadata, and the trigger `handle_new_user()` copies them into `profiles`.
- New sellers are `pending` until an admin approves them.
- `useUser()` gives every page `{ user, profile }`, and the nav bar shows links for that role.

### Product page, options and live price (the most important part)
- **Files:** `app/product/[id]/page.js`, `components/ProductOptions.js`, `components/Gallery.js`, `lib/price.js`
- **Loading:** the page loads the product, images and options from the database. Nothing is hard-coded.
- **Selection state:** `selected = { colour: id, size: id, storage: id, headboard: id, base: id }`, plus `addons = [ids]`.
- **Live price:** `calculatePrice()` = base price + the `price_extra` of every chosen option. It runs on every render, so the price changes instantly.
- **Colour swatch click:**
  - The selected ring appears.
  - The name appears after "Colour:".
  - The title changes via `titleWithColour()` (for example "Prague Divan Bed - Black Naples").
  - The main image changes to **that colour's own image**. Each colour row in `product_options` has an `image_url`. The gallery puts it first, followed by the product's detail images, and jumps back to it whenever the colour changes. No CSS filters are used.
  - Sellers set each colour's image in the seller form (the "Photo" box next to each colour). It's uploaded to Supabase Storage and its URL saved on that colour's row.
- **Discount:** "50% OFF" is calculated from `compare_at_price` against `base_price`.
- **Gallery:** the colour image plus 5 detail images, thumbnails, arrows on desktop, swipe on phones (touch start and end distance > 40px), and tap to enlarge (full-screen overlay).
- **Sticky bar:** the price and Add to Basket are fixed to the bottom of the screen.

### Cart
- **File:** `lib/cart.js` (stored in browser localStorage)
- Each line has a key = product id + sorted option ids.
  - Same combination → the quantity goes up.
  - Different combination → a new line.
- Each line stores `optionLabels`, so the basket shows every option (colour, size, storage, headboard, base, extras).

### Checkout (fake payment)
- **Files:** `app/cart/page.js` (basket and checkout form on one page), `app/api/checkout/route.js`
- The browser sends **only product ids, option ids and quantities**.
- The server then:
  - re-loads the product and options,
  - checks each option belongs to the product, with exactly one per group,
  - re-calculates the price using the same `calculatePrice()`,
  - groups lines by seller,
  - inserts `orders` and `order_items`.
- This stops price tampering in the browser.

### Orders
- **Files:** `app/orders/page.js` (buyer), `app/seller/page.js` (seller), `components/OrderCard.js`
- The seller's status dropdown runs `update orders set status`. RLS and the column grant make this safe.

### Seller product form
- **Files:** `app/seller/product/[id]/page.js`, `components/OptionsEditor.js`
- **Fields:** title, description, prices (converted with `Number()` before saving), category, visibility.
- **Photos:** resized in the browser to a maximum width of 1024px, uploaded to the Supabase Storage bucket `product-images`, then saved as rows.
- **Options:** one editor per group. On save, removed rows are deleted, existing rows are updated (ids are kept so baskets stay valid) and new rows are inserted.

### Shop list, search and filters
- **File:** `app/page.js`
- Search (`ilike`), min and max price, and category are filtered **in the database query**.
- Colour and size are filtered in JavaScript on the loaded options. This is simpler, and fine for small data.

### Admin
- **File:** `app/admin/page.js`
- Lists sellers (Approve or Hide) and listings (Show or Hide). Only admins get data, enforced by `is_admin()` in RLS.

### AI feature: "describe my product photo"
- **Files:** `app/api/ai-describe/route.js`, plus the AI helper box in the seller form
- The seller picks a photo. It's resized, added to the gallery, and sent as base64 to our server route.
- The route calls Google Gemini (`gemini-flash-lite-latest`, free tier; it answers in about 1.5s, while the bigger flash model took 60s+ in testing) and asks for JSON `{title, description}`, then fills in the form. The seller can still edit the result.

### PWA (mobile app)
- **Files:** `public/manifest.json`, `public/sw.js`, `public/icons/*`, `components/RegisterServiceWorker.js`, and the metadata in `app/layout.js`
- The manifest gives the name, icon and full-screen (`standalone`) mode.
- The service worker is minimal and caches nothing, so prices and orders are always live.

### Mobile responsiveness
- The viewport meta is set, and `overflow-x: hidden` is on the body.
- Grids collapse to 1–2 columns on phones.
- All buttons, inputs and swatches are at least 44px.

## 6. Seed data (scripts/seed.mjs)

`npm run seed` uses the service key to create the 3 test accounts and the Prague bed:
- 8 colours taken from the reference page's swatch list
- 6 sizes, 5 storage options, 2 headboards, 2 bases, and the assembly add-on
- One image per colour (`public/images/colours/<colour>.svg`) linked through `image_url`, plus 5 colour-neutral detail images (`public/images/detail-1..5.svg`). All are our own drawings made by `scripts/make-placeholder-images.mjs`, not Sonno photos. A seller can replace any of them with a real upload.

## 7. Decisions and trade-offs

- **The cart is in localStorage, not the database:** faster to build and works without login. The downside is it doesn't follow the user across devices.
- **Price rule followed literally:** the size table says Small Single **+£90**, while the document also says £269.99 is the small-single price. We followed the table, so the cheapest full combination is £359.99. This is easy to change in the seller form.
- **The compare-at price shown on the product page grows with the options:** the original compare-at price plus the same option extras, so the crossed-out price stays meaningful. The 50% badge is calculated from the base prices.
- **Pages are client components:** simpler to understand (one pattern everywhere). The trade-off is less SEO and server rendering, which isn't important for this test.
- **`npm audit` warning:** Next 15's bundled PostCSS has advisories that only affect the build step processing our own CSS. The fix needs Next 16, a breaking upgrade, so we didn't take it under time pressure.

## 8. Status

| Item | Status |
|---|---|
| Schema, RLS, storage bucket | Written; needs running in Supabase |
| Seed script (test users and the bed) | Written |
| Login and sign-up with roles | Written |
| Product page: swatches, options, live price, gallery, sticky bar | Written |
| Cart with separate lines per combination | Written |
| Checkout with server-side price check | Written |
| Buyer orders, seller status changes | Written |
| Seller product form (photos, options) | Written |
| Shop search and filters | Written |
| Admin approve or hide | Written |
| AI describe photo | Written |
| PWA manifest, icon and service worker | Written |
| Testing end to end (locally) | **Done**, see section 9 |
| Production build (`npm run build`) | **Passes** |
| Deploy to Vercel | **Pending** |
| Test on a real phone | **Pending** (after deploy) |
| 3-minute video | **Pending** |
| Push notifications (bonus) | Skipped |
| Real payments, emails, tracking, analytics | Skipped (as the brief allows) |

## 9. How it was tested

All tests ran against the real Supabase database on `localhost`, using the 3 seeded test accounts.

**Price: 6 combinations clicked on the real product page.** All matched the hand calculation:

| Combination | Expected | Shown |
|---|---|---|
| Default (Cream Naples, Small Single, No Storage, Free headboard, Standard base) | 269.99 + 90 = £359.99 | £359.99 ✅ |
| Black Naples, King 5FT, 4 Drawers | 269.99 + 125 + 210 = £604.99 | £604.99 ✅ |
| + Super King, Foot End drawers, 54" headboard, Reinforced base, Assembly | 269.99 + 150 + 155 + 10 + 25 + 39.99 = £649.98 | £649.98 ✅ |
| Emerald Coniston, Single 3FT, Right drawers, Free headboard, Standard base | 269.99 + 95 + 45 = £409.99 | £409.99 ✅ |
| Small Double, Left drawers, Reinforced base, Assembly | 269.99 + 100 + 50 + 25 + 39.99 = £484.98 | £484.98 ✅ |
| Double 4FT6, No storage, 54" headboard, Standard base | 269.99 + 110 + 10 = £389.99 | £389.99 ✅ |

Swatch clicks updated the selected ring, the "Colour:" label, the title and the main image every time. The image `src` changed to that colour's own file (e.g. `black-naples.svg`, `emerald-coniston.svg`), with no CSS overlays left.

**Cart and checkout:**
- The same combination added twice gave one line with quantity 2. A different combination gave a separate line.
- Every option was listed on each line.
- Checkout created an order with the server-calculated total £1614.96, which matches the basket. The buyer's "My orders" page showed it as "New".

**Seller:**
- Changed the order status to Shipped, and it was still saved after a reload.
- Added a new storage option ("Ottoman Lift Storage" +£99), edited its price to £89, and saw it appear on the product page from the database. It was removed afterwards.

**Admin:** hiding the listing made it disappear for shoppers (0 products returned). Clicking Show brought it back.

**Security** (a script using the public key, like a real browser would):
- A buyer trying to change an order status: 0 rows changed. ✅
- A seller trying to change an order total: "permission denied". ✅ A seller changing the status: allowed. ✅
- A visitor who isn't logged in sees 0 orders. ✅
- A buyer trying to make themselves admin: 0 rows changed. ✅
- A checkout with a fake option id: rejected with "Invalid option selected" (400). ✅

**AI:** a test image of a blue bed returned "Modern Blue Upholstered Bed with Pillows" plus a sensible description.

**Mobile (360px wide):**
- No sideways scroll on shop, product, basket, orders, seller, seller form, admin or login.
- All buyer buttons, inputs and swatches are at least 44px.

**Bugs found while testing, and fixed:**
1. The "50% OFF" badge became untrue once options were added, because the crossed-out price added a fixed £269.99. Now the compare-at price scales by the same ratio (×2).
2. Order options showed in a random order, because Postgres `jsonb` doesn't keep key order. They're now displayed in a fixed order (Colour, Size, Storage, Headboard, Base, Extras).
3. Saving the seller form was slow (~25 sequential requests to a Tokyo server). It now does one `upsert` request, at about 3 seconds per save.
4. Pages were wider than 360px. Our shared `.btn` and `.input` CSS sat outside Tailwind's layers, so it overrode utilities like `w-24`. Moving it into `@layer components` fixed it, along with `min-w-0` on the gallery column.
5. The AI took 60–80 seconds with `gemini-flash-latest`. We switched to `gemini-flash-lite-latest` (about 1.5 seconds).
6. **Colour images were a CSS tint, not real images.** The first version laid a coloured "multiply" layer over one photo. It's now fixed in the data: each colour option has its own `image_url`, and the gallery shows that image. The seller form can upload one per colour (tested: upload → saved on the colour row → loads publicly).

## 10. Design pass and dependency audit (second round)

**Design:**
- A warm furniture-store palette and a serif heading font, defined once as tokens in `globals.css`.
- A shop banner, product cards (colour image, sale badge, colour dots that preview each colour on hover, "From" price).
- A product page with breadcrumb, "You save" line, "Included" or "+£" on each option, selected value next to each heading, and a richer sticky bar.
- A two-column basket with an order summary.
- A phone header with logo and Basket on top and links below.
- Re-tested after the redesign:
  - All 6 price combinations still correct
  - Basket lines carry the colour image
  - Checkout works
  - Every buyer page fits 360px, with all tap targets at least 44px
  - Production build passes

**Dependencies:** `package.json` has only 6 packages, and all are used:
- `next`, `react`, `react-dom`
- `@supabase/supabase-js`
- `tailwindcss` and `@tailwindcss/postcss` (the CSS build)

npm lists two "extraneous" packages (`@img/sharp-wasm32`, `@emnapi/runtime`). These are optional sub-packages of Next.js's own image tool, not something we installed, so there was nothing to remove.
