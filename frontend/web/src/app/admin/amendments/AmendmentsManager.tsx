'use client';

import { useState } from 'react';
import { withdrawAthleteAction, substituteAthleteAction } from '@/app/actions/bids';

interface AthleteOption {
  id: string;
  sslc_name: string;
  usn: string;
  bid_number?: number;
  squad_code: string;
  accreditation_status: string;
}

interface AmendmentItem {
  id: string;
  amendment_type: string;
  bid_number: number;
  reason: string;
  created_at: string;
  squads?: {
    squad_code: string;
    colleges?: { name: string };
  };
  staff?: {
    display_name: string;
  };
}

interface Props {
  athletes: AthleteOption[];
  initialAmendments: any[];
}

export default function AmendmentsManager({ athletes, initialAmendments }: Props) {
  const [amendments, setAmendments] = useState<AmendmentItem[]>(initialAmendments);
  const [selectedAthleteId, setSelectedAthleteId] = useState('');
  const [withdrawReason, setWithdrawReason] = useState('');
  const [substituteWithdrawnId, setSubstituteWithdrawnId] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  const activeAthletes = athletes.filter((a) => a.accreditation_status !== 'WITHDRAWN' && a.bid_number);
  const withdrawnAthletes = athletes.filter((a) => a.accreditation_status === 'WITHDRAWN' && a.bid_number);

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAthleteId || !withdrawReason.trim()) return;
    setLoading(true);
    setMsg(null);

    const res = await withdrawAthleteAction(selectedAthleteId, withdrawReason);
    if (res.success) {
      setMsg({ text: `✓ Athlete successfully withdrawn. Bid number preserved as void gap.`, error: false });
      setSelectedAthleteId('');
      setWithdrawReason('');
      window.location.reload();
    } else {
      setMsg({ text: res.error || 'Failed to withdraw athlete.', error: true });
    }
    setLoading(false);
  }

  async function handleSubstitute(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const formData = new FormData(e.currentTarget);
    const res = await substituteAthleteAction(formData);
    if (res.success) {
      setMsg({ text: `✓ Substitute athlete enrolled with inherited bid number!`, error: false });
      setSubstituteWithdrawnId('');
      window.location.reload();
    } else {
      setMsg({ text: res.error || 'Failed to substitute athlete.', error: true });
    }
    setLoading(false);
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Post-Close Roster Amendments</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
          Process meet-day withdrawals, substitutions, and late entries while preserving bid gaps on printed heat sheets.
        </p>
      </div>

      {msg && (
        <div
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            background: msg.error ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            color: msg.error ? '#f43f5e' : '#34d399',
            border: `1px solid ${msg.error ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          }}
        >
          {msg.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
        {/* Withdraw Panel */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--accent-rose)' }}>
            Withdraw Athlete
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Voids the athlete&apos;s bid number from race heats. The bid number will NOT be renumbered.
          </p>

          <form onSubmit={handleWithdraw}>
            <div className="form-group">
              <label className="form-label" htmlFor="athleteSelect">Select Registered Athlete</label>
              <select
                id="athleteSelect"
                className="input-field"
                required
                value={selectedAthleteId}
                onChange={(e) => setSelectedAthleteId(e.target.value)}
              >
                <option value="">Select Athlete (Bid # — Name — Squad)</option>
                {activeAthletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    Chest #{a.bid_number}: {a.sslc_name} ({a.squad_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="withdrawReason">Medical / Official Reason</label>
              <textarea
                id="withdrawReason"
                rows={2}
                required
                placeholder="e.g. Hamstring strain during warm-up; verified by Medical Officer."
                className="input-field"
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !selectedAthleteId}
              className="btn btn-danger"
              style={{ width: '100%', marginTop: '1rem' }}
            >
              {loading ? 'Processing...' : 'Confirm Withdrawal & Void Bid'}
            </button>
          </form>
        </div>

        {/* Substitute Panel */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--accent-cyan)' }}>
            Substitute Athlete
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Enrolls a replacement athlete inheriting the withdrawn athlete&apos;s existing bid number.
          </p>

          <form onSubmit={handleSubstitute}>
            <div className="form-group">
              <label className="form-label" htmlFor="withdrawnProfileId">Select Withdrawn Slot</label>
              <select
                id="withdrawnProfileId"
                name="withdrawnProfileId"
                className="input-field"
                required
                value={substituteWithdrawnId}
                onChange={(e) => setSubstituteWithdrawnId(e.target.value)}
              >
                <option value="">Select Voided Bid Slot</option>
                {withdrawnAthletes.map((w) => (
                  <option key={w.id} value={w.id}>
                    Voided Chest #{w.bid_number}: {w.sslc_name} ({w.squad_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="newName">Replacement Athlete Name</label>
              <input id="newName" name="newName" type="text" required placeholder="e.g. NAVEEN K" className="input-field" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="newUsn">USN</label>
                <input id="newUsn" name="newUsn" type="text" required placeholder="4MT22CS099" className="input-field" style={{ textTransform: 'uppercase' }} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="newSemester">Semester</label>
                <select id="newSemester" name="newSemester" className="input-field" defaultValue="3">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>Sem {s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="newBloodGroup">Blood Group</label>
                <select id="newBloodGroup" name="newBloodGroup" className="input-field" defaultValue="B+">
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="newJoiningDate">Admission Date</label>
                <input id="newJoiningDate" name="newJoiningDate" type="date" required className="input-field" defaultValue="2022-09-15" />
              </div>
            </div>

            <input type="hidden" name="newSemStartDate" value="2026-08-01" />

            <div className="form-group">
              <label className="form-label" htmlFor="reason">Amendment Authorization Reason</label>
              <input id="reason" name="reason" type="text" required placeholder="Medical substitution approved by Chief Jury." className="input-field" />
            </div>

            <button
              type="submit"
              disabled={loading || !substituteWithdrawnId}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              {loading ? 'Substituting...' : 'Enroll Substitute Athlete →'}
            </button>
          </form>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem' }}>
          Official Amendments Audit Trail
        </h2>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Type</th>
                <th>Squad / College</th>
                <th>Bid #</th>
                <th>Official Reason</th>
                <th>Authorized By</th>
              </tr>
            </thead>
            <tbody>
              {amendments.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No amendments logged yet.
                  </td>
                </tr>
              ) : (
                amendments.map((a) => (
                  <tr key={a.id}>
                    <td>{new Date(a.created_at).toLocaleString()}</td>
                    <td>
                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: a.amendment_type === 'withdraw' ? 'rgba(244,63,94,0.15)' : 'rgba(6,182,212,0.15)',
                          color: a.amendment_type === 'withdraw' ? '#f43f5e' : '#06b6d4',
                        }}
                      >
                        {a.amendment_type}
                      </span>
                    </td>
                    <td>{a.squads?.squad_code || 'Squad'}</td>
                    <td style={{ fontWeight: 800, color: 'var(--accent-gold)' }}>
                      #{a.bid_number}
                    </td>
                    <td>{a.reason}</td>
                    <td>{a.staff?.display_name || 'Meet Director'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
