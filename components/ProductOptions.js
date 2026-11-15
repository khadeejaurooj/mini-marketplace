'use client';
// All option pickers for the product page. Everything is built from the
// product_options rows in the database - nothing is hard-coded here.
//
// selected = { colour: optionId, size: optionId, ... }   (one per group)
// addons   = [optionId, ...]                             (ticked extras)
import { GROUP_LABELS, REQUIRED_GROUPS, formatPrice } from '@/lib/price';

export default function ProductOptions({ options, selected, onSelect, addons, onToggleAddon }) {
  // Options of one group, keeping the seller's order.
  const byGroup = (group) => options.filter((o) => o.group_name === group);
  const selectedName = (group) => options.find((o) => o.id === selected[group])?.name;

  return (
    <div className="space-y-6">
      {/* Colour swatches - always shown first. */}
      {byGroup('colour').length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-3">
            Colour: <span className="font-normal text-muted">{selectedName('colour')}</span>
          </p>
          <div className="flex flex-wrap gap-2.5">
            {byGroup('colour').map((opt) => (
              <button
                key={opt.id}
                title={opt.name}
                aria-label={opt.name}
                aria-pressed={selected.colour === opt.id}
                onClick={() => onSelect('colour', opt.id)}
                // 44px circle = easy to tap. Selected = dark ring with a gap.
                className={`w-11 h-11 rounded-full border border-black/10 transition ${
                  selected.colour === opt.id ? 'ring-2 ring-offset-2 ring-ink' : 'hover:scale-105'
                }`}
                style={{ background: opt.swatch_hex || '#ccc' }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Size, storage, headboard, base: pick one in each group. */}
      {REQUIRED_GROUPS.filter((g) => g !== 'colour').map((group) =>
        byGroup(group).length === 0 ? null : (
          <div key={group}>
            <p className="text-sm font-semibold mb-3">
              {GROUP_LABELS[group]}: <span className="font-normal text-muted">{selectedName(group)}</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {byGroup(group).map((opt) => {
                const isSelected = selected[group] === opt.id;
                return (
                  <button
                    key={opt.id}
                    aria-pressed={isSelected}
                    onClick={() => onSelect(group, opt.id)}
                    className={`min-h-[48px] px-4 py-2 rounded-xl border text-left text-sm flex justify-between items-center gap-2 transition ${
                      isSelected ? 'border-ink bg-sand ring-1 ring-ink font-semibold' : 'border-line bg-white hover:border-muted'
                    }`}
                  >
                    <span>{opt.name}</span>
                    <span className={Number(opt.price_extra) > 0 ? '' : 'text-muted font-normal'}>
                      {Number(opt.price_extra) > 0 ? `+${formatPrice(opt.price_extra)}` : 'Included'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* Add-ons: optional tick boxes, e.g. Professional Assembly. */}
      {byGroup('addon').map((opt) => (
        <label key={opt.id} className="flex items-center gap-3 min-h-[56px] px-4 rounded-xl border border-line bg-white cursor-pointer has-[:checked]:border-ink has-[:checked]:bg-sand">
          <input
            type="checkbox"
            className="w-5 h-5 accent-ink"
            checked={addons.includes(opt.id)}
            onChange={() => onToggleAddon(opt.id)}
          />
          <span className="flex-1 text-sm font-medium">{opt.name}</span>
          <span className="text-sm font-semibold">+{formatPrice(opt.price_extra)}</span>
        </label>
      ))}
    </div>
  );
}
