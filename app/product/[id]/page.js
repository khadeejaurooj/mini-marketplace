'use client';
// PRODUCT PAGE: loads the product, its images and options from the database,
// keeps track of what the buyer picked, and shows the live price.
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { addToCart } from '@/lib/cart';
import { calculatePrice, discountPercent, formatPrice, titleWithColour, round2, GROUP_LABELS, REQUIRED_GROUPS } from '@/lib/price';
import Gallery from '@/components/Gallery';
import ProductOptions from '@/components/ProductOptions';

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
      const { data: p } = await supabase.from('products').select('*, category:categories(name)').eq('id', id).single();
      const { data: imgs } = await supabase.from('product_images').select('*').eq('product_id', id).order('position');
      const { data: opts } = await supabase.from('product_options').select('*').eq('product_id', id).order('position');
      setProduct(p);
      setImages(imgs || []);
      setOptions(opts || []);

      // Pre-select the first choice in each group (like the reference page).
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

  const selectOption = (group, optionId) => setSelected({ ...selected, [group]: optionId });
  const toggleAddon = (optionId) =>
    setAddons(addons.includes(optionId) ? addons.filter((a) => a !== optionId) : [...addons, optionId]);

  function handleAddToBasket() {
    // Labels for the cart line, e.g. { Colour: "Cream Naples", Size: "King 5FT", ... }
    const optionLabels = {};
    for (const group of REQUIRED_GROUPS) {
      const opt = options.find((o) => o.id === selected[group]);
      if (opt) optionLabels[GROUP_LABELS[group]] = opt.name;
    }
    const addonNames = options.filter((o) => addons.includes(o.id)).map((o) => o.name);
    optionLabels[GROUP_LABELS.addon] = addonNames.length ? addonNames.join(', ') : 'None';

    addToCart({
      productId: product.id,
      sellerId: product.seller_id,
      title,
      image: colour?.image_url || images[0]?.url, // the chosen colour's own image
      optionIds: selectedIds,
      optionLabels,
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

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        <div className="md:sticky md:top-24 self-start min-w-0">
          <Gallery images={images} colourImage={colour?.image_url} alt={title} />
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-walnut font-semibold mb-2">Sold by Demo Seller</p>
          <h1 className="page-title">{title}</h1>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <span className="text-3xl font-bold">{formatPrice(price)}</span>
            {compareAt && <span className="line-through text-muted text-lg">{formatPrice(compareAt)}</span>}
            {discount > 0 && <span className="bg-sale text-white text-xs font-bold px-2.5 py-1 rounded-full">{discount}% OFF</span>}
          </div>
          {compareAt && <p className="text-sm text-sale mt-1">You save {formatPrice(compareAt - price)}</p>}

          <p className="text-muted leading-relaxed my-6">{product.description}</p>

          <div className="border-t border-line pt-6">
            <ProductOptions
              options={options}
              selected={selected}
              onSelect={selectOption}
              addons={addons}
              onToggleAddon={toggleAddon}
            />
          </div>
        </div>
      </div>

      {/* Sticky bar: always visible at the bottom while scrolling. */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-line z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          {colour?.image_url && <img src={colour.image_url} alt="" className="hidden sm:block w-14 h-11 object-cover rounded-md" />}
          <div className="flex-1 min-w-0">
            <p className="hidden sm:block text-sm text-muted truncate">{title}</p>
            <p className="font-bold text-lg leading-tight">{formatPrice(price)}</p>
            {message && <Link href="/cart" className="text-green-700 text-sm underline">✓ {message} · View</Link>}
          </div>
          <button className="btn flex-1 max-w-xs min-h-[48px]" onClick={handleAddToBasket}>Add to Basket</button>
        </div>
      </div>
    </div>
  );
}
