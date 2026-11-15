'use client';
// React hook that tells any page who is logged in.
// Returns { user, profile, loading } where profile = { role, status, full_name }.
// It also listens for login/logout so the page updates straight away.
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export function useUser() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load(session) {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
        setProfile(data);
      } else {
        setProfile(null);
      }
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => load(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  return { user, profile, loading };
}

// Helper for calling our own API routes with the login token attached,
// so the server knows who is asking (see lib/supabaseServer.js).
export async function authFetch(url, body) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token || ''}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}
