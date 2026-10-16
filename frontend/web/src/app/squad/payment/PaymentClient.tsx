'use client';

import { useState } from 'react';
import QRCode from 'react-qr-code';
import { submitPaymentAction, FeeBreakdown, PaymentRecord } from '@/app/actions/payment';
import Link from 'next/link';

interface Props {
  breakdown: FeeBreakdown;
  payments: PaymentRecord[];
  squadCode: string;
}

export default function PaymentClient({ breakdown, payments, squadCode }: Props) {
  const [amount, setAmount] = useState(breakdown.totalAmount.toString());
  const [utr, setUtr] = useState('');
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // UPI deep link URI
  const upiUri = `upi://pay?pa=${breakdown.hostUpiId}&pn=${encodeURIComponent(
    breakdown.hostAccountName
  )}&am=${breakdown.totalAmount}&cu=INR&tn=${encodeURIComponent(`VTU Athletics ${squadCode}`)}`;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Screenshot file size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotData(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (!screenshotData) {
      setError('Please upload a screenshot of your payment confirmation.');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('utrNumber', utr);
    formData.append('amountSubmitted', amount);
    formData.append('screenshotData', screenshotData);

    try {
      const res = await submitPaymentAction(formData);
      if (res.success) {
        setSuccess(true);
        setUtr('');
        setScreenshotData(null);
        window.location.reload();
      } else {
        setError(res.error || 'Failed to submit payment.');
      }
    } catch {
      setError('An unexpected network error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Link href="/squad/dashboard" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              ← Squad Dashboard
            </Link>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>
            Entry Fee Settlement ({squadCode})
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Scan the official host UPI QR code or transfer directly to settle squad participation dues.
          </p>
        </div>

        <div>
          <span className={`badge badge-${breakdown.squadPaymentStatus.toLowerCase()}`} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
            Current Status: {breakdown.squadPaymentStatus}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
        {/* Left: Fee Breakdown & UPI QR */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.25rem' }}>
            Computed Fee Breakdown
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                Regular Event Entries ({breakdown.regularEventsCount} × ₹{breakdown.regularFeeRate})
              </span>
              <strong>₹{breakdown.regularEventsCount * breakdown.regularFeeRate}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                Relay Teams ({breakdown.relayTeamsCount} × ₹{breakdown.relayFeeRate})
              </span>
              <strong>₹{breakdown.relayTeamsCount * breakdown.relayFeeRate}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                Half Marathon Entries ({breakdown.hmCount} × ₹{breakdown.hmFeeRate})
              </span>
              <strong>₹{breakdown.hmCount * breakdown.hmFeeRate}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                Reserve Events ({breakdown.reserveEventsCount} entries)
              </span>
              <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>FREE</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', fontSize: '1.3rem' }}>
              <strong style={{ color: '#fff' }}>Total Amount Due:</strong>
              <strong style={{ color: 'var(--accent-gold)' }}>₹{breakdown.totalAmount}</strong>
            </div>
          </div>

          {/* UPI QR Display */}
          <div style={{ textAlign: 'center', background: '#ffffff', padding: '1.5rem', borderRadius: 'var(--radius-md)', margin: '1.5rem 0' }}>
            <div style={{ display: 'inline-block' }}>
              <QRCode value={upiUri} size={180} />
            </div>
            <div style={{ marginTop: '0.75rem', color: '#07090e', fontWeight: 800, fontSize: '1rem' }}>
              Scan with GPay / PhonePe / Paytm / BHIM
            </div>
            <div style={{ color: '#475569', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              UPI ID: <code style={{ fontWeight: 700 }}>{breakdown.hostUpiId}</code>
            </div>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Account: <strong>{breakdown.hostAccountName}</strong> • Ensure your transaction remark includes your squad code <strong>{squadCode}</strong>.
          </div>
        </div>

        {/* Right: Payment Submission Form */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Submit Payment Proof
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Submitting payment proof locks your squad roster and alerts the finance verification desk.
          </p>

          {error && (
            <div style={{ padding: '0.85rem 1rem', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', color: '#f43f5e', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div style={{ padding: '0.85rem 1rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', color: '#34d399', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              ✓ Payment submitted successfully! Awaiting finance desk verification.
            </div>
          )}

          <form onSubmit={handleSubmit} id="form-submit-payment">
            <div className="form-group">
              <label className="form-label" htmlFor="amount">Amount Transferred (₹)</label>
              <input
                id="amount"
                type="number"
                required
                className="input-field"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="utr">12-Digit UTR / Transaction ID</label>
              <input
                id="utr"
                type="text"
                required
                placeholder="e.g. 428719283741"
                className="input-field"
                value={utr}
                onChange={(e) => setUtr(e.target.value.trim())}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Located in your UPI payment receipt under &quot;UPI Ref No.&quot; or &quot;UTR&quot;.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="screenshot">Upload Payment Receipt / Screenshot</label>
              <input
                id="screenshot"
                type="file"
                accept="image/*"
                required={!screenshotData}
                className="input-field"
                onChange={handleFileChange}
              />
            </div>

            {screenshotData && (
              <div style={{ margin: '1rem 0', textAlign: 'center' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={screenshotData}
                  alt="Receipt Preview"
                  style={{ maxHeight: '180px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1.5rem', padding: '0.9rem' }}
              id="btn-submit-payment-proof"
            >
              {loading ? 'Submitting Receipt...' : 'Submit Payment for Verification →'}
            </button>
          </form>
        </div>
      </div>

      {/* Payment Submission History */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem' }}>
          Payment Submission History
        </h2>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Submitted Date</th>
                <th>UTR Reference</th>
                <th>Amount Paid</th>
                <th>Verification Status</th>
                <th>Remarks / Reason</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No payment submissions yet for this squad.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(p.created_at).toLocaleString()}</td>
                    <td>
                      <code style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>{p.utr_number}</code>
                    </td>
                    <td style={{ fontWeight: 700 }}>₹{p.amount_submitted}</td>
                    <td>
                      <span className={`badge badge-${p.status.toLowerCase()}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      {p.rejection_reason ? (
                        <span style={{ color: 'var(--accent-rose)', fontSize: '0.85rem' }}>
                          Reason: {p.rejection_reason}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {p.status === 'VERIFIED' ? 'Verified by Host Desk' : 'Pending review'}
                        </span>
                      )}
                    </td>
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
