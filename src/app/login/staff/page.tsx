'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginStaffPin } from '@/app/actions/auth';
import Link from 'next/link';

export default function StaffPinLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await loginStaffPin(formData);
      if (res.success && res.redirectTo) {
        router.push(res.redirectTo);
        router.refresh();
      } else {
        setError(res.error || 'Invalid PIN or unauthorized role.');
      }
    } catch {
      setError('An unexpected network error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: '460px', marginTop: '2rem' }}>
      <div className="glass-panel" style={{ padding: '2.5rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📱</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc' }} id="staff-pin-heading">
            Field Staff PIN Login
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
            Fast PIN authentication for Gate Volunteers, Hostel Wardens, Call Room Marshals, and Judges.
          </p>
        </div>

        {error && (
          <div style={{ padding: '0.85rem 1rem', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', color: '#f43f5e', fontSize: '0.9rem', marginBottom: '1.5rem' }} id="staff-pin-error">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} id="staff-pin-form">
          <div className="form-group">
            <label className="form-label" htmlFor="role">
              Operational Role
            </label>
            <select id="role" name="role" required className="input-field" defaultValue="accreditation_volunteer">
              <option value="accreditation_volunteer">Gate Accreditation Scanner</option>
              <option value="warden">Hostel Accommodation Warden</option>
              <option value="call_room_official">Call Room Marshal / Track Official</option>
              <option value="referee">Event Referee / Judge</option>
            </select>
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label" htmlFor="pin">
              4–6 Digit Access PIN
            </label>
            <input
              id="pin"
              name="pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              placeholder="••••"
              className="input-field"
              style={{ fontSize: '1.4rem', letterSpacing: '0.3em', textAlign: 'center' }}
              autoComplete="one-time-code"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1.5rem', padding: '0.9rem' }}
            id="btn-staff-submit"
          >
            {loading ? 'Validating PIN...' : 'Open Scanner / Judging Desk →'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
          <Link href="/login/admin" style={{ color: 'var(--text-muted)' }}>
            Meet Director or Finance Official? Log in with password →
          </Link>
        </div>
      </div>
    </div>
  );
}
