'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const r = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const { error } = await supabaseBrowser().auth.signInWithPassword({
      email,
      password,
    });

    if (error) return setError(error.message);

    r.push('/kitchen');
  }

  return (
    <main className="auth-page">
      <section className="auth-side">
        <div className="brand">FEXONIC</div>

        <div>
          <div className="eyebrow">RESTAURANT WORKSPACE</div>

          <h1 style={{ marginTop: 14 }}>
            Run the floor.
            <br />
            From one place.
          </h1>

          <p style={{ marginTop: 22 }}>
            Manage your menu, tables, QR ordering and kitchen operations
            without jumping between different tools.
          </p>
        </div>

        <div className="smalltext" style={{ color: '#777f78' }}>
          Fexonic Restaurant Platform
        </div>
      </section>

      <section className="auth-form-side">
        <div className="card auth-card">
          <div className="eyebrow">WELCOME BACK</div>

          <h1>Restaurant login</h1>

          <p className="muted">
            Sign in to continue to your restaurant workspace.
          </p>

          <form onSubmit={submit} style={{ marginTop: 25 }}>
            <div className="field">
              <label className="label">Email</label>

              <input
                className="input"
                type="email"
                required
                placeholder="you@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="label">Password</label>

              <input
                className="input"
                type="password"
                required
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: '11px 13px',
                  marginBottom: 15,
                  borderRadius: 11,
                  background: '#fff3f2',
                  border: '1px solid #f0d0cc',
                  color: 'var(--bad)',
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            <button
              className="btn"
              type="submit"
              style={{ width: '100%' }}
            >
              Sign in →
            </button>
          </form>

          <p className="muted smalltext" style={{ marginTop: 22 }}>
            New restaurant?{' '}
            <Link href="/signup" style={{ fontWeight: 850, color: '#111' }}>
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}