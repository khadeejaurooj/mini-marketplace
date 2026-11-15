// =====================================================================
// Seed script: creates the 3 test accounts and the Prague Divan Bed.
// Run once AFTER running supabase/schema.sql:
//     npm run seed
// It uses the secret service-role key from .env.local (never committed),
// because creating users and setting the admin role needs full access.
// Safe to re-run: existing users are reused and the bed is re-created.
// =====================================================================
import { createClient } from '@supabase/supabase-js';
import { COLOURS, COLOUR_VIEWS, slug } from './colours.mjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test accounts (sample data only - also listed in the README).
const PASSWORD = 'Demo-pass-123';
const ACCOUNTS = [
  { email: 'buyer@demo.test',  full_name: 'Demo Buyer',  role: 'buyer' },
  { email: 'seller@demo.test', full_name: 'Demo Seller', role: 'seller' },
  { email: 'admin@demo.test',  full_name: 'Demo Admin',  role: 'admin' },
];

// Create a user (or find it if it already exists) and return its id.
async function ensureUser({ email, full_name, role }) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name, role },
  });
  let id = data?.user?.id;
  if (error) {
    // Already exists -> look it up in the user list.
    const { data: list } = await supabase.auth.admin.listUsers();
    id = list.users.find((u) => u.email === email)?.id;
    if (!id) throw error;
  }
  // Set the final role/status directly (the sign-up trigger never allows admin,
  // and new sellers start 'pending' - our demo seller is pre-approved).
  await supabase.from('profiles').upsert({ id, full_name, role, status: 'approved' });
  console.log(`user ready: ${email} (${role})`);
  return id;
}

// ---------------------------------------------------------------------
// Gallery: link every colour to its own set of images.
//   - colour option.image_url        = that colour's main (front) picture
//   - product_images with colour_option_id = that colour's other views
//   - product_images with NULL colour = shown for every colour (size chart)
// Images are made by scripts/make-placeholder-images.mjs.
// ---------------------------------------------------------------------
async function setGallery(productId) {
  const { data: colourOptions } = await supabase
    .from('product_options').select('id, name').eq('product_id', productId).eq('group_name', 'colour');

  const images = [];
  for (const colour of colourOptions) {
    const folder = `/images/colours/${slug(colour.name)}`;
    await supabase.from('product_options').update({ image_url: `${folder}/front.svg` }).eq('id', colour.id);
    COLOUR_VIEWS.forEach((view, i) =>
      images.push({ product_id: productId, url: `${folder}/${view}.svg`, position: i + 1, colour_option_id: colour.id })
    );
  }
  images.push({ product_id: productId, url: '/images/sizes.svg', position: 99, colour_option_id: null });

  await supabase.from('product_images').delete().eq('product_id', productId);
  const { error } = await supabase.from('product_images').insert(images);
  if (error) throw error;
  console.log(`Gallery set: ${colourOptions.length} colours x ${COLOUR_VIEWS.length + 1} images + size chart.`);
}

async function main() {
  // "npm run seed -- --images-only" refreshes the gallery of the existing bed
  // without re-creating it (keeps its id, orders and links).
  if (process.argv.includes('--images-only')) {
    const { data: bed } = await supabase.from('products').select('id').like('title', 'Prague Divan Bed%').single();
    return setGallery(bed.id);
  }

  const ids = {};
  for (const account of ACCOUNTS) ids[account.role] = await ensureUser(account);

  // Remove an old copy of the bed so the script can be re-run.
  await supabase.from('products').delete().eq('seller_id', ids.seller).like('title', 'Prague Divan Bed%');

  const { data: product, error } = await supabase
    .from('products')
    .insert({
      seller_id: ids.seller,
      category_id: 2, // Furniture > Divan Beds
      title: 'Prague Divan Bed - Cream Naples',
      description:
        'A classic upholstered divan bed with a padded base, optional storage drawers and a matching headboard. Choose your colour, size, storage and base.',
      base_price: 269.99,
      compare_at_price: 539.98,
    })
    .select()
    .single();
  if (error) throw error;

  // All option groups. price_extra is added to the base price.
  // Colours (names from the reference page) live in scripts/colours.mjs.
  const groups = {
    size: [['Small Single 2FT6', 90], ['Single 3FT', 95], ['Small Double 4FT', 100], ['Double 4FT6', 110], ['King 5FT', 125], ['Super King 6FT', 150]],
    storage: [['No Storage', 0], ['2 Drawers Left Side', 50], ['2 Drawers Right Side', 45], ['2 Drawers Foot End', 155], ['4 Drawers', 210]],
    headboard: [['FREE 26" Headboard', 0], ['54" Floor Standing Headboard', 10]],
    base: [['Standard Base (holds 50 stone)', 0], ['Reinforced Base (holds 100 stone)', 25]],
    addon: [['Professional Assembly', 39.99]],
  };

  const options = COLOURS.map(([name, hex], i) => ({
    product_id: product.id, group_name: 'colour', name, price_extra: 0, swatch_hex: hex, position: i,
  }));
  for (const [group_name, rows] of Object.entries(groups)) {
    rows.forEach(([name, price_extra], i) =>
      options.push({ product_id: product.id, group_name, name, price_extra, position: i })
    );
  }
  const { error: optError } = await supabase.from('product_options').insert(options);
  if (optError) throw optError;

  // Images need the colour option ids, so they are added after the options.
  await setGallery(product.id);
  console.log(`Prague Divan Bed created with ${options.length} options. Done!`);
}

main().catch((err) => {
  console.error('Seed failed:', err.message || err);
  process.exit(1);
});
