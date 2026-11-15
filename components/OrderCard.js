// Shows one order with all its lines and chosen options.
// Used by both the buyer's "My orders" page and the seller page.
// onStatusChange is only passed on the seller page -> shows a dropdown.
import { formatPrice, GROUP_LABELS } from '@/lib/price';

export const STATUSES = ['New', 'Confirmed', 'Shipped', 'Delivered'];

const statusColour = {
  New: 'bg-blue-100 text-blue-800',
  Confirmed: 'bg-amber-100 text-amber-800',
  Shipped: 'bg-purple-100 text-purple-800',
  Delivered: 'bg-green-100 text-green-800',
};

export default function OrderCard({ order, onStatusChange }) {
  return (
    <div className="card space-y-2">
      <div className="flex flex-wrap justify-between gap-2 items-center">
        <div>
          <p className="font-display font-semibold text-lg">Order #{order.id.slice(0, 8)}</p>
          <p className="text-xs text-muted">{new Date(order.created_at).toLocaleString()}</p>
        </div>
        {onStatusChange ? (
          <select className="input w-auto" value={order.status} onChange={(e) => onStatusChange(order.id, e.target.value)}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        ) : (
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColour[order.status]}`}>{order.status}</span>
        )}
      </div>

      {onStatusChange && (
        <p className="text-sm text-muted">Ship to: {order.customer_name}, {order.address}</p>
      )}

      {order.order_items.map((item) => (
        <div key={item.id} className="border-t border-line pt-2 text-sm">
          <p className="font-medium">{item.quantity} × {item.title} — {formatPrice(item.unit_price)}</p>
          <p className="text-muted">
            {/* Postgres JSON doesn't keep key order, so we list them in our fixed order. */}
            {Object.values(GROUP_LABELS)
              .filter((label) => item.options[label])
              .map((label) => `${label}: ${item.options[label]}`)
              .join(' · ')}
          </p>
        </div>
      ))}
      <p className="text-right font-bold">Total: {formatPrice(order.total)}</p>
    </div>
  );
}
