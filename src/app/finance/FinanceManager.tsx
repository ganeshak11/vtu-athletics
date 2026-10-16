'use client';

import { useState } from 'react';
import { verifyPaymentAction } from '@/app/actions/payment';

interface SquadInfo {
  id: string;
  squad_code: string;
  gender: string;
  ped_name?: string;
  ped_phone?: string;
  colleges?: {
    name: string;
    code: string;
  };
}

interface PaymentSubmission {
  id: string;
  amount_submitted: number;
  amount_expected: number;
  utr_number: string;
  screenshot_url: string;
  status: 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
  rejection_reason?: string;
  created_at: string;
  squads?: SquadInfo;
}

interface Props {
  initialPayments: any[];
}

export default function FinanceManager({ initialPayments }: Props) {
  const [payments, setPayments] = useState<PaymentSubmission[]>(initialPayments);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [rejectingPaymentId, setRejectingPaymentId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleVerify(paymentId: string) {
    if (!confirm('Verify and approve this entry fee payment?')) return;
    setLoading(true);

    const res = await verifyPaymentAction(paymentId, 'VERIFIED');
    if (res.success) {
      setPayments((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, status: 'VERIFIED' } : p))
      );
    } else {
      alert(`Error: ${res.error}`);
    }
    setLoading(false);
  }

  async function handleRejectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectingPaymentId || !rejectReason.trim()) return;
    setLoading(true);

    const res = await verifyPaymentAction(rejectingPaymentId, 'REJECTED', rejectReason);
    if (res.success) {
      setPayments((prev) =>
        prev.map((p) =>
          p.id === rejectingPaymentId
            ? { ...p, status: 'REJECTED', rejection_reason: rejectReason.trim() }
            : p
        )
      );
      setRejectingPaymentId(null);
      setRejectReason('');
    } else {
      alert(`Error: ${res.error}`);
    }
    setLoading(false);
  }

  const pendingCount = payments.filter((p) => p.status === 'SUBMITTED').length;
  const verifiedCount = payments.filter((p) => p.status === 'VERIFIED').length;
  const totalVerifiedRevenue = payments
    .filter((p) => p.status === 'VERIFIED')
    .reduce((sum, p) => sum + p.amount_submitted, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Finance Verification Desk</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Review offline UPI payment proofs, verify bank UTRs, and approve collegiate squad participation.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="glass-card" style={{ padding: '0.8rem 1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pending Review</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-gold)' }}>{pendingCount}</div>
          </div>
          <div className="glass-card" style={{ padding: '0.8rem 1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Verified Payments</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399' }}>{verifiedCount}</div>
          </div>
          <div className="glass-card" style={{ padding: '0.8rem 1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Revenue</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>₹{totalVerifiedRevenue}</div>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table" id="finance-payments-table">
          <thead>
            <tr>
              <th>College &amp; Squad</th>
              <th>Submitted UTR</th>
              <th>Amount (Sub / Exp)</th>
              <th>Receipt</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                  No payment submissions received yet.
                </td>
              </tr>
            ) : (
              payments.map((p) => {
                const squad = p.squads;
                const college = Array.isArray(squad?.colleges) ? squad?.colleges[0] : squad?.colleges;
                const isMatch = p.amount_submitted === p.amount_expected;
                const isUnderpaid = p.amount_submitted < p.amount_expected;

                return (
                  <tr key={p.id} id={`row-payment-${p.id}`}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{college?.name || 'College'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)' }}>
                        {squad?.squad_code} • {squad?.ped_name || 'PED'} ({squad?.ped_phone || ''})
                      </div>
                    </td>
                    <td>
                      <code style={{ fontWeight: 700, color: '#fff' }}>{p.utr_number}</code>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(p.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        ₹{p.amount_submitted}{' '}
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          / ₹{p.amount_expected}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: 'var(--radius-sm)',
                          background: isMatch
                            ? 'rgba(16, 185, 129, 0.15)'
                            : isUnderpaid
                            ? 'rgba(244, 63, 94, 0.15)'
                            : 'rgba(245, 158, 11, 0.15)',
                          color: isMatch ? '#34d399' : isUnderpaid ? '#f43f5e' : '#fbbf24',
                        }}
                      >
                        {isMatch ? 'EXACT MATCH' : isUnderpaid ? 'UNDERPAID' : 'OVERPAID'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedScreenshot(p.screenshot_url)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}
                      >
                        👁️ View Receipt
                      </button>
                    </td>
                    <td>
                      <span className={`badge badge-${p.status.toLowerCase()}`}>
                        {p.status}
                      </span>
                      {p.rejection_reason && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', marginTop: '0.25rem' }}>
                          {p.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td>
                      {p.status === 'SUBMITTED' ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleVerify(p.id)}
                            disabled={loading}
                            className="btn btn-primary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                            id={`btn-approve-${p.id}`}
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => {
                              setRejectingPaymentId(p.id);
                              setRejectReason('');
                            }}
                            disabled={loading}
                            className="btn btn-danger"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                            id={`btn-reject-${p.id}`}
                          >
                            ✕ Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Processed
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
          onClick={() => setSelectedScreenshot(null)}
        >
          <div className="glass-panel" style={{ padding: '1.5rem', maxWidth: '500px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Uploaded UPI Transaction Receipt</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedScreenshot}
              alt="Receipt"
              style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 'var(--radius-sm)' }}
            />
            <div style={{ marginTop: '1rem' }}>
              <button onClick={() => setSelectedScreenshot(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingPaymentId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--accent-rose)' }}>
              Reject Payment Submission
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Specify the reason for rejection so the squad PED can correct their submission.
            </p>

            <form onSubmit={handleRejectSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="rejectReason">Rejection Reason</label>
                <textarea
                  id="rejectReason"
                  rows={3}
                  required
                  placeholder="e.g. UTR reference not found in bank statement or illegible screenshot."
                  className="input-field"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setRejectingPaymentId(null)}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-danger"
                >
                  {loading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
