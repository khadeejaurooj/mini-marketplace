'use client';
// One product tile in the shop list.
// Shows the image of the colour named in the title (or the filtered colour),
// and on desktop, hovering a colour dot previews that colour's image.
import { useState } from 'react';
import Link from 'next/link';
import { formatPrice, discountPercent } from '@/lib/price';

export default function ProductCard({ product, highlightColour }) {
  const colours = product.product_options
    .filter((o) => o.group_name === 'colour')
    .sort((a, b) => a.position - b.position);
  const [hovered, setHovered] = useState(null);

  // Which colour to show: hovered dot > colour filter > colour in the title > first.
  const shown =
    hovered ||
    colours.find((c) => c.name === highlightColour) ||
    colours.find((c) => product.title.includes(c.name)) ||
    colours[0];
  const firstGalleryImage = [...product.product_images].sort((a, b) => a.position - b.position)[0];
  const image = shown?.image_url || firstGalleryImage?.url;
  const discount = discountPercent(product);

  return (
    <Link href={`/product/${product.id}`} className="group block rounded-2xl bg-white border border-line overflow-hidden hover:shadow-lg transition">
      <div className="relative aspect-[4/3] bg-sand overflow-hidden">
        {image && <img src={image} alt={product.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-300" />}
        {discount > 0 && (
          <span className="absolute top-3 left-3 bg-sale text-white text-xs font-bold px-2.5 py-1 rounded-full">{discount}% OFF</span>
        )}
      </div>
      <div className="p-4">
        <h2 className="font-display text-lg font-semibold leading-snug">{product.title}</h2>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-sm text-muted">From</span>
          <span className="font-bold text-lg">{formatPrice(product.base_price)}</span>
          {product.compare_at_price && <span className="line-through text-sm text-muted">{formatPrice(product.compare_at_price)}</span>}
        </div>
        <div className="flex items-center gap-1.5 mt-3">
          {colours.map((c) => (
            <span
              key={c.name}
              title={c.name}
              onMouseEnter={() => setHovered(c)}
              onMouseLeave={() => setHovered(null)}
              className={`w-5 h-5 rounded-full border border-black/10 ${shown?.name === c.name ? 'ring-1 ring-offset-1 ring-ink' : ''}`}
              style={{ background: c.swatch_hex }}
            />
          ))}
          <span className="text-xs text-muted ml-1">{colours.length} colours</span>
        </div>
      </div>
    </Link>
  );
}
