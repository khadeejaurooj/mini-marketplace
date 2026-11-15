# MVP Skills Test: Mini Marketplace (Web + App)

**Candidate:** [I WILL ADD THIS]
**Date submitted:** [I WILL ADD THIS]

| | |
|---|---|
| Live web app | [I WILL ADD THIS] |
| Mobile app (PWA) | [I WILL ADD THIS: same as the live link] |
| GitHub repository | [I WILL ADD THIS] |
| Demo video (3 min) | [I WILL ADD THIS] |

---

## 1. Plan

**What I understood from the JD and your projects:**
[I WILL COMPLETE THIS]

**What I understood from the brief:** a multi-vendor marketplace, tested through one configurable product. The core of it is:
- product options and prices that come from the database
- separate buyer, seller and admin roles, with permissions enforced
- orders that move through statuses
- a good experience on a phone

I built the options data model and the product page with live pricing first, then the basket, checkout and orders, then the seller tools, admin, mobile/PWA and the AI feature.

**Stack:** Next.js 15 (React, JavaScript), Tailwind CSS, Supabase (PostgreSQL, Auth, Storage), Google Gemini API, Vercel. The mobile app is a PWA built from the same codebase.

**Database tables:**
- `profiles`: role and status
- `categories`
- `products`: prices stored as `numeric`
- `product_options`: one table for every option group, each with a numeric `price_extra`
- `product_images`: optionally linked to a colour
- `orders`
- `order_items`: a snapshot of the chosen options and price

**Skipped on purpose:**
- Real payments, emails, delivery tracking and analytics (as the brief says)
- Password reset, reviews, stock levels
- Phone push notifications
- App-store builds

**Time split:** [I WILL COMPLETE THIS]

**Questions for the team:** [I WILL COMPLETE THIS]

---

## 2. Test accounts

| Role | Email | Password |
|---|---|---|
| Buyer | buyer@demo.test | Demo-pass-123 |
| Seller | seller@demo.test | Demo-pass-123 |
| Admin | admin@demo.test | Demo-pass-123 |

New accounts can be created from **Sign up** on the login page. New sellers stay *pending*, and their products stay hidden, until the admin approves them. All data is sample data.

---

## 3. What's implemented

### The product: Prague Divan Bed
- **Price:** title, base price £269.99, and compare-at price £539.98 shown crossed out with a "50% OFF" badge.
- **Category:** Furniture > Divan Beds, the only category, as requested.
- **8 colour swatches**, with names from the reference page's swatch list, shown above the other options. Choosing a colour:
  - shows the selected state
  - shows its name next to "Colour:"
  - updates the product title
  - swaps the **whole gallery** to that colour's own images (front, side, headboard, drawers, fabric)
- **Colour-specific images are stored in the database:** each gallery image can be linked to one colour. No CSS filters are used.
- **Options:** Size (6), Storage (5), Headboard (2), Base (2), and Professional Assembly (£39.99) as a tick box, with the prices from the brief.
- **Gallery:** 6 images per colour (5 colour views plus a size chart), with thumbnails, arrows on desktop, swipe on phones, and click or tap to enlarge.
- **Product page design:**
  - Room-scene images and a large framed gallery.
  - The product name and colour name on two lines.
  - A price panel.
  - A numbered configurator with colour picture tiles (each with a round swatch), size-code cards and option cards that show "+£" or "Included".
  - A "Your bed" breakdown (base price plus each option equals the total).
  - A sticky bar summarising the choices.
- **No reference-site branding:** no brand name, logo or photos from the reference site. The images are my own illustrations, and sellers can upload real photos.

### Rules from section 2.3
- **Live price:** it updates immediately when any option changes.
- **Basket lines** show colour, size, storage, headboard, base and extras.
- **Different combinations** are separate basket lines; the same combination increases the quantity.
- **Options, prices and colour photos are entered by the seller** in the seller form. The buyer page builds everything from the database.
- **Prices are stored as numbers** (`numeric(10,2)`).
- **The server recalculates every price at checkout,** so a price changed in the browser is ignored.

### Web app
| Area | What's implemented |
|---|---|
| Seller | Sign up and log in. Add and edit a product: details, gallery photos (each tagged to a colour or to all colours), a main photo per colour, and all option groups with prices. Incoming orders with status changes (New, Confirmed, Shipped, Delivered). |
| Buyer | Sign up and log in, product list, search, filters (price, colour, size, category), product page, basket, fake checkout (no payment), and an order list with a message when a status changes. |
| Admin | Approve or hide sellers, and show or hide listings. Access is limited by role and enforced by database security rules, not only by the page. |
| AI feature | "Describe my product photo": the seller uploads a photo and Google Gemini suggests a title and description, which the seller can edit. |

### Mobile
- **Responsive from 360px** with no sideways scrolling.
- **Swatches, option buttons and Add to Basket** are at least 44px tall.
- **The gallery** swipes.
- **Add to Basket** stays in a sticky bar at the bottom.
- **Basket and checkout** are on one page.
- **Installable PWA** with its own icon, opening full screen, using the same backend and database.
- **Required app screens** all exist: product list with search, product page with options and live price, basket, order list and login.
- **Optional bonus:** an in-app "order status changed" message for the buyer (not a push notification).

**Install the app:**
- **Android (Chrome):** open the live link → ⋮ → **Install app**.
- **iPhone (Safari):** Share → **Add to Home Screen**.

**Tested on a real phone:** [I WILL COMPLETE THIS: phone model and result]

---

## 4. How it works

- **Pages read and write Supabase directly.** Row Level Security rules on every table decide what each user can do. For example:
  - Shoppers only see active listings from approved sellers.
  - Sellers only edit their own products.
  - A seller can change only the *status* of their own orders.
  - Nobody can register as admin.
- **Two server routes** handle work that mustn't run in the browser:
  - `/api/checkout` verifies the buyer, recalculates prices from the database and creates one order per seller.
  - `/api/ai-describe` keeps the AI key on the server.
- **One shared price function** is used by both the product page and checkout, so the shown price and the charged price can't differ.
- **Product options live in one table.** Adding an option is a new row entered by the seller, with no code change.
- **Secrets are environment variables** and aren't in the repository.

The README has the setup steps and the database details.

---

## 5. Testing

I tested these flows manually and with small scripts against the real database. Section 7 lists what still needs checking.

- **Roles:**
  - Sign-up as a buyer creates a buyer.
  - Sign-up as a seller creates a pending seller.
  - Sign-up claiming "admin" becomes a buyer.
  - Each test account lands on its own dashboard (Shop, Seller, Admin), and the other dashboards refuse it.
- **Permissions** (checked against the database with the public key):
  - Buyers can't create products.
  - Sellers can't edit other sellers' products, approve themselves, see other sellers' orders, or change an order total.
  - A pending seller's product is hidden until the admin approves it.
- **Pricing:** 6 option combinations checked against hand calculations. The page price, the "Your bed" breakdown total, the title, the colour label and the compare-at price all matched. Rapid clicks with no pause in between were also tested.
- **Colour images:** for several colours, every gallery image belonged to the selected colour (5 views plus the shared size chart), with no images from other colours. Changing a tag in the seller form changed which images the shop shows.
- **Basket and checkout:**
  - Separate lines per combination.
  - The server-calculated order total matches the page.
  - A made-up option id and a logged-out request are both rejected.
- **Orders:** the seller's status change shows on the buyer's order list, along with the "status changed" message.
- **AI:** returns a title and description for an uploaded photo.
- **Mobile layout:** buyer pages checked at 360px for overflow and tap-target size.

---

## 6. AI notes

**Tools I used, and for which parts:** [I WILL COMPLETE THIS]

**AI inside the product:** Google Gemini (`gemini-flash-lite-latest`) for photo-to-listing.

**Things the AI got wrong that had to be fixed:**
1. **Colour images:** it first imitated colours with a CSS filter over one image, then only swapped the first image. It now stores real images per colour in the database, and the whole gallery changes.
2. **The discount price:** the crossed-out price was "current price + £269.99", which made "50% OFF" untrue once options were added.
3. **Layout at 360px:** its shared CSS overrode Tailwind utilities and made the seller form wider than a phone screen.
4. **Model choice:** the first Gemini model it chose took 60–80 seconds per photo, so it was replaced with a faster one.
5. **Lost clicks:** option changes were built from a stale copy of the selection, so quick consecutive clicks could overwrite each other. Testing with no pause between clicks exposed it, and React's functional state update fixed it.

[I WILL COMPLETE THIS: which example I'll describe, in my own words]

---

## 7. Honest status

**Simplified:**
- The basket is stored in the browser, not the database.
- Product images are illustrations rather than real photos.
- Colour and size filters run in the browser (search, price and category run in the database).
- The status-change notice is shown inside the app.

**Pricing note:** the brief gives £269.99 as the small-single price but also lists Small Single as +£90. I followed the size table, so the default combination is £359.99. It's a data value the seller can edit.

**Not built:** push notifications, password reset, reviews, stock levels, and multiple categories.

**Still to check:** [I WILL COMPLETE THIS]

**With 2 more weeks:**
- Save the basket in the database.
- Use real product photography.
- Move filtering to the server and add pagination.
- Add Stripe test-mode payments.
- Send order notifications (web push or email).
- Write automated tests for pricing and checkout.
- Track stock per variant.
- Support more categories.

[I WILL COMPLETE THIS: anything else]
