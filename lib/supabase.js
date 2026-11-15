// Browser-side Supabase client.
// Uses the PUBLIC "anon" key - safe to expose, because Row Level Security
// rules in the database (supabase/schema.sql) decide what each user may do.
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
