// =====================================================================
// PRICE RULES - one shared function used by BOTH:
//   - the product page (to show the live price in the browser), and
//   - the checkout API route (to re-check the price on the server, so a
//     buyer can't change the price in their browser and pay less).
// =====================================================================

// The option groups where the buyer must pick exactly one choice, in the
// order they are shown on the product page.
export const REQUIRED_GROUPS = ['colour', 'size', 'storage', 'headboard', 'base'];

// Labels shown to the buyer for each group.
export const GROUP_LABELS = {
  colour: 'Colour',
  size: 'Size',
  storage: 'Storage',
  headboard: 'Headboard',
  base: 'Base',
  addon: 'Extras',
};

// Rounds to 2 decimal places, avoiding float issues like 0.1 + 0.2 = 0.30000000000000004
export const round2 = (n) => Math.round(n * 100) / 100;

// Format a number as pounds, e.g. 269.99 -> "£269.99"
export const formatPrice = (n) => `£${Number(n).toFixed(2)}`;

// product:      { base_price, ... }
// options:      all rows from product_options for this product
// selectedIds:  list of the option ids the buyer has chosen (incl. ticked add-ons)
// Price = base price + the price_extra of every chosen option.
export function calculatePrice(product, options, selectedIds) {
  const extras = options
    .filter((opt) => selectedIds.includes(opt.id))
    .reduce((sum, opt) => sum + Number(opt.price_extra), 0);
  return round2(Number(product.base_price) + extras);
}

// Percentage discount for the "50% OFF" badge.
export function discountPercent(product) {
  if (!product.compare_at_price || product.compare_at_price <= product.base_price) return 0;
  return Math.round((1 - product.base_price / product.compare_at_price) * 100);
}

// Product title with the chosen colour, e.g. "Prague Divan Bed - Black Naples".
// We keep the part before " - " and swap in the colour name.
export function titleWithColour(title, colourName) {
  if (!colourName) return title;
  return `${title.split(' - ')[0]} - ${colourName}`;
}
