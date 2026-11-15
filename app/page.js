'use client';
// SHOP (home page): product list with search + filters.
// - Search, price and category are filtered IN THE DATABASE query.
// - Colour and size are filtered here in JavaScript, because they live in the
//   product_options table (simpler than a complex join for a small demo).
// RLS makes sure only active products from approved sellers come back.
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ProductCard from '@/components/ProductCard';

const EMPTY_FILTERS = { search: '', min: '', max: '', category: '', colour: '', size: '' };

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('categories').select('*').then(({ data }) => setCategories(data || []));
  }, []);

  // Re-run the query whenever search / price / category changes.
  useEffect(() => {
    async function load() {
      setLoading(true);
      let query = supabase
        .from('products')
        .select('*, product_images(url, position), product_options(name, group_name, swatch_hex, image_url, position)')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (filters.search) query = query.ilike('title', `%${filters.search}%`); // case-insensitive "contains"
      if (filters.min) query = query.gte('base_price', Number(filters.min));
      if (filters.max) query = query.lte('base_price', Number(filters.max));
      if (filters.category) query = query.eq('category_id', Number(filters.category));
      const { data } = await query;
      setProducts(data || []);
      setLoading(false);
    }
    load();
  }, [filters.search, filters.min, filters.max, filters.category]);

  const setFilter = (field) => (e) => setFilters({ ...filters, [field]: e.target.value });
  const hasFilters = Object.values(filters).some(Boolean);

  // Lists for the colour/size dropdowns, built from the products' options.
  const namesIn = (group) => [
    ...new Set(products.flatMap((p) => p.product_options.filter((o) => o.group_name === group).map((o) => o.name))),
  ];
  const hasOption = (p, group, name) => !name || p.product_options.some((o) => o.group_name === group && o.name === name);
  const visible = products.filter((p) => hasOption(p, 'colour', filters.colour) && hasOption(p, 'size', filters.size));

  return (
    <div>
      {/* Page heading */}
      <section className="rounded-3xl bg-sand overflow-hidden mb-6 grid md:grid-cols-[1.2fr_1fr] items-center">
        <div className="px-6 py-8 md:px-10">
          <p className="text-xs uppercase tracking-widest text-walnut font-semibold mb-2">Furniture · Divan Beds</p>
          <h1 className="font-display text-3xl md:text-4xl font-semibold leading-tight">Beds made to your size, colour and storage</h1>
          <p className="text-muted mt-3">Pick a fabric, choose your options and see the price update instantly.</p>
        </div>
        {/* Decorative illustration, hidden on phones to save space */}
        <img src="/images/detail-5.svg" alt="" className="hidden md:block w-full h-full max-h-64 object-cover" />
      </section>

      {/* Search + filters */}
      <div className="card mb-6 space-y-3">
        <input className="input" placeholder="Search products..." value={filters.search} onChange={setFilter('search')} aria-label="Search" />
        {/* 2 columns on phones, 5 on bigger screens. */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <input className="input" type="number" placeholder="Min £" value={filters.min} onChange={setFilter('min')} aria-label="Minimum price" />
          <input className="input" type="number" placeholder="Max £" value={filters.max} onChange={setFilter('max')} aria-label="Maximum price" />
          <select className="input" value={filters.category} onChange={setFilter('category')} aria-label="Category">
            <option value="">All categories</option>
            {categories.filter((c) => c.parent_id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="input" value={filters.colour} onChange={setFilter('colour')} aria-label="Colour">
            <option value="">Any colour</option>
            {namesIn('colour').map((n) => <option key={n}>{n}</option>)}
          </select>
          <select className="input col-span-2 md:col-span-1" value={filters.size} onChange={setFilter('size')} aria-label="Size">
            <option value="">Any size</option>
            {namesIn('size').map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 text-sm text-muted">
        <span>{loading ? 'Loading...' : `${visible.length} product${visible.length === 1 ? '' : 's'}`}</span>
        {hasFilters && <button className="underline min-h-[44px]" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</button>}
      </div>

      {!loading && visible.length === 0 && <p className="card text-center text-muted py-10">No products match your search.</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {visible.map((p) => <ProductCard key={p.id} product={p} highlightColour={filters.colour} />)}
      </div>
    </div>
  );
}
