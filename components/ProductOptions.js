'use client';
// The "configurator" on the product page: one numbered step per option group.
// Everything is built from the product_options rows in the database -
// nothing about the bed is hard-coded here.
//
// selected = { colour: optionId, size: optionId, ... }   (one per group)
// addons   = [optionId, ...]                             (ticked extras)
import { GROUP_LABELS, REQUIRED_GROUPS, formatPrice } from '@/lib/price';

// "+£125.00" for paid options, "Included" for free ones.
const extraLabel = (opt) => (Number(opt.price_extra) > 0 ? `+${formatPrice(opt.price_extra)}` : 'Included');

// Split "Small Single 2FT6" into a big code ("2FT6") and the rest ("Small Single"),
// so size cards can show the size code prominently. Names without a code are left as they are.
function splitSize(name) {
  const parts = name.split(' ');
  const last = parts[parts.length - 1];
  return /\d/.test(last) ? { code: last, rest: parts.slice(0, -1).join(' ') } : { code: name, rest: '' };
}

// Header of one step: number, group name, current choice.
function StepHeader({ number, label, value }) {
  return (
    <div className="flex items-baseline gap-3 mb-3">
      <span className="w-6 h-6 shrink-0 rounded-full bg-ink text-white text-xs font-bold inline-flex items-center justify-center">{number}</span>
      <span className="font-semibold">{label}</span>
      <span className="text-sm text-muted truncate">{value}</span>
    </div>
  );
}

// A small round tick shown on the selected card.
const Tick = () => (
  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-ink text-white text-xs inline-flex items-center justify-center shadow">✓</span>
);

export default function ProductOptions({ options, selected, onSelect, addons, onToggleAddon }) {
  const byGroup = (group) => options.filter((o) => o.group_name === group);
  const selectedOf = (group) => options.find((o) => o.id === selected[group]);
  const groups = REQUIRED_GROUPS.filter((g) => byGroup(g).length > 0);
  const addonOptions = byGroup('addon');

  return (
    <div className="rounded-3xl bg-white border border-line shadow-[0_8px_30px_rgba(35,32,28,0.06)] divide-y divide-line">
      {groups.map((group, index) => {
        const current = selectedOf(group);
        const isSelected = (opt) => selected[group] === opt.id;
        return (
          <section key={group} className="p-5">
            <StepHeader number={index + 1} label={GROUP_LABELS[group]} value={current ? `${current.name} · ${extraLabel(current)}` : ''} />

            {/* COLOUR: picture tiles (the bed in that colour) + a round swatch. */}
            {group === 'colour' && (
              <div className="grid grid-cols-4 gap-2.5">
                {byGroup(group).map((opt) => (
                  <button
                    key={opt.id}
                    aria-label={opt.name}
                    aria-pressed={isSelected(opt)}
                    onClick={() => onSelect(group, opt.id)}
                    className={`relative rounded-xl p-1.5 text-left transition border ${
                      isSelected(opt) ? 'border-ink ring-1 ring-ink bg-sand' : 'border-line hover:border-muted bg-white'
                    }`}
                  >
                    {isSelected(opt) && <Tick />}
                    {opt.image_url
                      ? <img src={opt.image_url} alt="" className="w-full aspect-[4/3] object-cover rounded-lg" />
                      : <span className="block w-full aspect-[4/3] rounded-lg" style={{ background: opt.swatch_hex }} />}
                    <span className="flex items-start gap-1.5 mt-1.5">
                      <span className="w-3.5 h-3.5 mt-0.5 shrink-0 rounded-full border border-black/15" style={{ background: opt.swatch_hex }} />
                      <span className="text-[11px] leading-tight">{opt.name}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* SIZE: cards with a large size code. */}
            {group === 'size' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {byGroup(group).map((opt) => {
                  const { code, rest } = splitSize(opt.name);
                  return (
                    <button
                      key={opt.id}
                      aria-pressed={isSelected(opt)}
                      onClick={() => onSelect(group, opt.id)}
                      className={`relative rounded-xl px-3 py-3 text-left border transition min-h-[72px] ${
                        isSelected(opt) ? 'border-ink ring-1 ring-ink bg-sand' : 'border-line hover:border-muted bg-white'
                      }`}
                    >
                      {isSelected(opt) && <Tick />}
                      <span className="block font-display text-xl font-semibold leading-none">{code}</span>
                      <span className="block text-xs text-muted mt-1">{rest}</span>
                      <span className="block text-xs font-semibold mt-1">{extraLabel(opt)}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* STORAGE / HEADBOARD / BASE: cards with a radio-style marker. */}
            {group !== 'colour' && group !== 'size' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {byGroup(group).map((opt) => (
                  <button
                    key={opt.id}
                    aria-pressed={isSelected(opt)}
                    onClick={() => onSelect(group, opt.id)}
                    className={`rounded-xl px-4 py-3 text-left border transition flex items-center gap-3 min-h-[52px] ${
                      isSelected(opt) ? 'border-ink ring-1 ring-ink bg-sand' : 'border-line hover:border-muted bg-white'
                    }`}
                  >
                    <span className={`w-5 h-5 shrink-0 rounded-full border-2 ${isSelected(opt) ? 'border-ink bg-ink shadow-[inset_0_0_0_3px_white]' : 'border-line'}`} />
                    <span className="flex-1 text-sm">{opt.name}</span>
                    <span className={`text-sm ${Number(opt.price_extra) > 0 ? 'font-semibold' : 'text-muted'}`}>{extraLabel(opt)}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {/* EXTRAS: optional tick boxes, e.g. Professional Assembly. */}
      {addonOptions.length > 0 && (
        <section className="p-5">
          <StepHeader
            number={groups.length + 1}
            label={GROUP_LABELS.addon}
            value={addonOptions.filter((o) => addons.includes(o.id)).map((o) => o.name).join(', ') || 'Optional'}
          />
          {addonOptions.map((opt) => (
            <label key={opt.id} className="flex items-center gap-3 min-h-[56px] px-4 rounded-xl border border-line bg-white cursor-pointer has-[:checked]:border-ink has-[:checked]:ring-1 has-[:checked]:ring-ink has-[:checked]:bg-sand">
              <input type="checkbox" className="w-5 h-5 accent-ink" checked={addons.includes(opt.id)} onChange={() => onToggleAddon(opt.id)} />
              <span className="flex-1">
                <span className="block text-sm font-semibold">{opt.name}</span>
                <span className="block text-xs text-muted">Optional - added to your order</span>
              </span>
              <span className="text-sm font-semibold">+{formatPrice(opt.price_extra)}</span>
            </label>
          ))}
        </section>
      )}
    </div>
  );
}
