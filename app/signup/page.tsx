'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase';

function slugify(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const r = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const s = supabaseBrowser();

    const { data, error } = await s.auth.signUp({
      email,
      password,
      options: {
        data: {
          restaurant_name: name,
        },
      },
    });

    if (error || !data.user) {
      return setError(error?.message || 'Signup failed');
    }

    if (!name.trim()) {
      return setError('Restaurant name is required');
    }

    r.push('/kitchen');
  }

  return (
    <main className="auth-page">
      <section className="auth-side">
        <div className="brand">FEXONIC</div>

        <div>
          <div className="eyebrow">START YOUR WORKSPACE</div>

          <h1 style={{ marginTop: 14 }}>
            Turn every table
            <br />
            into an order.
          </h1>

          <p style={{ marginTop: 22 }}>
            Create your restaurant workspace and start managing your digital
            menu, QR tables and kitchen orders.
          </p>
        </div>

        <div className="smalltext" style={{ color: '#777f78' }}>
          Simple setup. One workspace.
        </div>
      </section>

      <section className="auth-form-side">
        <div className="card auth-card">
          <div className="eyebrow">GET STARTED</div>

          <h1>Create restaurant</h1>

          <p className="muted">
            Set up your Fexonic restaurant workspace.
          </p>

          <form onSubmit={submit} style={{ marginTop: 25 }}>
            <div className="field">
              <label className="label">Restaurant name</label>

              <input
                className="input"
                required
                placeholder="e.g. The Table"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="label">Owner email</label>

              <input
                className="input"
                type="email"
                required
                placeholder="owner@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="label">Password</label>

              <input
                className="input"
                type="password"
                minLength={8}
                required
                placeholder="At least 8 characters"
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
              Create workspace →
            </button>
          </form>

          <p className="muted smalltext" style={{ marginTop: 22 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ fontWeight: 850, color: '#111' }}>
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}