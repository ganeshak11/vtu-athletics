'use client';

import { useState } from 'react';
import { createStaffAction } from '@/app/actions/admin';

interface StaffItem {
  id: string;
  display_name: string;
  role: string;
  username?: string;
  is_active: boolean;
  created_at: string;
}

interface Props {
  initialStaff: StaffItem[];
}

export default function StaffManager({ initialStaff }: Props) {
  const [staffList, setStaffList] = useState<StaffItem[]>(initialStaff);
  const [showAddModal, setShowAddModal] = useState(false);
  const [authType, setAuthType] = useState<'pin' | 'password'>('pin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddStaff(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await createStaffAction(formData);
      if (res.success) {
        setShowAddModal(false);
        const newStaff: StaffItem = {
          id: Math.random().toString(),
          display_name: (formData.get('displayName') as string) || '',
          role: (formData.get('role') as string) || '',
          username: (formData.get('username') as string) || undefined,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        setStaffList((prev) => [newStaff, ...prev]);
      } else {
        setError(res.error || 'Failed to create staff member.');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }

  function formatRole(role: string): string {
    switch (role) {
      case 'meet_admin':
        return 'Meet Director (Admin)';
      case 'finance_desk':
        return 'Finance Verification Desk';
      case 'accreditation_volunteer':
        return 'Gate Accreditation Scanner';
      case 'warden':
        return 'Hostel Accommodation Warden';
      case 'call_room_official':
        return 'Call Room Marshal';
      case 'referee':
        return 'Event Judge / Referee';
      default:
        return role;
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Meet Operational Staff &amp; Officials</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Manage staff accounts with numeric PINs (for gate/warden/call room scanners) or username/passwords.
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddModal(true);
            setError(null);
          }}
          className="btn btn-primary"
          id="btn-open-add-staff"
        >
          + Add Staff Account
        </button>
      </div>

      <div className="table-container">
        <table className="data-table" id="staff-table">
          <thead>
            <tr>
              <th>Official Name</th>
              <th>Operational Role</th>
              <th>Auth Method</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {staffList.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No staff members created yet.
                </td>
              </tr>
            ) : (
              staffList.map((member) => (
                <tr key={member.id} id={`row-staff-${member.id}`}>
                  <td style={{ fontWeight: 600 }}>{member.display_name}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      {formatRole(member.role)}
                    </span>
                  </td>
                  <td>
                    {member.username ? (
                      <span style={{ fontSize: '0.85rem', color: 'var(--accent-gold)' }}>
                        Username: <code>{member.username}</code>
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        PIN Authenticated 🔢
                      </span>
                    )}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: member.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                        color: member.is_active ? '#34d399' : '#f43f5e',
                      }}
                    >
                      {member.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }} suppressHydrationWarning>
                    {new Date(member.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
          id="modal-add-staff-overlay"
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '2rem' }} id="modal-add-staff">
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Create Staff Account
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Assign an operational role with a quick 4-digit PIN for mobile scanners or credentials for desktop portals.
            </p>

            {error && (
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', color: '#f43f5e', fontSize: '0.85rem', marginBottom: '1rem' }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleAddStaff} id="form-add-staff">
              <div className="form-group">
                <label className="form-label" htmlFor="displayName">Full Name / Desk Title</label>
                <input id="displayName" name="displayName" type="text" required placeholder="e.g. Gate 1 Volunteer or Chief Track Marshal" className="input-field" />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="role">Operational Role</label>
                <select
                  id="role"
                  name="role"
                  required
                  className="input-field"
                  defaultValue="accreditation_volunteer"
                  onChange={(e) => {
                    const r = e.target.value;
                    if (r === 'meet_admin' || r === 'finance_desk') {
                      setAuthType('password');
                    } else {
                      setAuthType('pin');
                    }
                  }}
                >
                  <option value="accreditation_volunteer">Gate Accreditation Scanner</option>
                  <option value="warden">Hostel Accommodation Warden</option>
                  <option value="call_room_official">Call Room Marshal / Track Marshal</option>
                  <option value="referee">Field / Track Judge (Referee)</option>
                  <option value="finance_desk">Finance Verification Desk</option>
                  <option value="meet_admin">Technical / Meet Director</option>
                </select>
              </div>

              {authType === 'pin' ? (
                <div className="form-group">
                  <label className="form-label" htmlFor="pin">4–6 Digit Access PIN</label>
                  <input
                    id="pin"
                    name="pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    placeholder="e.g. 1234"
                    className="input-field"
                    style={{ fontSize: '1.2rem', letterSpacing: '0.2em' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Field volunteers and marshals will use this PIN to log in.
                  </span>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="username">Username</label>
                    <input id="username" name="username" type="text" required placeholder="e.g. finance1" className="input-field" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="password">Password</label>
                    <input id="password" name="password" type="password" required placeholder="••••••••" className="input-field" />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary" disabled={loading}>
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn btn-primary" id="btn-submit-add-staff">
                  {loading ? 'Creating...' : 'Create Staff Member →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
