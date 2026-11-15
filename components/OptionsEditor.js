'use client';
// Seller form section for ONE option group (e.g. "Storage").
// Each row = one choice with a name and an extra price.
// Colour rows instead have a swatch colour + their OWN product image,
// which the buyer sees when they click that swatch.
//
// rows:          options of this group, e.g. [{ id?, name, price_extra, swatch_hex, image_url }]
// onChange:      called with the new list of rows
// onUploadImage: (file) => uploads it and returns the public URL (colour rows only)
export default function OptionsEditor({ label, group, rows, onChange, onUploadImage }) {
  const updateRow = (index, field, value) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  const addRow = () => onChange([...rows, { group_name: group, name: '', price_extra: 0, swatch_hex: '#cccccc' }]);
  const removeRow = (index) => onChange(rows.filter((_, i) => i !== index));

  async function handleColourImage(index, file) {
    if (!file) return;
    const url = await onUploadImage(file);
    if (url) updateRow(index, 'image_url', url);
  }

  return (
    <div className="card space-y-2">
      <p className="font-semibold">{label}</p>
      {rows.map((row, i) => (
        <div key={row.id || i} className="flex gap-2 items-center">
          {group === 'colour' && (
            <>
              <input type="color" className="w-11 h-11 shrink-0 rounded" value={row.swatch_hex || '#cccccc'} onChange={(e) => updateRow(i, 'swatch_hex', e.target.value)} aria-label="Swatch colour" />
              {/* Clicking the thumbnail opens a file picker for this colour's image. */}
              <label className="w-14 h-11 shrink-0 rounded-lg border border-dashed border-line overflow-hidden cursor-pointer flex items-center justify-center text-xs text-muted bg-sand" title="Upload this colour's image">
                {row.image_url ? <img src={row.image_url} alt="" className="w-full h-full object-cover" /> : 'Photo'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleColourImage(i, e.target.files[0])} />
              </label>
            </>
          )}
          {/* min-w-0 lets the name box shrink so the row fits a 360px phone */}
          <input className="input min-w-0" placeholder="Name" value={row.name} onChange={(e) => updateRow(i, 'name', e.target.value)} />
          {group !== 'colour' && (
            <input className="input w-24 shrink-0" type="number" step="0.01" min="0" placeholder="+£" value={row.price_extra} onChange={(e) => updateRow(i, 'price_extra', e.target.value)} aria-label="Extra price" />
          )}
          <button type="button" className="btn btn-light w-11 px-0 shrink-0" onClick={() => removeRow(i)} aria-label="Remove">✕</button>
        </div>
      ))}
      <button type="button" className="text-sm underline min-h-[44px]" onClick={addRow}>+ Add {label.toLowerCase()} option</button>
    </div>
  );
}
