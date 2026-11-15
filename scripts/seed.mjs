// =====================================================================
// Seed script: creates the 3 test accounts and the Prague Divan Bed.
// Run once AFTER running supabase/schema.sql:
//     npm run seed
// It uses the secret service-role key from .env.local (never committed),
// because creating users and setting the admin role needs full access.
// Safe to re-run: existing users are reused and the bed is re-created.
// =====================================================================
import { createClient } from '@supabase/supabase-js';

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

async function main() {
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

  // 5 gallery detail images (our own SVGs, made by scripts/make-placeholder-images.mjs).
  const images = [1, 2, 3, 4, 5].map((n) => ({ product_id: product.id, url: `/images/detail-${n}.svg`, position: n }));
  await supabase.from('product_images').insert(images);

  // All option groups. price_extra is added to the base price.
  // Colour names taken from the reference page's swatch list.
  const colours = [
    ['Cream Naples', '#e6dcc6'],
    ['Charcoal Coniston', '#3d3f42'],
    ['Silver Plush Velvet', '#bfc1c3'],
    ['Seal Grey Naples', '#8a867e'],
    ['Emerald Coniston', '#1f5a45'],
    ['Pink Plush Velvet', '#e2b4b6'],
    ['Blue Plush Velvet', '#2e4868'],
    ['Black Naples', '#1f1f1f'],
  ];
  const groups = {
    size: [['Small Single 2FT6', 90], ['Single 3FT', 95], ['Small Double 4FT', 100], ['Double 4FT6', 110], ['King 5FT', 125], ['Super King 6FT', 150]],
    storage: [['No Storage', 0], ['2 Drawers Left Side', 50], ['2 Drawers Right Side', 45], ['2 Drawers Foot End', 155], ['4 Drawers', 210]],
    headboard: [['FREE 26" Headboard', 0], ['54" Floor Standing Headboard', 10]],
    base: [['Standard Base (holds 50 stone)', 0], ['Reinforced Base (holds 100 stone)', 25]],
    addon: [['Professional Assembly', 39.99]],
  };

  // Each colour links to ITS OWN image (image_url), shown when the swatch is clicked.
  const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const options = colours.map(([name, hex], i) => ({
    product_id: product.id, group_name: 'colour', name, price_extra: 0, swatch_hex: hex,
    image_url: `/images/colours/${slug(name)}.svg`, position: i,
  }));
  for (const [group_name, rows] of Object.entries(groups)) {
    rows.forEach(([name, price_extra], i) =>
      options.push({ product_id: product.id, group_name, name, price_extra, position: i })
    );
  }
  const { error: optError } = await supabase.from('product_options').insert(options);
  if (optError) throw optError;

  console.log(`Prague Divan Bed created with ${options.length} options. Done!`);
}

main().catch((err) => {
  console.error('Seed failed:', err.message || err);
  process.exit(1);
});
