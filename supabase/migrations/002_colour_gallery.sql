-- =====================================================================
-- Migration 002: colour-specific gallery + public seller names
-- Run once in Supabase: Dashboard > SQL Editor > New query > Run.
-- =====================================================================

-- 1. Optional link from a gallery image to a colour option.
--    colour_option_id = a colour's id -> image only shows for that colour
--    colour_option_id = NULL          -> image shows for every colour
--    "on delete cascade": deleting a colour also deletes its photos.
alter table product_images
  add column if not exists colour_option_id uuid references product_options(id) on delete cascade;

-- 2. Let shoppers read the profile of APPROVED SELLERS only, so the product
--    page can show "Sold by <seller name>". Buyers' and other profiles stay private.
drop policy if exists "approved sellers are public" on profiles;
create policy "approved sellers are public" on profiles
  for select using (role = 'seller' and status = 'approved');
