# Assessment Questions & Answers

Every question or explanation the assessment asks for, answered from **what we actually built**.

---

## A. Plan items (section 5: "Plan, half a page")

### What did you understand about the project?
They're planning a multi-vendor marketplace, like Amazon or eBay, where many sellers list products and buyers buy from them. The hard parts of such a product are:
- **Configurable products:** one listing with many option combinations and prices.
- **Roles:** buyer, seller and admin, each seeing different data.
- **Orders that move through statuses.**
- **Working well on phones.**

This test is a small slice of that. It's built around one complex product, the Prague Divan Bed, to see if we can model options and pricing properly, end to end, from a database.

> ⚠️ The brief asks to start the plan with what we understood from **their JD**. Add 1–2 sentences of your own from the job description here.

### What would you build first?
The data model for products and options (one `product_options` table), then the product page with the live price. That's the core of the marketplace and worth the most points. After that: cart → checkout → orders, then seller and admin tools.

### Stack?
Next.js 15 (React) + Tailwind, Supabase (Postgres, Auth, Storage), deployed on Vercel, with a PWA for the mobile app. The reasons are in `IMPLEMENTATION_NOTES.md` section 2.

### Database tables?
`profiles`, `categories`, `products`, `product_images`, `product_options`, `orders`, `order_items`. See `supabase/schema.sql`.

### What will you skip?
- Real payments, emails, delivery tracking and analytics (the brief says to skip these)
- Push notifications (optional bonus)
- Password reset
- Product reviews
- Multiple categories
- App-store builds

### How will you split the time?
We had about 1 working day, so:
- Data model and setup: ~1.5h
- Auth: 1h
- Product page: 3h
- Cart and checkout: 1.5h
- Orders: 1h
- Seller form: 2h
- Shop filters, admin, PWA and AI: ~2.5h
- Docs and video: 1.5h

---

## B. Technical questions you should be ready for

### How do the product options work? Are they hard-coded?
No. Every option is a row in `product_options`, with `group_name` (colour, size, storage, headboard, base or addon), `name`, `price_extra` and `swatch_hex`.
- The seller enters them in the seller form (`components/OptionsEditor.js`).
- The product page loads them and builds the buttons from that data (`components/ProductOptions.js`).

### How is the price calculated?
`lib/price.js` → `calculatePrice()` = `base_price` + the sum of `price_extra` for every chosen option.
- **Example:** £269.99 + King 5FT £125 + 4 Drawers £210 + Floor Standing Headboard £10 + Reinforced Base £25 + Assembly £39.99 = **£679.98**.
- It's rounded to 2 decimal places to avoid floating-point errors.

### How does the price update immediately?
The chosen options are stored in React state. Every click updates the state, React re-renders, and the price is re-calculated during the render. There's no server call, so it's instant.

### What stops a buyer from changing the price in the browser?
The checkout never accepts a price from the browser. It only receives product ids, option ids and quantities. The server route re-loads the options from the database and re-calculates the price with the same function. It also checks that each option belongs to that product and that exactly one option per group is chosen.

### Why are prices stored as numbers?
The columns are `numeric(10,2)`, which is exact decimal maths, unlike floats. The form converts input with `Number()` before saving. This lets us do sums, filter by price (`gte`/`lte`) and sort correctly.

### How do two combinations of the same bed become two cart lines?
Each cart line has a key = product id + sorted option ids (`lib/cart.js`). The same combination merges into one line (quantity + 1). A different combination gets a different key, so it becomes a new line.

### How do roles and security work?
- Supabase Auth handles login.
- `profiles.role` stores buyer, seller or admin.
- **Row Level Security** policies in Postgres enforce access on every request, even if someone calls the database directly with the public key. For example:
  - A seller can only edit products where `seller_id = auth.uid()`.
  - A seller can update only the `status` column of their own orders.
  - The admin pages use `is_admin()`.
- Users can't make themselves admin.

### How are keys kept safe?
- All keys live in `.env.local`, which is git-ignored. `.env.example` shows the variable names without values.
- Only the public anon key reaches the browser (`NEXT_PUBLIC_` prefix).
- The service-role key and the Gemini key have no prefix, so Next.js keeps them on the server only (API routes and the seed script).
- On Vercel they're set as environment variables.

### Why one order per seller?
In a multi-vendor marketplace each seller ships their own items and manages their own order status. The checkout groups cart lines by `seller_id`.

### Why copy the options into `order_items` instead of linking to option ids?
An order is a record of what was bought at that moment. If the seller renames an option or changes a price later, past orders must not change.

### How does the mobile app use the same backend?
The PWA *is* the same Next.js site, installed to the home screen via `manifest.json` and a service worker. It uses the same Supabase database and API routes.

### Mobile requirements: how did you meet them?
- **360px with no sideways scroll:** single-column layouts on small screens, `overflow-x: hidden`, and the viewport meta tag.
- **44px tap targets:** the `.btn` and `.input` classes have `min-height: 44px`, swatches are `w-11 h-11` (44px), and checkboxes are large.
- **Swipe gallery:** touch start and end distance in `Gallery.js`.
- **Sticky Add to Basket:** a fixed bottom bar on the product page.
- **One-thumb checkout:** basket and checkout on one page with full-width buttons.

### How to install the PWA?
- **Android (Chrome):** open the live link → ⋮ menu → "Add to Home screen" / "Install app".
- **iPhone (Safari):** open the live link → Share button → "Add to Home Screen".

### What is the AI feature and why is it useful?
On the seller form, the seller uploads a product photo and Google Gemini suggests a title and description. Writing listings is the slowest part of selling, so this speeds up onboarding.
- **How it works:** the photo is resized in the browser and sent to our server route `/api/ai-describe`. The route calls the Gemini API (the key stays on the server), asks for JSON, and fills in the form. The seller reviews and edits the result. We chose Gemini because its free tier needs no payment card.

---

## C. "AI notes" (deliverable)

- **Tools used:** Claude Code (Claude) for planning, the database schema, writing components, and documentation. _Add any others you used._
- **For which parts:** _fill in honestly. For example: schema and security rules, components, the seed script, documentation. I directed the scope, reviewed the code and tested every flow._
- **Things the AI got wrong that we had to fix** (all found during testing; pick one for the notes):
  1. **The "50% OFF" badge was mathematically false.** The AI showed the crossed-out price as "price + £269.99". With King 5FT and 4 Drawers that was £604.99 against £874.98, which is only 31% off while the badge still said 50%. Fixed by scaling the compare-at price by the same ratio.
  2. **The CSS broke the 360px layout.** The AI put shared button and input styles outside Tailwind's CSS layers, so they silently overrode Tailwind classes like `w-24` and pushed the seller form to 413px wide. Fixed with `@layer components`.
  3. **A slow AI model.** The first Gemini model it chose took 60–80 seconds per photo. We measured it and switched to the "flash-lite" model (about 1.5 seconds).
  4. **One-request-per-row saving.** The seller form updated each option separately (~25 round trips to Tokyo). We changed it to a single `upsert`.
  5. **Fake colour images.** The AI "changed colour" by laying a CSS colour filter over one image instead of mapping each colour to its own image. I spotted it while reviewing and had it fixed in the data model. Each colour row now has its own `image_url` (uploadable in the seller form), and the gallery shows that image.

## D. "Honest status" (deliverable)

**Incomplete or simplified:**
- The cart is browser-only.
- Colour images are our own drawings (one per colour, linked in the database). There are no real photos, but sellers can upload one per colour.
- Colour and size filters run in JavaScript.
- There are no push notifications and no password reset.
- Only one category.

**With 2 more weeks:**
- A database cart synced across devices
- Real product photos per colour
- Server-side filtering and pagination
- Stripe test payments
- Order status notifications (web push or email)
- Seller analytics
- Automated tests for `calculatePrice` and the checkout
- Stock and inventory per variant

## E. Follow-up call: likely live changes

- **"Add a new storage option":** log in as the seller → Edit product → Storage → "+ Add storage option" → name and price → Save. No code change.
  - In code: it's a new row in `product_options`.
- **"Change a price rule"**, for example a 10% discount when assembly is chosen, or a minimum price: edit `calculatePrice()` in `lib/price.js`. The product page *and* the checkout both use it, so they stay in sync.
- **"Add a new option group"** (for example "Mattress"):
  1. Add it to the `group_name` check in `schema.sql`.
  2. Add it to `REQUIRED_GROUPS` and `GROUP_LABELS` in `lib/price.js`.
  3. Add it to `GROUPS` in the seller form.
