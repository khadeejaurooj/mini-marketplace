'use client';
// BUYER: "My orders". Row Level Security only returns this buyer's own orders.
//
// Bonus from the brief: an "order status changed" message.
// We remember (in localStorage) the status of each order the last time the
// buyer looked. If the seller has changed it since, we show a message.
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/useUser';
import OrderCard from '@/components/OrderCard';

const SEEN_KEY = 'mm_seen_order_status';

export default function OrdersPage() {
  const { user, loading } = useUser();
  const [orders, setOrders] = useState(null);
  const [justPlaced, setJustPlaced] = useState(false);
  const [changes, setChanges] = useState([]); // e.g. [{ id, from: 'New', to: 'Shipped' }]

  useEffect(() => {
    // "?placed=1" is added by the checkout to show a thank-you message.
    setJustPlaced(new URLSearchParams(window.location.search).has('placed'));
    if (!user) return;
    supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = data || [];
        setOrders(list);

        // Compare with the statuses we saw last time, then save the new ones.
        let seen = {};
        try { seen = JSON.parse(localStorage.getItem(SEEN_KEY)) || {}; } catch {}
        setChanges(
          list
            .filter((o) => seen[o.id] && seen[o.id] !== o.status)
            .map((o) => ({ id: o.id, from: seen[o.id], to: o.status }))
        );
        const now = Object.fromEntries(list.map((o) => [o.id, o.status]));
        try { localStorage.setItem(SEEN_KEY, JSON.stringify(now)); } catch {}
      });
  }, [user]);

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>Please log in to see your orders.</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="page-title">My orders</h1>
      {justPlaced && <p className="card bg-green-50 text-green-800">Thank you! Your order has been placed.</p>}

      {changes.map((c) => (
        <p key={c.id} className="card bg-amber-50 text-amber-900">
          🔔 Order #{c.id.slice(0, 8)} status changed: <strong>{c.from}</strong> → <strong>{c.to}</strong>
        </p>
      ))}

      {orders?.length === 0 && <p>No orders yet.</p>}
      {orders?.map((order) => <OrderCard key={order.id} order={order} />)}
    </div>
  );
}
