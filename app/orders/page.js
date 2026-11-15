'use client';
// BUYER: "My orders". Row Level Security only returns this buyer's own orders.
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/useUser';
import OrderCard from '@/components/OrderCard';

export default function OrdersPage() {
  const { user, loading } = useUser();
  const [orders, setOrders] = useState(null);
  const [justPlaced, setJustPlaced] = useState(false);

  useEffect(() => {
    // "?placed=1" is added by the checkout to show a thank-you message.
    setJustPlaced(new URLSearchParams(window.location.search).has('placed'));
    if (!user) return;
    supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setOrders(data || []));
  }, [user]);

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>Please log in to see your orders.</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="page-title">My orders</h1>
      {justPlaced && <p className="card bg-green-50 text-green-800">Thank you! Your order has been placed.</p>}
      {orders?.length === 0 && <p>No orders yet.</p>}
      {orders?.map((order) => <OrderCard key={order.id} order={order} />)}
    </div>
  );
}
