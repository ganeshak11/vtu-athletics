'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAdmin } from '@/app/actions/auth';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await loginAdmin(formData);
      if (res.success && res.redirectTo) {
        router.push(res.redirectTo);
        router.refresh();
      } else {
        setError(res.error || 'Authentication failed. Please verify credentials.');
      }
    } catch {
      setError('An unexpected network error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto' }}>
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '2.5rem 2rem', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#0f172a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', margin: '0 auto 1rem' }}>
            🛡️
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }} id="admin-login-heading">
            Directorate Admin Portal
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.4rem' }}>
            VTU Technical Meet Directorate &bull; Dr. ACSCE Host Desk
          </p>
        </div>

        {error && (
          <div style={{ padding: '0.85rem 1rem', background: '#fef2f2', border: '1px solid #fecdd3', borderRadius: '8px', color: '#dc2626', fontSize: '0.85rem', marginBottom: '1.5rem' }} id="admin-login-error">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} id="admin-login-form">
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="username" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
              Admin Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              placeholder="e.g. admin"
              className="filter-control"
              style={{ width: '100%', padding: '0.75rem' }}
              autoComplete="username"
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" htmlFor="password" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
              Secret Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••••••"
              className="filter-control"
              style={{ width: '100%', padding: '0.75rem' }}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-admin btn-admin-primary"
            style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
            id="btn-admin-submit"
          >
            {loading ? 'Authenticating...' : 'Sign In to Command Center →'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem' }}>
          <Link href="/" style={{ color: '#64748b' }}>
            ← Back to Home
          </Link>
          <Link href="/login/squad" style={{ color: '#2563eb', fontWeight: 600 }}>
            Institution Squad Login →
          </Link>
        </div>
      </div>
    </div>
  );
}
