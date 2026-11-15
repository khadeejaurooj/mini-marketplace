'use client';
// SELLER PRODUCT FORM - add (/seller/product/new) or edit (/seller/product/<id>).
// The seller enters the title, prices, photos and ALL option groups here,
// so nothing about the bed is hard-coded in the buyer pages.
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUser, authFetch } from '@/lib/useUser';
import { GROUP_LABELS } from '@/lib/price';
import OptionsEditor from '@/components/OptionsEditor';

// Every option group, in display order (taken from lib/price.js so the list lives in one place).
const GROUPS = Object.keys(GROUP_LABELS);
const EMPTY = { title: '', description: '', base_price: '', compare_at_price: '', category_id: 2, status: 'active' };

// Shrink a photo in the browser to max 1024px wide JPEG. Keeps uploads small
// and fast on mobile data, and under the AI service's image size limit.
function resizeImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1024 / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(resolve, 'image/jpeg', 0.85);
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function ProductFormPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const router = useRouter();
  const { user, profile } = useUser();

  const [product, setProduct] = useState(EMPTY);
  const [images, setImages] = useState([]); // [{ id?, url }]
  const [options, setOptions] = useState([]); // all option rows, every group
  const [originalOptionIds, setOriginalOptionIds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState('');

  // Load categories, and the existing product when editing.
  useEffect(() => {
    supabase.from('categories').select('*').then(({ data }) => setCategories(data || []));
    if (isNew) return;
    (async () => {
      const { data: p } = await supabase.from('products').select('*').eq('id', id).single();
      const { data: imgs } = await supabase.from('product_images').select('*').eq('product_id', id).order('position');
      const { data: opts } = await supabase.from('product_options').select('*').eq('product_id', id).order('position');
      setProduct(p);
      setImages(imgs || []);
      setOptions(opts || []);
      setOriginalOptionIds((opts || []).map((o) => o.id));
    })();
  }, [id, isNew]);

  const setField = (field) => (e) => setProduct({ ...product, [field]: e.target.value });

  // Replace all rows of one group with the edited list from OptionsEditor.
  // (prev => ...) always uses the latest list, even after an upload finishes.
  const setGroupRows = (group) => (rows) =>
    setOptions((prev) => [...prev.filter((o) => o.group_name !== group), ...rows]);

  // Upload an image to Supabase Storage and return { url, blob }.
  async function uploadImage(file) {
    const blob = await resizeImage(file);
    const path = `${user.id}/${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('product-images').upload(path, blob, { contentType: 'image/jpeg' });
    if (error) {
      alert(error.message);
      return null;
    }
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return { url: data.publicUrl, blob };
  }

  // Upload a photo and add it to the product gallery.
  async function uploadPhoto(file) {
    const uploaded = await uploadImage(file);
    if (uploaded) setImages((prev) => [...prev, { url: uploaded.url }]);
    return uploaded?.blob;
  }

  // Upload the image for ONE colour (used by the colour rows in OptionsEditor).
  async function uploadColourImage(file) {
    setStatus('Uploading colour image...');
    const uploaded = await uploadImage(file);
    setStatus('');
    return uploaded?.url;
  }

  async function handlePhotos(e) {
    setStatus('Uploading photos...');
    for (const file of e.target.files) await uploadPhoto(file);
    setStatus('');
  }

  // AI FEATURE: send the photo to our /api/ai-describe route, which asks
  // Google Gemini to suggest a title + description. The seller can still edit them.
  async function handleAiPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setStatus('AI is looking at your photo...');
    const blob = await uploadPhoto(file);
    if (!blob) return setStatus('');
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]); // drop "data:image/jpeg;base64,"
      reader.readAsDataURL(blob);
    });
    try {
      const result = await authFetch('/api/ai-describe', { imageBase64: base64 });
      setProduct((p) => ({ ...p, title: result.title, description: result.description }));
      setStatus('AI filled in the title and description - please check them.');
    } catch (err) {
      setStatus('AI error: ' + err.message);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setStatus('Saving...');
    // Prices are converted to NUMBERS before saving (the columns are numeric).
    const productData = {
      title: product.title,
      description: product.description,
      base_price: Number(product.base_price),
      compare_at_price: product.compare_at_price === '' || product.compare_at_price === null ? null : Number(product.compare_at_price),
      category_id: Number(product.category_id),
      status: product.status,
    };

    // 1. Save the product row.
    const query = isNew
      ? supabase.from('products').insert({ ...productData, seller_id: user.id })
      : supabase.from('products').update(productData).eq('id', id);
    const { data: saved, error } = await query.select().single();
    if (error) return setStatus('Error: ' + error.message);
    const productId = saved.id;

    // 2. Images: simplest approach - delete the old rows, insert the current list in order.
    //    colour_option_id links a photo to one colour (empty = every colour).
    await supabase.from('product_images').delete().eq('product_id', productId);
    await supabase.from('product_images').insert(
      images.map((img, i) => ({ product_id: productId, url: img.url, position: i, colour_option_id: img.colour_option_id || null }))
    );

    // 3. Options: delete removed rows, update existing ones, insert new ones.
    //    (We keep existing ids so baskets that use them stay valid.)
    const rows = options
      .filter((o) => o.name.trim())
      .map((o) => ({
        product_id: productId,
        group_name: o.group_name,
        name: o.name.trim(),
        price_extra: Number(o.price_extra) || 0,
        swatch_hex: o.swatch_hex || null,
        image_url: o.image_url || null,
        // position = order within its group
        position: options.filter((x) => x.group_name === o.group_name).indexOf(o),
        ...(o.id ? { id: o.id } : {}),
      }));
    const keptIds = rows.filter((r) => r.id).map((r) => r.id);
    const removedIds = originalOptionIds.filter((oid) => !keptIds.includes(oid));
    if (removedIds.length) await supabase.from('product_options').delete().in('id', removedIds);
    // upsert = update all existing rows (matched by id) in ONE request.
    const existingRows = rows.filter((r) => r.id);
    if (existingRows.length) {
      const { error: updError } = await supabase.from('product_options').upsert(existingRows);
      if (updError) return setStatus('Error: ' + updError.message);
    }
    const newRows = rows.filter((r) => !r.id);
    if (newRows.length) {
      const { error: optError } = await supabase.from('product_options').insert(newRows);
      if (optError) return setStatus('Error: ' + optError.message);
    }

    router.push('/seller');
  }

  if (profile && profile.role !== 'seller') return <p>Sellers only.</p>;

  return (
    <form onSubmit={handleSave} className="max-w-2xl mx-auto space-y-4 pb-10">
      <h1 className="page-title">{isNew ? 'Add product' : 'Edit product'}</h1>

      <div className="card space-y-3 bg-sand">
        <p className="font-semibold">✨ AI helper</p>
        <p className="text-sm">Upload a product photo and AI will suggest a title and description.</p>
        <input type="file" accept="image/*" onChange={handleAiPhoto} className="text-sm" />
      </div>

      <div className="card space-y-3">
        <div><label className="label">Title</label><input className="input" required value={product.title} onChange={setField('title')} /></div>
        <div><label className="label">Description</label><textarea className="input" rows={4} value={product.description || ''} onChange={setField('description')} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Base price (£)</label><input className="input" type="number" step="0.01" min="0" required value={product.base_price} onChange={setField('base_price')} /></div>
          <div><label className="label">Compare-at price (£)</label><input className="input" type="number" step="0.01" min="0" value={product.compare_at_price ?? ''} onChange={setField('compare_at_price')} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Category</label>
            <select className="input" value={product.category_id} onChange={setField('category_id')}>
              {categories.filter((c) => c.parent_id).map((c) => (
                <option key={c.id} value={c.id}>{categories.find((p) => p.id === c.parent_id)?.name} &gt; {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Visibility</label>
            <select className="input" value={product.status} onChange={setField('status')}>
              <option value="active">Active</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card space-y-3">
        <p className="font-semibold">Gallery photos ({images.length})</p>
        <p className="text-sm text-muted">
          Choose which colour each photo shows. Buyers only see the photos of the colour they pick, plus photos set to
          &quot;All colours&quot;. Each colour&apos;s main photo is set in the Colour section below.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {images.map((img, i) => (
            <div key={i} className="flex items-center gap-2 border border-line rounded-xl p-2">
              <img src={img.url} alt="" className="w-16 h-12 object-cover rounded shrink-0" />
              {/* Only saved colours have an id, so new colours appear here after saving. */}
              <select className="input min-w-0" value={img.colour_option_id || ''} aria-label="Photo colour"
                onChange={(e) => setImages(images.map((x, j) => (j === i ? { ...x, colour_option_id: e.target.value || null } : x)))}>
                <option value="">All colours</option>
                {options.filter((o) => o.group_name === 'colour' && o.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="button" className="btn btn-light w-11 px-0 shrink-0" aria-label="Remove photo" onClick={() => setImages(images.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
        </div>
        <input type="file" accept="image/*" multiple onChange={handlePhotos} className="text-sm" />
      </div>

      <h2 className="font-display text-xl font-semibold">Options &amp; prices</h2>
      <p className="text-sm text-muted">Extra prices are added to the base price. The first option in each group is pre-selected for buyers.</p>
      {GROUPS.map((group) => (
        <OptionsEditor
          key={group}
          group={group}
          label={GROUP_LABELS[group]}
          rows={options.filter((o) => o.group_name === group)}
          onChange={setGroupRows(group)}
          onUploadImage={uploadColourImage}
        />
      ))}

      {status && <p className="text-sm">{status}</p>}
      <button className="btn w-full">Save product</button>
    </form>
  );
}
