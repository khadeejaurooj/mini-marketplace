'use client';
// Top navigation. Shows different links depending on the user's role.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/useUser';
import { cartCount } from '@/lib/cart';

export default function NavBar() {
  const { profile } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  // Keep the basket counter up to date (lib/cart.js fires 'cart-changed').
  useEffect(() => {
    const update = () => setCount(cartCount());
    update();
    window.addEventListener('cart-changed', update);
    return () => window.removeEventListener('cart-changed', update);
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  const role = profile?.role;
  // Highlight the link for the page we're on.
  const linkClass = (href) =>
    `px-2 min-h-[44px] inline-flex items-center hover:text-walnut ${pathname === href ? 'text-ink font-semibold' : 'text-muted'}`;

  // Layout: phones = [logo ... basket] on row 1, links on row 2.
  //         desktop = everything on one row (links move between logo and basket).
  return (
    <header className="bg-white/90 backdrop-blur border-b border-line sticky top-0 z-20">
      <nav className="max-w-6xl mx-auto px-4 flex flex-wrap items-center text-sm">
        <Link href="/" className="font-display text-xl font-semibold mr-auto py-2 text-ink">
          Mini Marketplace
        </Link>

        <div className="order-last md:order-none w-full md:w-auto flex items-center -ml-2 md:ml-0 md:mr-2">
          <Link href="/" className={linkClass('/')}>Shop</Link>
          {role === 'buyer' && <Link href="/orders" className={linkClass('/orders')}>My orders</Link>}
          {role === 'seller' && <Link href="/seller" className={linkClass('/seller')}>Seller</Link>}
          {role === 'admin' && <Link href="/admin" className={linkClass('/admin')}>Admin</Link>}
          {profile ? (
            <button onClick={logout} className="px-2 min-h-[44px] text-muted hover:text-walnut ml-auto md:ml-0">Log out</button>
          ) : (
            <Link href="/login" className={`${linkClass('/login')} ml-auto md:ml-0`}>Log in</Link>
          )}
        </div>

        <Link href="/cart" className="my-2 inline-flex items-center gap-2 rounded-full bg-sand px-4 min-h-[44px] font-semibold text-ink hover:bg-line">
          Basket
          <span className="bg-ink text-white rounded-full text-xs min-w-5 h-5 px-1 inline-flex items-center justify-center">{count}</span>
        </Link>
      </nav>
    </header>
  );
}
