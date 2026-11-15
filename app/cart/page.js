'use client';
// BASKET + FAKE CHECKOUT on one page (fewer steps = easier with one thumb).
// The cart lives in localStorage (lib/cart.js). On "Place order" we send the
// chosen product + option ids to /api/checkout, which re-calculates the
// price on the server from the database and saves the order.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCart, updateQuantity, clearCart } from '@/lib/cart';
import { formatPrice, round2 } from '@/lib/price';
import { useUser, authFetch } from '@/lib/useUser';

export default function CartPage() {
  const router = useRouter();
  const { profile } = useUser();
  const [cart, setCart] = useState([]);
  const [form, setForm] = useState({ customer_name: '', address: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Read the cart from localStorage, and re-read whenever it changes.
  useEffect(() => {
    const refresh = () => setCart(getCart());
    refresh();
    window.addEventListener('cart-changed', refresh);
    return () => window.removeEventListener('cart-changed', refresh);
  }, []);

  const total = round2(cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0));

  async function placeOrder(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      // Only ids + quantities are sent. Prices are NOT trusted from the browser.
      await authFetch('/api/checkout', {
        ...form,
        items: cart.map((item) => ({ productId: item.productId, optionIds: item.optionIds, quantity: item.quantity })),
      });
      clearCart();
      router.push('/orders?placed=1');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (cart.length === 0) {
    return (
      <div className="text-center py-16">
        <h1 className="page-title mb-2">Your basket is empty</h1>
        <p className="text-muted mb-6">Find a bed you love and configure it to your size.</p>
        <Link href="/" className="btn">Continue shopping</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title mb-6">Basket</h1>
      <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
        {/* One card per cart line, showing EVERY chosen option. */}
        <div className="space-y-3">
          {cart.map((item) => (
            <div key={item.key} className="card flex gap-4">
              <img src={item.image} alt="" className="w-24 h-20 sm:w-32 sm:h-24 object-cover rounded-xl bg-sand shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-lg leading-snug">{item.title}</p>
                <dl className="text-sm text-muted mt-1 grid grid-cols-[auto_1fr] gap-x-2">
                  {Object.entries(item.optionLabels).map(([label, value]) => (
                    <div key={label} className="contents">
                      <dt>{label}:</dt>
                      <dd className="text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center rounded-full border border-line">
                    <button className="w-11 h-11 rounded-full hover:bg-sand" onClick={() => updateQuantity(item.key, item.quantity - 1)} aria-label="Decrease quantity">−</button>
                    <span className="w-6 text-center font-semibold">{item.quantity}</span>
                    <button className="w-11 h-11 rounded-full hover:bg-sand" onClick={() => updateQuantity(item.key, item.quantity + 1)} aria-label="Increase quantity">+</button>
                  </div>
                  <span className="font-bold text-lg">{formatPrice(item.unitPrice * item.quantity)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary + fake checkout - no real payment is taken. */}
        <div className="card lg:sticky lg:top-24 space-y-4">
          <h2 className="font-display text-xl font-semibold">Order summary</h2>
          <div className="flex justify-between text-sm"><span className="text-muted">Items</span><span>{cart.reduce((n, i) => n + i.quantity, 0)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted">Delivery</span><span>Free (demo)</span></div>
          <div className="flex justify-between text-lg font-bold border-t border-line pt-3"><span>Total</span><span>{formatPrice(total)}</span></div>

          {profile?.role === 'buyer' ? (
            <form onSubmit={placeOrder} className="space-y-3">
              <input className="input" placeholder="Full name" required value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
              <textarea className="input" placeholder="Delivery address" rows={3} required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              {error && <p className="text-sale text-sm">{error}</p>}
              <button className="btn w-full min-h-[52px]" disabled={busy}>{busy ? 'Placing order...' : `Place order · ${formatPrice(total)}`}</button>
              <p className="text-xs text-muted text-center">Demo checkout: no payment is taken.</p>
            </form>
          ) : (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted">Log in as a buyer to check out.</p>
              <Link href="/login" className="btn w-full">Log in</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
