'use client';
// ADMIN: approve / hide sellers and show / hide listings.
// Only admins get data here - the RLS rules (is_admin()) block everyone else.
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/useUser';
import { formatPrice } from '@/lib/price';

export default function AdminPage() {
  const { profile, loading } = useUser();
  const [sellers, setSellers] = useState([]);
  const [products, setProducts] = useState([]);

  // Load every seller (pending, approved, hidden) and every listing.
  // Normal users would get only public rows back; is_admin() in the RLS
  // rules is what lets the admin see the hidden and pending ones too.
  async function load() {
    const { data: s } = await supabase.from('profiles').select('*').eq('role', 'seller').order('created_at');
    const { data: p } = await supabase.from('products').select('*, seller:profiles(full_name)').order('created_at');
    setSellers(s || []);
    setProducts(p || []);
  }

  useEffect(() => {
    if (profile?.role === 'admin') load();
  }, [profile]);

  // Approve / hide a seller. The shop only lists products whose seller is
  // 'approved', so hiding a seller hides ALL their products at once.
  async function setSellerStatus(id, status) {
    await supabase.from('profiles').update({ status }).eq('id', id);
    load();
  }

  // Show / hide one listing ('active' = visible in the shop).
  async function setProductStatus(id, status) {
    await supabase.from('products').update({ status }).eq('id', id);
    load();
  }

  if (loading) return <p>Loading...</p>;
  if (profile?.role !== 'admin') return <p>Admins only.</p>;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="page-title text-2xl mb-4">Sellers</h1>
        <div className="space-y-2">
          {sellers.map((s) => (
            <div key={s.id} className="card flex flex-wrap justify-between items-center gap-2">
              <div>
                <p className="font-semibold">{s.full_name || 'Unnamed seller'}</p>
                <p className="text-sm text-muted">Status: {s.status}</p>
              </div>
              <div className="flex gap-2">
                <button className="btn" disabled={s.status === 'approved'} onClick={() => setSellerStatus(s.id, 'approved')}>Approve</button>
                <button className="btn btn-light" disabled={s.status === 'hidden'} onClick={() => setSellerStatus(s.id, 'hidden')}>Hide</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="page-title text-2xl mb-4">Listings</h2>
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.id} className="card flex flex-wrap justify-between items-center gap-2">
              <div>
                <p className="font-semibold">{p.title}</p>
                <p className="text-sm text-muted">{p.seller?.full_name} · {formatPrice(p.base_price)} · {p.status}</p>
              </div>
              {p.status === 'active' ? (
                <button className="btn btn-light" onClick={() => setProductStatus(p.id, 'hidden')}>Hide</button>
              ) : (
                <button className="btn" onClick={() => setProductStatus(p.id, 'active')}>Show</button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
