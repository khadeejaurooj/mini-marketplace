# Mini Marketplace: Internal Learning Guide

My study notes for this project. Everything here is based on the actual code in this repository, so I can explain it in the interview and change it live if asked. (The document for the company is `downloads/SUBMISSION.md`.)

---

## 1. Start here: what to read first

If I only have an hour before the interview, I'll read these files in this order:

| # | File | Why it matters |
|---|---|---|
| 1 | `supabase/schema.sql` | The whole data model and every security rule. Most interview questions trace back to this file. |
| 2 | `lib/price.js` | The price rules: `calculatePrice()`, `buildOptionLabels()`, `titleWithColour()`. Used by both the product page and checkout. |
| 3 | `app/product/[id]/page.js` | The product page: loading data, remembering choices, and the live price. Worth the most marks. |
| 4 | `components/Gallery.js` | How the gallery picks the images for the selected colour. |
| 5 | `lib/cart.js` | How the basket works and why different options become separate lines. |
| 6 | `app/api/checkout/route.js` | The server re-checks every price and creates the orders. |
| 7 | `app/seller/product/[id]/page.js` | The seller form: photos, colours, options and saving. |
| 8 | `lib/useUser.js` + `app/login/page.js` | Login, sign-up and roles. |

Then skim `app/admin/page.js`, `app/orders/page.js`, `app/seller/page.js` and `app/api/ai-describe/route.js`.

---

## 2. Folder and file guide

```
mini-marketplace/
├── app/                         Pages and server routes (Next.js "App Router": each folder = a URL)
│   ├── layout.js                Frame around every page: fonts, demo banner, nav bar, footer, PWA links
│   ├── globals.css              Colour/font tokens + shared .btn .input .card .page-title styles
│   ├── page.js                  "/"            Shop: banner, search, filters, product grid
│   ├── login/page.js            "/login"       Log in + sign up (toggle), redirects by role
│   ├── product/[id]/page.js     "/product/<id>" Product page (gallery, options, live price, sticky bar)
│   ├── cart/page.js             "/cart"        Basket lines + order summary + checkout form
│   ├── orders/page.js           "/orders"      Buyer's orders + "status changed" message
│   ├── seller/page.js           "/seller"      Seller: my products + incoming orders
│   ├── seller/product/[id]/page.js  "/seller/product/new" or "/seller/product/<id>"  Add/edit form
│   ├── admin/page.js            "/admin"       Approve/hide sellers, show/hide listings
│   └── api/
│       ├── checkout/route.js    POST /api/checkout     (server) validate + re-price + create orders
│       └── ai-describe/route.js POST /api/ai-describe  (server) photo -> Gemini -> title/description
│
├── components/                  Reusable UI pieces
│   ├── NavBar.js                Top bar: links depend on role, basket counter, log out
│   ├── ProductCard.js           One tile in the shop (colour image, price, sale badge, colour dots)
│   ├── Gallery.js               Colour-specific gallery: thumbnails, arrows, swipe, enlarge
│   ├── ProductOptions.js        The numbered configurator: colour picture tiles, size cards, option cards, extras
│   ├── PriceBreakdown.js        "Your bed" card: base price + each option = total
│   ├── OptionsEditor.js         Seller form block for one option group (+ colour photo upload)
│   ├── OrderCard.js             One order (buyer view, or seller view with status dropdown)
│   └── RegisterServiceWorker.js Switches on the PWA service worker
│
├── lib/                         Logic with no UI
│   ├── price.js                 Price rules + option labels + title helper (shared by page AND server)
│   ├── cart.js                  Basket in localStorage (add, change quantity, clear, count)
│   ├── supabase.js              Browser database client (public anon key)
│   ├── supabaseServer.js        Server-only client (secret key) + getUserFromRequest()
│   └── useUser.js               useUser() hook (who is logged in + role) and authFetch()
│
├── supabase/
│   ├── schema.sql               Tables, triggers, security rules, storage bucket, category
│   └── migrations/002_colour_gallery.sql   Later change: colour-specific photos + public seller names
│
├── scripts/
│   ├── seed.mjs                 Creates the 3 test accounts + the bed (+ "--images-only" to refresh gallery)
│   ├── colours.mjs              The 8 colours + file-name rule, shared by the two scripts
│   └── make-placeholder-images.mjs  Draws 5 SVG views per colour + size chart + fabric card
│
├── public/
│   ├── images/colours/<colour>/ front, side, headboard, drawers, fabric (.svg) for each colour
│   ├── images/sizes.svg         Size chart (shown for every colour)
│   ├── images/fabrics.svg       All swatches (shop banner)
│   ├── manifest.json, sw.js, icons/   PWA files
│
├── downloads/                   These two documents
├── .env.example                 Names of the 4 environment variables (no values)
└── README.md                    Setup, accounts, done / not done
```

**Where each feature lives:**

| Feature | Main files |
|---|---|
| Login, sign-up, roles | `app/login/page.js`, `lib/useUser.js`, `components/NavBar.js`, trigger in `supabase/schema.sql` |
| Shop, search, filters | `app/page.js`, `components/ProductCard.js` |
| Product options + live price | `app/product/[id]/page.js`, `components/ProductOptions.js`, `components/PriceBreakdown.js`, `lib/price.js` |
| Colour-specific images | `components/Gallery.js`, `product_images.colour_option_id` in the schema, `scripts/seed.mjs` → `setGallery()` |
| Basket | `lib/cart.js`, `app/cart/page.js` |
| Checkout | `app/cart/page.js` (form) → `app/api/checkout/route.js` (server) |
| Orders | `app/orders/page.js` (buyer), `app/seller/page.js` (seller), `components/OrderCard.js` |
| Seller product form | `app/seller/product/[id]/page.js`, `components/OptionsEditor.js` |
| Admin | `app/admin/page.js` + the `is_admin()` rules in the schema |
| AI | `app/api/ai-describe/route.js` + `handleAiPhoto()` in the seller form |
| PWA | `public/manifest.json`, `public/sw.js`, `components/RegisterServiceWorker.js`, `app/layout.js` |

---

## 3. Architecture in one picture

```
Browser / installed PWA (React pages in app/)
   │
   ├─(1) reads & writes Supabase directly with the PUBLIC anon key
   │        → Postgres applies Row Level Security rules on every request
   │
   ├─(2) POST /api/checkout  + login token
   │        → server checks the user, re-prices from the DB, writes orders with the SECRET key
   │
   └─(3) POST /api/ai-describe  + login token
            → server checks the user is a seller, sends the photo to Google Gemini
```

- **Why most work happens in the browser:** Supabase's RLS makes it safe. The database itself refuses anything the user isn't allowed to do, which keeps the code small: there's no API endpoint for every action.
- **Why two server routes:**
  - Checkout must not trust prices sent by the browser.
  - The AI key must stay secret.
- **How the server knows who's calling:** `getUserFromRequest()` in `lib/supabaseServer.js` reads the `Authorization: Bearer <token>` header and asks Supabase to verify the token.
- **How the browser sends that token:** with `authFetch()` in `lib/useUser.js`.

---

## 4. Database (`supabase/schema.sql`)

```
auth.users ── profiles (role, status)
                 ├── products (seller_id)  ── product_options (group_name, name, price_extra, swatch_hex, image_url)
                 │                         └─ product_images  (url, position, colour_option_id → product_options)
                 └── orders (buyer_id, seller_id, status, total) ── order_items (title, options JSON, unit_price, quantity)
categories (parent_id tree: Furniture → Divan Beds)
```

- **`profiles`:** one row per user. `role` is buyer, seller or admin. `status` is pending, approved or hidden. The trigger `handle_new_user()` creates the row at sign-up and only allows buyer or seller.
- **`products`:** `base_price` and `compare_at_price` are `numeric(10,2)`, real numbers rather than text.
- **`product_options`:** **one table for every option group.**
  - `group_name` says which group the row is in.
  - Colour rows also have `swatch_hex` and `image_url` (the colour's main picture).
  - Why it's designed this way: a new option is just a new row, entered by the seller, with no code change.
- **`product_images`:** the gallery. `colour_option_id` links a photo to one colour; when it's empty (NULL), the photo is shown for every colour, like the size chart. Deleting a colour deletes its photos (`on delete cascade`).
- **`orders` / `order_items`:**
  - One order per seller.
  - `order_items` keeps a **copy** of the title, the options and the price, so later edits don't rewrite history.

**Security rules (RLS) in plain words:**
- **Shop:** shoppers see a product only if it's `active` and its seller is `approved`. The seller always sees their own, and the admin sees all.
- **Products, options and images:** only the product's seller can write them.
- **Profiles:** you read your own; anyone can read **approved sellers** (for "Sold by …"); the admin reads and updates all.
- **Orders:**
  - Readable by the buyer, the seller and the admin.
  - The seller can update **only the `status` column** (`grant update (status)`), so they can't change a total.
  - Orders are only ever created by the checkout route.
- **Admin:** `is_admin()` and `is_approved_seller()` are small helper functions the rules call.

**Changes made after the first version** are in `supabase/migrations/`. They're also folded into `schema.sql`, so a fresh setup only needs that one file.

---

## 5. Login and roles

- **The form** (`app/login/page.js`) switches between **Log in** and **Sign up**.
- **Sign up** sends email, password, `full_name` and `role` (buyer or seller) to Supabase. The database trigger creates the profile:
  - buyers are `approved` straight away
  - sellers are `pending`
  - "admin" is turned into buyer
- **After login,** the page reads the role and redirects: buyer → `/`, seller → `/seller`, admin → `/admin`.
- **`useUser()`** (`lib/useUser.js`) gives every page `{ user, profile, loading }`. It listens for login and logout, so the nav bar updates instantly.
- **Page guards** ("Admins only.", "This page is for sellers only.") are only the friendly message. **The real protection is RLS**: a buyer asking the database for admin data gets nothing.
- **Edge case:** if Supabase's "Confirm email" setting is ever switched on, sign-up shows a "please confirm your email" message instead of pretending the user is logged in.

---

## 6. Product page: options, pricing and colour images

**Files:** `app/product/[id]/page.js`, `components/ProductOptions.js`, `components/Gallery.js`, `components/PriceBreakdown.js`, `lib/price.js`.

1. **Load:** the product (with category name and seller name), its images and its options, all from the database.
2. **Remember choices** in React state (updated with `setSelected(prev => ...)`, see the note below):
   - `selected = { colour, size, storage, headboard, base }` (one option id each)
   - `addons = [ids]` for the tick boxes
   - The first option of each group is pre-selected. For colour, it's the one named in the title.
3. **Recalculate on every render:**
   - `price = calculatePrice(product, options, selectedIds)`, which is `base_price + Σ price_extra` of the chosen options, rounded to 2 decimals.
   - `title = titleWithColour(product.title, colour.name)` keeps the text before " - " and adds the colour name.
   - The crossed-out price is `price × (compare_at / base)`, so "50% OFF" stays true for any combination.
4. **Colour images** (`Gallery.js` → `imagesForColour()`) show, in this order:
   - the colour's main picture (`image_url`)
   - its own extra photos (`product_images` with that `colour_option_id`)
   - the shared photos (`colour_option_id` empty)

   Changing colour swaps the **whole set** and jumps back to the first image. There are no CSS filters; each image is a real file linked in the database.
5. **"Your bed" card** (`PriceBreakdown.js`) lists the base price, each choice ("+£125.00" or "Included") and the total, so the buyer can see how the price is built.
6. **Configurator** (`ProductOptions.js`): one white panel with numbered steps (1 Colour … 6 Extras). Each step header shows the current choice and its price.
   - **Colour:** picture tiles, each showing the bed in that colour (its `image_url`) with a round swatch dot and the name. A tick marks the selected one.
   - **Size:** cards with the size code large ("4FT6"). `splitSize()` splits "Double 4FT6" into the code and the rest.
   - **Storage, headboard, base:** cards with a radio-style circle and "+£" or "Included".
   - **Extras:** a toggle card for Professional Assembly.
7. **Title and price:** the title shows the product name in bold serif, with the colour in walnut italic on its own line underneath. The price panel shows the price, the crossed-out price, a soft "50% OFF" pill and "You save £…".
8. **Gallery controls:**
   - Thumbnails, plus arrows on desktop.
   - Swipe on phones: if the finger moves more than 40px between touch start and end, it counts as a swipe.
   - Tap the main image to open a full-screen view.
9. **Sticky bar** at the bottom: the colour's picture, the title, a size and storage summary, the price and Add to Basket. It's always visible.

**Note on `setSelected(prev => ...)`:** an earlier version wrote `setSelected({ ...selected, [group]: id })`. That copies `selected` as it was at the last render, so two clicks before React re-renders overwrite each other and one is lost. Testing found it with quick clicks. The `prev =>` form always starts from React's latest value. It's a good thing to explain if asked about React state.

**Price example:** £269.99 + King 5FT £125 + 4 Drawers £210 + Assembly £39.99 = **£644.98**.

**Brief inconsistency:** the brief calls £269.99 the "small single" price, but also lists Small Single as +£90. I followed the size table, so the default shows £359.99. It's data, so the seller can change it.

---

### Design notes (what changed after comparing with the reference page)
I studied the reference product page for **presentation quality only** and kept our own layout and identity. It was clearly ahead of ours in five ways:
- its main image was a staged room photo, while ours was a flat drawing
- the colour was shown as a variant of the product name
- the options sat inside one framed panel
- colours were shown as pictures of the bed
- the price stood out

What I did in response, in our own style:
- **Room-scene images:** each colour's main image is now a styled bedroom, drawn by `bedroom()` and `front()` in `scripts/make-placeholder-images.mjs`. The room is identical for every colour; only the bed's fabric changes.
- **Gallery:** a wider column, larger rounded corners with a soft shadow, a "Click to zoom" hint, and an even thumbnail row.
- **Title:** the name and the colour are on two lines in different styles.
- **Price panel** with soft badges.
- **Numbered configurator** with colour picture tiles and size-code cards. This part is our own design, not taken from the reference.
- **Price breakdown and sticky bar** restyled.

The colour choice still changes the real images (data-driven), the title and the colour name. No CSS filters are used.

**Layout tip:** the page grid uses `grid-cols-[minmax(0,1fr)]` on phones. A plain grid column grows to fit its widest content, and that made the page 420px wide at 360px before this fix.

## 7. Basket, checkout and orders

**Basket** (`lib/cart.js`, `app/cart/page.js`):
- Stored in `localStorage` under `mm_cart`.
- **Line key** = product id + sorted option ids. The same choices increase the quantity; different choices get a separate line.
- Each line stores the labels from `buildOptionLabels()`, so it can list Colour, Size, Storage, Headboard, Base and Extras.
- Changing the basket fires a `cart-changed` event, and the nav bar counter listens for it.

**Checkout** (`app/api/checkout/route.js`):
1. The browser sends `{ customer_name, address, items: [{ productId, optionIds, quantity }] }`. It sends **no prices**.
2. The server checks the caller is a buyer (`getUserFromRequest`).
3. For each line it loads the product (must be active, with an approved seller) and its options from the database.
4. It checks every option id belongs to that product, and that each group has exactly one choice.
5. It works out `unit_price = calculatePrice(...)` (the same function as the page) and the labels with `buildOptionLabels(...)` (the same as the basket).
6. It groups lines by seller and inserts `orders` and `order_items` with the secret key.
7. The page clears the basket and goes to `/orders?placed=1`.

**Orders:**
- **Buyer** (`app/orders/page.js`): sees their list.
  - It remembers each order's status in `localStorage` (`mm_seen_order_status`).
  - If the seller changed a status since the last visit, it shows "status changed: New → Shipped". That's the brief's optional bonus, done inside the app rather than as a push notification.
- **Seller** (`app/seller/page.js`):
  - Sees their orders, each with a dropdown.
  - The dropdown runs `update orders set status`, which RLS only allows on their own orders and only on that column.
- **`OrderCard.js`** shows the options in a fixed order, because Postgres JSON doesn't keep key order.

---

## 8. Seller and admin

**Seller form** (`app/seller/product/[id]/page.js`):
- **Product fields:** title, description, base and compare-at price (converted with `Number()` before saving), category, visibility.
- **Gallery photos:**
  - Each photo is resized in the browser (`resizeImage()`, max 1024px wide) and uploaded to the `product-images` storage bucket.
  - Each photo has an **"Applies to" dropdown**: *All colours* or one colour. This is saved as `colour_option_id`.
- **Option groups** (`components/OptionsEditor.js`): rows of name and extra price. Colour rows have a colour picker and a **Photo** box for that colour's main picture.
- **Saving:**
  1. Save the product row.
  2. Replace the gallery rows.
  3. For options: delete the removed rows, `upsert` the existing ones in a single request, and insert the new ones. Existing option ids are kept, so baskets stay valid.
- **AI helper** box at the top (see section 9).

**Admin** (`app/admin/page.js`):
- Lists all sellers and all listings, including hidden and pending ones.
- **Approve / Hide seller:** hiding a seller removes all their products from the shop.
- **Show / Hide listing:** applies to one product.
- **Purpose:** in a marketplace anyone can sign up to sell, so new sellers stay invisible until checked, and anything bad can be hidden.

---

## 9. AI feature (`app/api/ai-describe/route.js`)

1. **In the seller form:** the seller chooses a photo. It's resized, added to the gallery, and converted to base64.
2. **To our server:** it's sent to `/api/ai-describe` with the login token. The route rejects anyone who isn't a seller.
3. **To Gemini:** the route calls the Gemini model `gemini-flash-lite-latest` with plain `fetch`. The prompt asks for JSON (`{"title", "description"}`) and no brand names.
4. **Back to the form:** the route parses the JSON and returns it. The form fills in the title and description, and the seller can edit them.

The key stays on the server, and the free tier was enough. The first model I tried took over 60 seconds per photo; this one takes about 2–4 seconds.

---

## 10. PWA

- `public/manifest.json`: name, icons, and `"display": "standalone"` (full screen, no browser bar).
- `public/sw.js`: a minimal service worker that caches nothing on purpose, so prices are always live. Chrome requires one before offering "Install app".
- `components/RegisterServiceWorker.js` turns it on; `app/layout.js` links the manifest and the iPhone settings.
- **Install:**
  - Android Chrome: ⋮ → **Install app**.
  - iPhone Safari: Share → **Add to Home Screen**.
  - It only works on the `https://` live link.

---

## 11. Environment variables

| Name | Secret? | Used where |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | no | everywhere |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | no (RLS protects data) | browser (`lib/supabase.js`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes** (bypasses RLS) | `lib/supabaseServer.js`, `scripts/seed.mjs` |
| `GEMINI_API_KEY` | **yes** | `app/api/ai-describe/route.js` |

- **Locally:** they're in `.env.local`, which git ignores. **Live:** they're in Vercel → Settings → Environment Variables.
- **What the prefix means:** Next.js only sends `NEXT_PUBLIC_*` variables to the browser, so the secret keys never leave the server.

---

## 12. Running and testing

**Run it locally:**
1. Install packages:
   ```bash
   npm install
   ```
2. In Supabase's SQL editor, run `supabase/schema.sql`. Turn off "Confirm email".
3. Copy `.env.example` to `.env.local` and fill in the 4 values.
4. Create the test accounts and the bed:
   ```bash
   npm run seed
   ```
5. Start the app, then open http://localhost:3000:
   ```bash
   npm run dev
   ```

**Images:** `node scripts/make-placeholder-images.mjs` redraws them, and `npm run seed -- --images-only` relinks them to the existing bed.

**Test accounts:**

| Role | Email | Password |
|---|---|---|
| Buyer | buyer@demo.test | Demo-pass-123 |
| Seller | seller@demo.test | Demo-pass-123 |
| Admin | admin@demo.test | Demo-pass-123 |
| Seller, pending (for testing approval) | formtest-seller@demo.test | Test-pass-123 |

**Manual test checklist:**
- **Price:** King 5FT + 4 Drawers = £604.99. Tick Assembly → £644.98.
- **Colour:** click Blue. The title, the label and **all** gallery images change to blue versions.
- **Basket:** add the same options twice → quantity 2. Change the colour and add again → a new line.
- **Checkout and status:** as the buyer, place an order. As the seller, change its status. As the buyer, reopen My orders to see the message.
- **Seller form:** add a storage option and save. It appears on the product page.
- **Admin:** hide the bed → the shop is empty when logged out → Show it again.
- **Roles:** the buyer opening `/admin` sees "Admins only."

---

## 13. What I verified (final check)

- **Accounts:** all 4 accounts log in with the right role and land on the right page.
- **Permissions:** 12 database checks passed, for example that sellers can't edit others' products or approve themselves, visitors only see approved sellers, and nobody sees others' orders.
- **Pricing:** 6 option combinations, where the page price and the breakdown total both match the hand calculation.
- **Colour gallery:** every image belongs to the selected colour or is the shared size chart, with no broken images. Changing a photo's colour in the seller form changes the shop gallery.
- **Basket:** the same options merge; a different colour makes a separate line with that colour's image.
- **Checkout** (server route): total £644.98 for Blue + King + 4 Drawers + Assembly. The title and all 6 labels are saved. A missing colour, a fake option, or a seller using checkout are all rejected.
- **Orders:** a seller status change reaches the buyer; a seller trying to change the total gets "permission denied".
- **360px:** shop, product, basket, orders, login, admin, seller dashboard and seller form all fit, with no tap target under 44px on the buyer pages.
- **Build:** `npm run build` passes, with 6 packages, all used.
- **Not verified by me:** installing the PWA on a real phone.

## 14. Status

- **Works:** everything above (see `downloads/SUBMISSION.md` for what was verified).
- **Simplified:**
  - The basket is in the browser.
  - Images are my own SVG drawings.
  - Colour and size filters run in the browser.
  - The status notice is shown inside the app.
- **Not built:** push notifications, password reset, reviews, stock, more categories, real payments, emails and tracking. The last three are excluded by the brief.

---

## 15. Interview prep

**Likely live changes:**
- **Add a storage option:** seller → Edit → Storage → "+ Add storage option" → Save. It's a data change; no code is needed.
- **Change a price rule:** edit `calculatePrice()` in `lib/price.js`. The product page, the "Your bed" breakdown and checkout all follow automatically.
- **Add a new option group, e.g. Mattress:**
  1. Add it to the `group_name` check in the schema (and run that change in Supabase).
  2. Add it to `REQUIRED_GROUPS` and `GROUP_LABELS` in `lib/price.js`.
  3. The seller form picks it up automatically, because its group list comes from `GROUP_LABELS`.
- **Add a photo for one colour:** seller form → upload → set "Applies to" to that colour → Save.

**Questions I should be ready for:**
- *How do you stop price tampering?* The server recalculates from the database with the same function and never reads a price from the browser.
- *Is the public key safe?* Yes. RLS decides access; the secret key is server-only.
- *How do colour images work?* Each colour's photos are linked by `colour_option_id`, and the gallery filters by the selected colour. No CSS filters.
- *Why one options table?* It keeps options as data that the seller manages, which the brief requires.
- *Why copy options into `order_items`?* Orders are history, so later price edits mustn't change them.
- *Why a PWA?* It's allowed by the brief, it's one codebase, and it uses the same backend automatically.
