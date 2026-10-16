'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginSquad } from '@/app/actions/auth';
import Link from 'next/link';

export default function SquadLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await loginSquad(formData);
      if (res.success && res.redirectTo) {
        router.push(res.redirectTo);
        router.refresh();
      } else {
        setError(res.error || 'Authentication failed. Please check credentials.');
      }
    } catch {
      setError('An unexpected network error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: '480px', marginTop: '2rem' }}>
      <div className="glass-panel" style={{ padding: '2.5rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏃</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc' }} id="squad-login-heading">
            Squad Portal Login
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
            Enter your college squad code and the confidential passphrase issued by the meet organizers.
          </p>
        </div>

        {error && (
          <div style={{ padding: '0.85rem 1rem', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', color: '#f43f5e', fontSize: '0.9rem', marginBottom: '1.5rem' }} id="squad-login-error">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} id="squad-login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="squadCode">
              Squad Code
            </label>
            <input
              id="squadCode"
              name="squadCode"
              type="text"
              required
              placeholder="e.g. MITM-M or SJCE-G"
              className="input-field"
              style={{ textTransform: 'uppercase' }}
              autoComplete="off"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Format: &lt;COLLEGE_CODE&gt;-M for Men or -G for Women
            </span>
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label" htmlFor="passphrase">
              Secret Passphrase
            </label>
            <input
              id="passphrase"
              name="passphrase"
              type="password"
              required
              placeholder="e.g. swift-falcon-84"
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1.5rem', padding: '0.9rem' }}
            id="btn-squad-submit"
          >
            {loading ? 'Authenticating...' : 'Sign In to Squad Roster →'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Need credentials? Contact the VTU Technical Director to register your college team.
          <div style={{ marginTop: '0.75rem' }}>
            <Link href="/login/admin" style={{ color: 'var(--accent-gold)' }}>
              Are you a meet official? Log in here →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
