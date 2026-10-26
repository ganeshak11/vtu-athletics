'use client';

import { useState } from 'react';
import { createCollegeAction, resetSquadPassphraseAction, toggleSquadRosterLockAction, CreateCollegeResult } from '@/app/actions/admin';

interface SquadItem {
  id: string;
  gender: string;
  squad_code: string;
  ped_name: string;
  ped_phone: string;
  ped_email?: string;
  roster_locked: boolean;
  payment_status: 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
  bid_block_start?: number;
  bid_block_end?: number;
}

interface CollegeItem {
  id: string;
  name: string;
  code: string;
  district?: string;
  squads: SquadItem[];
}

interface Props {
  initialColleges: CollegeItem[];
}

export default function CollegesManager({ initialColleges }: Props) {
  const [colleges, setColleges] = useState<CollegeItem[]>(initialColleges);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestCreated, setLatestCreated] = useState<CreateCollegeResult | null>(null);

  async function handleAddCollege(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await createCollegeAction(formData);
      if (res.success && res.college && res.menSquad && res.womenSquad) {
        setLatestCreated(res);
        setShowAddModal(false);
        // Optimistic / local update
        const newCollege: CollegeItem = {
          id: res.college.id,
          name: res.college.name,
          code: res.college.code,
          district: res.college.district,
          squads: [
            {
              id: res.menSquad.id,
              gender: 'men',
              squad_code: res.menSquad.squad_code,
              ped_name: (formData.get('pedName') as string) || '',
              ped_phone: (formData.get('pedPhone') as string) || '',
              roster_locked: false,
              payment_status: 'DRAFT',
            },
            {
              id: res.womenSquad.id,
              gender: 'women',
              squad_code: res.womenSquad.squad_code,
              ped_name: (formData.get('pedName') as string) || '',
              ped_phone: (formData.get('pedPhone') as string) || '',
              roster_locked: false,
              payment_status: 'DRAFT',
            },
          ],
        };
        setColleges((prev) => [newCollege, ...prev]);
      } else {
        setError(res.error || 'Failed to create college.');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassphrase(squadId: string, squadCode: string) {
    if (!confirm(`Generate a new passphrase for squad ${squadCode}? The previous passphrase will be invalidated.`)) {
      return;
    }
    const res = await resetSquadPassphraseAction(squadId);
    if (res.success && res.newPassphrase) {
      alert(`New passphrase for ${squadCode}:\n\n${res.newPassphrase}\n\nPlease share this securely with the squad PED.`);
    } else {
      alert(`Failed to reset passphrase: ${res.error}`);
    }
  }

  async function handleToggleLock(squadId: string, currentLocked: boolean) {
    const res = await toggleSquadRosterLockAction(squadId, !currentLocked);
    if (res.success) {
      setColleges((prev) =>
        prev.map((c) => ({
          ...c,
          squads: c.squads.map((s) => (s.id === squadId ? { ...s, roster_locked: !currentLocked } : s)),
        }))
      );
    } else {
      alert(`Failed to toggle lock: ${res.error}`);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Participating Colleges & Squads</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Each registered college automatically fields a Men (-M) and Women (-G) squad with unique passphrases.
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddModal(true);
            setError(null);
          }}
          className="btn btn-primary"
          id="btn-open-add-college"
        >
          + Add New College
        </button>
      </div>

      {/* Success banner with generated credentials */}
      {latestCreated && (
        <div
          className="glass-panel"
          style={{
            padding: '1.5rem',
            marginBottom: '2rem',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            background: 'rgba(16, 185, 129, 0.08)',
          }}
          id="credentials-callout"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ color: '#34d399', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                ✓ College Successfully Registered: {latestCreated.college?.name} ({latestCreated.college?.code})
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Copy and share these credentials with the Physical Education Director (PED). They will need both the squad code and secret passphrase to log in.
              </p>
            </div>
            <button
              onClick={() => setLatestCreated(null)}
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
            >
              ✕ Dismiss
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 700, textTransform: 'uppercase' }}>
                Men&apos;s Squad Credentials
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>
                Squad Code: <code style={{ color: '#fff', fontWeight: 700 }}>{latestCreated.menSquad?.squad_code}</code>
              </div>
              <div style={{ marginTop: '0.25rem', fontSize: '0.95rem' }}>
                Secret Passphrase: <code style={{ color: '#fbbf24', fontWeight: 800 }}>{latestCreated.menSquad?.passphrase_plain}</code>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 700, textTransform: 'uppercase' }}>
                Women&apos;s Squad Credentials
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>
                Squad Code: <code style={{ color: '#fff', fontWeight: 700 }}>{latestCreated.womenSquad?.squad_code}</code>
              </div>
              <div style={{ marginTop: '0.25rem', fontSize: '0.95rem' }}>
                Secret Passphrase: <code style={{ color: '#fbbf24', fontWeight: 800 }}>{latestCreated.womenSquad?.passphrase_plain}</code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* College List Table */}
      <div className="table-container">
        <table className="data-table" id="colleges-table">
          <thead>
            <tr>
              <th>College</th>
              <th>Code / District</th>
              <th>Squads (Men & Women)</th>
              <th>Payment Status</th>
              <th>Roster State</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {colleges.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No colleges registered yet. Click &quot;Add New College&quot; above to register the first institution.
                </td>
              </tr>
            ) : (
              colleges.map((college) => {
                const menSquad = college.squads.find((s) => s.gender === 'men');
                const womenSquad = college.squads.find((s) => s.gender === 'women');

                return (
                  <tr key={college.id} id={`row-college-${college.code}`}>
                    <td style={{ fontWeight: 600 }}>{college.name}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>{college.code}</span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{college.district || 'Karnataka'}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {menSquad && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>🚹 {menSquad.squad_code}</span>
                            <button
                              onClick={() => handleResetPassphrase(menSquad.id, menSquad.squad_code)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
                            >
                              Reset Passphrase
                            </button>
                          </div>
                        )}
                        {womenSquad && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>🚺 {womenSquad.squad_code}</span>
                            <button
                              onClick={() => handleResetPassphrase(womenSquad.id, womenSquad.squad_code)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
                            >
                              Reset Passphrase
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {menSquad && (
                          <span className={`badge badge-${menSquad.payment_status.toLowerCase()}`}>
                            M: {menSquad.payment_status}
                          </span>
                        )}
                        {womenSquad && (
                          <span className={`badge badge-${womenSquad.payment_status.toLowerCase()}`}>
                            G: {womenSquad.payment_status}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {menSquad && (
                          <button
                            onClick={() => handleToggleLock(menSquad.id, menSquad.roster_locked)}
                            className={`btn ${menSquad.roster_locked ? 'btn-danger' : 'btn-secondary'}`}
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            {menSquad.roster_locked ? '🔒 Men Locked' : '🔓 Men Unlocked'}
                          </button>
                        )}
                        {womenSquad && (
                          <button
                            onClick={() => handleToggleLock(womenSquad.id, womenSquad.roster_locked)}
                            className={`btn ${womenSquad.roster_locked ? 'btn-danger' : 'btn-secondary'}`}
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            {womenSquad.roster_locked ? '🔒 Women Locked' : '🔓 Women Unlocked'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {menSquad?.ped_name || womenSquad?.ped_name || 'PED Unspecified'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add College Modal Dialog */}
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
            zIndex: 9999,
            padding: '1.5rem',
          }}
          id="modal-add-college-overlay"
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '2rem' }} id="modal-add-college">
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Register Participating College
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Creating a college automatically generates Men and Women squads with cryptographic passphrases.
            </p>

            {error && (
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', color: '#f43f5e', fontSize: '0.85rem', marginBottom: '1rem' }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleAddCollege} id="form-add-college">
              <div className="form-group">
                <label className="form-label" htmlFor="name">College Full Name</label>
                <input id="name" name="name" type="text" required placeholder="e.g. Maharaja Institute of Technology Mysore" className="input-field" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="code">College Code (Unique)</label>
                  <input id="code" name="code" type="text" required placeholder="e.g. MITM" className="input-field" style={{ textTransform: 'uppercase' }} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="district">District</label>
                  <input id="district" name="district" type="text" placeholder="e.g. Mysuru" defaultValue="Mysuru" className="input-field" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="pedName">PED / Coordinator Name</label>
                <input id="pedName" name="pedName" type="text" placeholder="e.g. Dr. Rajesh Kumar" className="input-field" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="pedPhone">PED Phone Number</label>
                  <input id="pedPhone" name="pedPhone" type="tel" placeholder="e.g. 9876543210" className="input-field" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="pedEmail">PED Email (Optional)</label>
                  <input id="pedEmail" name="pedEmail" type="email" placeholder="ped@mitm.edu" className="input-field" />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  id="btn-submit-add-college"
                >
                  {loading ? 'Generating Squads...' : 'Create College & Squads →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
