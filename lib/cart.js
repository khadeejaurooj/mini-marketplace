// =====================================================================
// CART - kept in the browser's localStorage (simple, no database table).
// The cart only becomes real data when the buyer checks out (an order).
//
// Each cart line = one product + one exact combination of options.
// The line "key" is built from the product id + sorted option ids, so:
//   same bed, same options       -> same key  -> quantity goes up
//   same bed, different options  -> new key   -> separate cart line
// =====================================================================
const STORAGE_KEY = 'mm_cart';

export function getCart() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return []; // storage blocked or broken -> start with an empty cart
  }
}

function saveCart(cart) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  // Tell the nav bar (cart counter) that the cart changed.
  window.dispatchEvent(new Event('cart-changed'));
}

// line = { productId, title, image, optionIds, optionLabels, unitPrice }
export function addToCart(line) {
  const cart = getCart();
  const key = line.productId + ':' + [...line.optionIds].sort().join(',');
  const existing = cart.find((item) => item.key === key);
  if (existing) existing.quantity += 1;
  else cart.push({ ...line, key, quantity: 1 });
  saveCart(cart);
}

export function updateQuantity(key, quantity) {
  const cart = getCart()
    .map((item) => (item.key === key ? { ...item, quantity } : item))
    .filter((item) => item.quantity > 0); // quantity 0 = remove
  saveCart(cart);
}

export function clearCart() {
  saveCart([]);
}

export function cartCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}
