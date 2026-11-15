'use client';
// SELLER DASHBOARD: my products + incoming orders (with status dropdown).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/useUser';
import { formatPrice } from '@/lib/price';
import OrderCard from '@/components/OrderCard';

export default function SellerPage() {
  const { user, profile, loading } = useUser();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  // My products (including hidden ones) + orders placed for my products.
  // order_items(*) = also fetch each order's lines in the same request.
  async function load() {
    const { data: p } = await supabase.from('products').select('*').eq('seller_id', user.id).order('created_at');
    const { data: o } = await supabase
      .from('orders').select('*, order_items(*)').eq('seller_id', user.id).order('created_at', { ascending: false });
    setProducts(p || []);
    setOrders(o || []);
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  // RLS + the column grant in schema.sql only let a seller change the status
  // of their OWN orders.
  async function changeStatus(orderId, status) {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (error) alert(error.message);
    else setOrders(orders.map((o) => (o.id === orderId ? { ...o, status } : o)));
  }

  if (loading) return <p>Loading...</p>;
  if (profile?.role !== 'seller') return <p>This page is for sellers only.</p>;

  return (
    <div className="space-y-6">
      {profile.status !== 'approved' && (
        <p className="card bg-amber-50 text-amber-800">
          Your seller account is <strong>{profile.status}</strong>. Your products will be visible to buyers once an admin approves you.
        </p>
      )}

      <section>
        <div className="flex justify-between items-center mb-3">
          <h1 className="page-title">My products</h1>
          <Link href="/seller/product/new" className="btn">+ Add product</Link>
        </div>
        {products.length === 0 && <p>No products yet.</p>}
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.id} className="card flex justify-between items-center gap-2">
              <div>
                <p className="font-semibold">{p.title}</p>
                <p className="text-sm text-muted">From {formatPrice(p.base_price)} · {p.status}</p>
              </div>
              <Link href={`/seller/product/${p.id}`} className="btn btn-light">Edit</Link>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="page-title text-2xl mb-4">Incoming orders</h2>
        {orders.length === 0 && <p>No orders yet.</p>}
        <div className="space-y-3">
          {orders.map((order) => <OrderCard key={order.id} order={order} onStatusChange={changeStatus} />)}
        </div>
      </section>
    </div>
  );
}
