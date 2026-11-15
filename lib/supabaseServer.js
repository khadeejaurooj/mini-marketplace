// SERVER-ONLY Supabase helpers (used by files in app/api/...).
// The service-role key bypasses Row Level Security, so it must never be
// sent to the browser. It is read from an environment variable WITHOUT the
// NEXT_PUBLIC_ prefix, which means Next.js keeps it on the server.
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Find out who is calling an API route.
// The browser sends its login token in the "Authorization: Bearer <token>"
// header; we ask Supabase to verify it and return the user + their profile.
export async function getUserFromRequest(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();
  return profile; // { id, full_name, role, status }
}
