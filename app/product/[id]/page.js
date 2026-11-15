'use client';
// PRODUCT PAGE: loads the product, its images and options from the database,
// keeps track of what the buyer picked, and shows the live price.
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { addToCart } from '@/lib/cart';
import { calculatePrice, buildOptionLabels, discountPercent, formatPrice, titleWithColour, round2, REQUIRED_GROUPS } from '@/lib/price';
import Gallery from '@/components/Gallery';
import ProductOptions from '@/components/ProductOptions';
import PriceBreakdown from '@/components/PriceBreakdown';

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [images, setImages] = useState([]);
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState({}); // { colour: id, size: id, ... }
  const [addons, setAddons] = useState([]); // ticked add-on ids
  const [message, setMessage] = useState('');

  // 1. Load everything once when the page opens.
  useEffect(() => {
    async function load() {
      // seller:profiles(full_name) = also fetch the seller's name through seller_id.
      const { data: p } = await supabase
        .from('products').select('*, category:categories(name), seller:profiles(full_name)').eq('id', id).single();
      const { data: imgs } = await supabase.from('product_images').select('*').eq('product_id', id).order('position');
      const { data: opts } = await supabase.from('product_options').select('*').eq('product_id', id).order('position');
      setProduct(p);
      setImages(imgs || []);
      setOptions(opts || []);

      // Pre-select the first choice in each group.
      // For colour, the one named in the title wins, e.g. "Cream Naples".
      const firstChoice = {};
      for (const group of REQUIRED_GROUPS) {
        const inGroup = (opts || []).filter((o) => o.group_name === group);
        const match = group === 'colour' && inGroup.find((o) => p?.title.includes(o.name));
        if (inGroup.length) firstChoice[group] = (match || inGroup[0]).id;
      }
      setSelected(firstChoice);
    }
    load();
  }, [id]);

  if (!product) return <p className="py-16 text-center text-muted">Loading...</p>;

  // 2. Everything below is re-calculated on every click = "live" price.
  const selectedIds = [...Object.values(selected), ...addons];
  const price = calculatePrice(product, options, selectedIds);
  const colour = options.find((o) => o.id === selected.colour);
  const title = titleWithColour(product.title, colour?.name);
  const discount = discountPercent(product);
  // The crossed-out price scales with the options by the same ratio
  // (£539.98 / £269.99 = 2x), so the "50% OFF" badge stays true for every combination.
  const compareAt = product.compare_at_price
    ? round2(price * (product.compare_at_price / product.base_price))
    : null;

  // "prev => ..." always starts from React's LATEST value. Using the
  // `selected` variable directly could lose a click if two happen before the
  // page re-renders (each would overwrite the other).
  const selectOption = (group, optionId) => setSelected((prev) => ({ ...prev, [group]: optionId }));
  const toggleAddon = (optionId) =>
    setAddons((prev) => (prev.includes(optionId) ? prev.filter((a) => a !== optionId) : [...prev, optionId]));

  function handleAddToBasket() {
    addToCart({
      productId: product.id,
      title,
      image: colour?.image_url || images[0]?.url, // the chosen colour's main image
      optionIds: selectedIds,
      optionLabels: buildOptionLabels(options, selectedIds),
      unitPrice: price,
    });
    setMessage('Added to basket');
    setTimeout(() => setMessage(''), 2500);
  }

  return (
    // pb-32 leaves space so the sticky bar doesn't cover the last option.
    <div className="pb-32">
      <nav className="text-sm text-muted mb-4">
        <Link href="/" className="hover:text-walnut">Shop</Link> <span className="mx-1">›</span>
        Furniture <span className="mx-1">›</span> {product.category?.name}
      </nav>

      {/* Gallery gets the wider column; it stays in view (sticky) while the options scroll. */}
      {/* minmax(0,1fr): on phones the single column is exactly the screen width
          (a plain grid column would grow to fit its widest content). */}
      <div className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-8 lg:gap-14">
        <div className="md:sticky md:top-24 self-start min-w-0">
          <Gallery images={images} colour={colour} alt={title} />
        </div>

        <div className="space-y-6 min-w-0">
          {/* Title: product name in bold serif, colour name as a lighter italic second line. */}
          <div>
            {product.seller?.full_name && (
              <p className="text-xs uppercase tracking-[0.2em] text-walnut font-semibold mb-3">Sold by {product.seller.full_name}</p>
            )}
            <h1 className="font-display leading-[1.05]">
              <span className="block text-4xl md:text-5xl font-semibold">{title.split(' - ')[0]}</span>
              {colour && <span className="block text-2xl md:text-3xl italic font-normal text-walnut mt-1">{colour.name}</span>}
            </h1>
          </div>

          {/* Price panel */}
          <div className="rounded-2xl bg-sand px-5 py-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-4xl font-bold tracking-tight">{formatPrice(price)}</span>
              {compareAt && <span className="line-through text-muted text-lg">{formatPrice(compareAt)}</span>}
              {discount > 0 && <span className="bg-sale/10 text-sale text-xs font-bold px-2.5 py-1 rounded-full">{discount}% OFF</span>}
            </div>
            {compareAt && (
              <p className="text-sm mt-1">
                <span className="text-sale font-semibold">You save {formatPrice(compareAt - price)}</span>
                <span className="text-muted"> · price updates as you choose</span>
              </p>
            )}
          </div>

          <p className="text-muted leading-relaxed">{product.description}</p>

          <ProductOptions
            options={options}
            selected={selected}
            onSelect={selectOption}
            addons={addons}
            onToggleAddon={toggleAddon}
          />

          <PriceBreakdown product={product} options={options} selectedIds={selectedIds} total={price} />
        </div>
      </div>

      {/* Sticky bar: always visible at the bottom while scrolling. Shows the
          chosen colour's picture, a short summary of the choices and the price. */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-line z-30 shadow-[0_-8px_30px_rgba(35,32,28,0.08)]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          {colour?.image_url && <img src={colour.image_url} alt="" className="hidden sm:block w-16 h-12 object-cover rounded-lg" />}
          <div className="flex-1 min-w-0">
            <p className="hidden sm:block text-sm font-semibold truncate">{title}</p>
            <p className="hidden sm:block text-xs text-muted truncate">
              {['size', 'storage'].map((g) => options.find((o) => o.id === selected[g])?.name).filter(Boolean).join(' · ')}
            </p>
            <p className="sm:hidden font-bold text-lg leading-tight">{formatPrice(price)}</p>
            {message && <Link href="/cart" className="text-green-700 text-sm underline">✓ {message} · View basket</Link>}
          </div>
          <span className="hidden sm:block font-bold text-xl">{formatPrice(price)}</span>
          <button className="btn flex-1 sm:flex-none sm:px-10 max-w-xs min-h-[48px]" onClick={handleAddToBasket}>Add to Basket</button>
        </div>
      </div>
    </div>
  );
}
