// "Your bed" card on the product page: shows HOW the live price is made up.
//   Base price
//   + each chosen option that costs extra
//   = total (the same number calculatePrice() gives)
// Free options (e.g. "No Storage") are listed as "Included" so the buyer
// sees their whole configuration in one place.
import { formatPrice, GROUP_LABELS } from '@/lib/price';

export default function PriceBreakdown({ product, options, selectedIds, total }) {
  // Chosen options, in the same group order as the option pickers.
  const order = Object.keys(GROUP_LABELS);
  const chosen = options
    .filter((o) => selectedIds.includes(o.id))
    .sort((a, b) => order.indexOf(a.group_name) - order.indexOf(b.group_name));

  return (
    <div className="rounded-3xl border border-dashed border-line p-5">
      <h2 className="font-display text-xl font-semibold mb-3">Your bed</h2>
      <dl className="text-sm space-y-2">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Base price</dt>
          <dd>{formatPrice(product.base_price)}</dd>
        </div>
        {chosen.map((opt) => (
          <div key={opt.id} className="flex justify-between gap-4">
            <dt className="text-muted">{GROUP_LABELS[opt.group_name]}: <span className="text-ink">{opt.name}</span></dt>
            <dd className="shrink-0">{Number(opt.price_extra) > 0 ? `+${formatPrice(opt.price_extra)}` : 'Included'}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 border-t border-line pt-3 mt-1 text-lg font-bold">
          <dt>Total</dt>
          <dd>{formatPrice(total)}</dd>
        </div>
      </dl>
    </div>
  );
}
