-- =====================================================================
-- Mini Marketplace - database schema
-- Run this whole file once in Supabase: Dashboard > SQL Editor > New query.
-- It creates the tables, the security rules (Row Level Security) and
-- the image storage bucket.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PROFILES: one row per user, holds their role and approval status.
--    Supabase keeps the login itself (email/password) in auth.users;
--    this table adds our marketplace info on top.
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id         uuid primary key references auth.users on delete cascade,
  full_name  text,
  role       text not null default 'buyer'    check (role in ('buyer', 'seller', 'admin')),
  -- Sellers start as 'pending' until an admin approves them.
  status     text not null default 'approved' check (status in ('pending', 'approved', 'hidden')),
  created_at timestamptz not null default now()
);

-- When someone signs up, automatically create their profile.
-- The role comes from the sign-up form (buyer or seller only - nobody can
-- make themselves admin; admins are set by hand in the database).
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  chosen_role text := coalesce(new.raw_user_meta_data ->> 'role', 'buyer');
begin
  if chosen_role not in ('buyer', 'seller') then
    chosen_role := 'buyer';
  end if;
  insert into profiles (id, full_name, role, status)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    chosen_role,
    case when chosen_role = 'seller' then 'pending' else 'approved' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Small helper functions used by the security rules below.
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function is_approved_seller(user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = user_id and role = 'seller' and status = 'approved');
$$;

-- ---------------------------------------------------------------------
-- 2. CATEGORIES: simple tree (parent_id) e.g. Furniture > Divan Beds
-- ---------------------------------------------------------------------
create table if not exists categories (
  id        serial primary key,
  name      text not null,
  parent_id int references categories(id)
);

-- ---------------------------------------------------------------------
-- 3. PRODUCTS: prices are NUMERIC (real numbers), never text.
-- ---------------------------------------------------------------------
create table if not exists products (
  id               uuid primary key default gen_random_uuid(),
  seller_id        uuid not null references profiles(id) on delete cascade,
  category_id      int references categories(id),
  title            text not null,
  description      text,
  base_price       numeric(10, 2) not null check (base_price >= 0),
  compare_at_price numeric(10, 2) check (compare_at_price >= 0),
  -- 'active' = visible in the shop, 'hidden' = hidden by seller or admin
  status           text not null default 'active' check (status in ('active', 'hidden')),
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. PRODUCT_IMAGES: the gallery (5+ images per product).
--    colour_option_id is added further down (after product_options).
-- ---------------------------------------------------------------------
create table if not exists product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url        text not null,
  position   int not null default 0
);

-- ---------------------------------------------------------------------
-- 5. PRODUCT_OPTIONS: ONE table for every option group.
--    group_name says which group the row belongs to:
--      colour    -> swatch_hex (+ optional image_url)
--      size / storage / headboard / base -> pick one
--      addon     -> optional tick box (e.g. Professional Assembly)
--    price_extra is added to the product base_price.
--    Adding a new storage option = adding one row (done in the seller form).
-- ---------------------------------------------------------------------
create table if not exists product_options (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  group_name  text not null check (group_name in ('colour', 'size', 'storage', 'headboard', 'base', 'addon')),
  name        text not null,
  price_extra numeric(10, 2) not null default 0 check (price_extra >= 0),
  swatch_hex  text,
  image_url   text,
  position    int not null default 0
);

-- Gallery images can belong to ONE colour (shown only when that colour is
-- selected) or to none (NULL = shown for every colour, e.g. a size chart).
-- Added here because product_options must exist first.
-- (Same change as supabase/migrations/002_colour_gallery.sql.)
alter table product_images
  add column if not exists colour_option_id uuid references product_options(id) on delete cascade;

-- ---------------------------------------------------------------------
-- 6. ORDERS + ORDER_ITEMS
--    One order per seller (a cart with items from 2 sellers = 2 orders).
--    order_items keeps a COPY of the title, chosen options and price at the
--    time of purchase, so later price changes don't rewrite old orders.
-- ---------------------------------------------------------------------
create table if not exists orders (
  id            uuid primary key default gen_random_uuid(),
  buyer_id      uuid not null references profiles(id),
  seller_id     uuid not null references profiles(id),
  customer_name text not null,
  address       text not null,
  total         numeric(10, 2) not null,
  status        text not null default 'New' check (status in ('New', 'Confirmed', 'Shipped', 'Delivered')),
  created_at    timestamptz not null default now()
);

create table if not exists order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  title      text not null,
  options    jsonb not null,          -- e.g. {"Colour":"Cream Naples","Size":"King 5FT",...}
  unit_price numeric(10, 2) not null,
  quantity   int not null check (quantity > 0)
);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS)
-- The browser talks to the database directly with the public "anon" key,
-- so these rules are what stop users from reading/changing other people's
-- data. Every table has RLS switched on; anything not allowed is blocked.
-- =====================================================================
alter table profiles        enable row level security;
alter table categories      enable row level security;
alter table products        enable row level security;
alter table product_images  enable row level security;
alter table product_options enable row level security;
alter table orders          enable row level security;
alter table order_items     enable row level security;

-- PROFILES: you can read your own profile; admin can read/update all.
drop policy if exists "read own profile or admin" on profiles;
create policy "read own profile or admin" on profiles
  for select using (id = auth.uid() or is_admin());
-- Shoppers can see the name of APPROVED sellers ("Sold by ..." on the product page).
drop policy if exists "approved sellers are public" on profiles;
create policy "approved sellers are public" on profiles
  for select using (role = 'seller' and status = 'approved');
drop policy if exists "admin updates profiles" on profiles;
create policy "admin updates profiles" on profiles
  for update using (is_admin());

-- CATEGORIES: everyone can read.
drop policy if exists "categories readable" on categories;
create policy "categories readable" on categories for select using (true);

-- PRODUCTS: shoppers see active products from approved sellers.
-- Sellers always see their own; admin sees everything.
drop policy if exists "products readable" on products;
create policy "products readable" on products for select using (
  (status = 'active' and is_approved_seller(seller_id))
  or seller_id = auth.uid()
  or is_admin()
);
drop policy if exists "seller inserts own products" on products;
create policy "seller inserts own products" on products for insert
  with check (seller_id = auth.uid()
              and exists (select 1 from profiles where id = auth.uid() and role = 'seller'));
drop policy if exists "seller or admin updates products" on products;
create policy "seller or admin updates products" on products for update
  using (seller_id = auth.uid() or is_admin());
drop policy if exists "seller deletes own products" on products;
create policy "seller deletes own products" on products for delete
  using (seller_id = auth.uid());

-- IMAGES + OPTIONS: readable if the product is readable;
-- writable only by the product's seller.
drop policy if exists "images readable" on product_images;
create policy "images readable" on product_images for select
  using (exists (select 1 from products p where p.id = product_id));
drop policy if exists "seller manages images" on product_images;
create policy "seller manages images" on product_images for all
  using (exists (select 1 from products p where p.id = product_id and p.seller_id = auth.uid()))
  with check (exists (select 1 from products p where p.id = product_id and p.seller_id = auth.uid()));

drop policy if exists "options readable" on product_options;
create policy "options readable" on product_options for select
  using (exists (select 1 from products p where p.id = product_id));
drop policy if exists "seller manages options" on product_options;
create policy "seller manages options" on product_options for all
  using (exists (select 1 from products p where p.id = product_id and p.seller_id = auth.uid()))
  with check (exists (select 1 from products p where p.id = product_id and p.seller_id = auth.uid()));

-- ORDERS: created only by our server checkout route (it uses the secret
-- service key, which bypasses RLS, after re-calculating the price).
-- Buyer sees own orders, seller sees orders for them, admin sees all.
drop policy if exists "orders readable" on orders;
create policy "orders readable" on orders for select
  using (buyer_id = auth.uid() or seller_id = auth.uid() or is_admin());
drop policy if exists "seller updates own orders" on orders;
create policy "seller updates own orders" on orders for update
  using (seller_id = auth.uid());
-- Sellers may only change the STATUS column, nothing else (not the total!).
revoke update on orders from authenticated, anon;
grant update (status) on orders to authenticated;

drop policy if exists "order items readable" on order_items;
create policy "order items readable" on order_items for select
  using (exists (select 1 from orders o where o.id = order_id));

-- =====================================================================
-- STORAGE: public bucket for product photos.
-- Anyone can view; only logged-in users can upload.
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "upload product images" on storage.objects;
create policy "upload product images" on storage.objects for insert
  to authenticated with check (bucket_id = 'product-images');

-- Default category for the test: Furniture > Divan Beds
insert into categories (id, name, parent_id) values (1, 'Furniture', null), (2, 'Divan Beds', 1)
on conflict (id) do nothing;
