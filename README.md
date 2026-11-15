# Mini Marketplace (Web + PWA)

A small slice of a multi-vendor marketplace, built for the MVP skills test.

**Flow:**
1. A seller adds the *Prague Divan Bed* with colour swatches, size, storage, headboard, base and an assembly add-on.
2. A buyer picks options with a live price, adds to the basket and checks out (no real payment).
3. The seller moves the order through New → Confirmed → Shipped → Delivered.
4. An admin approves or hides sellers and listings.

- **Live link:** https://mini-marketplace-six-eta.vercel.app
- **Stack:** Next.js 15 (React, JavaScript) + Tailwind · Supabase (Postgres, Auth, Storage) · Google Gemini (AI) · Vercel

## Test accounts

| Role | Email | Password |
|---|---|---|
| Buyer | buyer@demo.test | Demo-pass-123 |
| Seller | seller@demo.test | Demo-pass-123 |
| Admin | admin@demo.test | Demo-pass-123 |

These are sample accounts only. No real customer data is used.

## Run it locally

1. Install Node 20 or later, then run:

   ```bash
   npm install
   ```

2. Create a free Supabase project. In the **SQL Editor**, run the whole of `supabase/schema.sql` (it already includes the changes in `supabase/migrations/`). Then go to **Authentication → Sign In / Providers → Email** and turn off "Confirm email".
3. Copy `.env.example` to `.env.local` and fill in:
   - **Supabase URL and keys:** Project Settings → API Keys
   - **Gemini key:** aistudio.google.com → Get API key (free)
4. Create the test accounts and the Prague bed:

   ```bash
   npm run seed
   ```

5. Start the app, then open http://localhost:3000:

   ```bash
   npm run dev
   ```

## How the database is set up

Everything is in `supabase/schema.sql`:

- **Tables:** `profiles` (role and status), `categories`, `products` (prices as `numeric`), `product_images`, `product_options` (one table for every option group, each row with a numeric `price_extra`), `orders`, `order_items` (a snapshot of the chosen options and price).
- **Row Level Security** on every table. Examples:
  - Shoppers only see active listings from approved sellers.
  - Sellers only edit their own products and can change only the *status* of their own orders.
  - Admin access is checked with `is_admin()`.
- A trigger creates the profile at sign-up. New sellers start as `pending`.
- A public storage bucket, `product-images`, holds the photos.

**Secrets:**
- `.env.local` is git-ignored.
- Only the public anon key reaches the browser.
- The service key and the AI key are used only in server routes (`app/api/*`) and the seed script.

## Install the mobile app (PWA)

- **Android (Chrome):** open the live link → ⋮ menu → **Install app** / **Add to Home screen**.
- **iPhone (Safari):** open the live link → **Share** → **Add to Home Screen**.

It opens full screen with its own icon and uses the same backend as the website.

## What's done

- Seller sign-up and login, plus a product form with photo upload and all option groups (nothing about the bed is hard-coded in the buyer pages)
- Buyer pages:
  - Product list with search and filters (price, colour, size, category)
  - Product page with:
    - 8 colour swatches (selected state, "Colour:" name, and the title and image update)
    - Size, storage, headboard and base options, plus the assembly tick box
    - Live price, and the crossed-out price with a "50% OFF" badge
    - A 5-image gallery (thumbnails, swipe, tap to enlarge) and a sticky Add to Basket bar
  - Basket (each option combination is its own line, all options shown) and a one-page fake checkout
- Prices recalculated on the server at checkout, so a price changed in the browser is ignored
- Orders: the buyer's order list (with a "status changed" message), and the seller's incoming orders with status changes
- Admin: approve or hide sellers, and show or hide listings
- AI: "describe my product photo" fills in the title and description (Gemini)
- Responsive from 360px with 44px tap targets; installable PWA
- Price checked on several option combinations against hand calculations

## What's not done or simplified (honest status)

- The basket is stored in the browser (localStorage), not the database.
- Colour images are our own drawings (one per colour, linked in the database). There are no real photos, but sellers can upload one per colour. There are no real product photos (by design: no Sonno images).
- Colour and size filters run in the browser. Search, price and category filters run in the database.
- Phone push notifications are not built. Instead, the buyer's "My orders" page shows a message when an order's status changed since the last visit. Password reset, reviews, stock levels, and more than one category are not built either.
- Real payments, emails, delivery tracking and analytics are skipped, as the brief allows.
- **Price note:** the brief lists £269.99 as the small-single price *and* Small Single as +£90. We followed the size table, so the default combination is £359.99. It can be changed in the seller form.

**With 2 more weeks:**
- A database-backed basket
- Real photos per colour
- Server-side filtering and pagination
- Stripe test mode
- Order-status notifications
- Automated tests for pricing and checkout
- Stock per variant

## Docs

- `downloads/SUBMISSION.md`: the assessment submission (plan, features, testing, AI notes, honest status)
- `downloads/INTERNAL_LEARNING_GUIDE.md`: a detailed guide to the code: architecture, a folder and file guide, and how each feature works
