'use client';
// Login + Sign up on one page (a toggle switches between them).
// Supabase Auth handles passwords securely; we only store the role.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'buyer' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    let result;
    if (mode === 'login') {
      result = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    } else {
      // full_name + role are saved by the database trigger into "profiles".
      result = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.full_name, role: form.role } },
      });
    }

    setBusy(false);
    if (result.error) return setError(result.error.message);

    // If Supabase is set to "confirm email", sign-up gives no session yet.
    // Tell the user instead of pretending they are logged in.
    if (!result.data.session) {
      return setError('Account created. Please confirm your email, then log in.');
    }

    // Send each role to its main page.
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', result.data.user.id).single();
    if (profile?.role === 'seller') router.push('/seller');
    else if (profile?.role === 'admin') router.push('/admin');
    else router.push('/');
  }

  return (
    <div className="max-w-sm mx-auto card mt-6">
      <h1 className="page-title text-2xl mb-4">{mode === 'login' ? 'Log in' : 'Create account'}</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' && (
          <>
            <input className="input" placeholder="Full name" value={form.full_name} onChange={update('full_name')} required />
            <select className="input" value={form.role} onChange={update('role')}>
              <option value="buyer">I want to buy</option>
              <option value="seller">I want to sell</option>
            </select>
          </>
        )}
        <input className="input" type="email" placeholder="Email" value={form.email} onChange={update('email')} required />
        <input className="input" type="password" placeholder="Password (min 6 characters)" value={form.password} onChange={update('password')} required minLength={6} />
        {error && <p className="text-sale text-sm">{error}</p>}
        <button className="btn w-full" disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}</button>
      </form>
      <button className="text-sm underline mt-4 min-h-[44px]" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        {mode === 'login' ? 'No account? Sign up' : 'Have an account? Log in'}
      </button>
      <p className="text-xs text-muted mt-2">
        Test accounts: buyer@demo.test, seller@demo.test, admin@demo.test (password: Demo-pass-123)
      </p>
    </div>
  );
}
