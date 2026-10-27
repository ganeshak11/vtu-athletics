'use client';

import React, { useState } from 'react';
import { submitPaymentAction, FeeBreakdown, PaymentRecord } from '@/app/actions/payment';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

interface Props {
  breakdown: FeeBreakdown;
  payments: PaymentRecord[];
  squadCode: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function PaymentClient({ breakdown, payments, squadCode }: Props) {
  const payableTarget = breakdown.balanceDue > 0 ? breakdown.balanceDue : (breakdown.totalPaid > 0 ? 0 : breakdown.totalAmount);
  const [amount, setAmount] = useState(payableTarget.toString());
  const [utr, setUtr] = useState('');
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isZeroSquad = breakdown.totalAmount <= 0;
  const isFullySettled = breakdown.balanceDue === 0 && breakdown.totalPaid > 0 && breakdown.squadPaymentStatus === 'VERIFIED';

  // UPI deep link URI
  const upiUri = `upi://pay?pa=${breakdown.hostUpiId}&pn=${encodeURIComponent(
    breakdown.hostAccountName
  )}&am=${payableTarget}&cu=INR&tn=${encodeURIComponent(`VTU Athletics ${squadCode}`)}`;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Screenshot file size must be less than 5MB.');
      e.target.value = '';
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      alert('Invalid file format. Please upload JPG, PNG, WebP or PDF receipt.');
      e.target.value = '';
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

    if (isZeroSquad) {
      setError('Cannot submit payment for an empty roster. Please register athletes first.');
      setLoading(false);
      return;
    }

    if (!utr.trim() || utr.trim().length < 8) {
      setError('Please enter a valid 12-digit transaction UTR / Reference number.');
      setLoading(false);
      return;
    }

    if (!screenshotData) {
      setError('Please upload a screenshot of your payment confirmation.');
      setLoading(false);
      return;
    }

    // Confirmation to prevent accidental premature roster locking
    const confirmed = window.confirm(
      "⚠️ CONFIRM ROSTER LOCK:\n\n" +
      "Submitting payment will PERMANENTLY LOCK your squad nominations.\n\n" +
      "Have you registered ALL your student-athletes, reserve disciplines, and relay squads?\n\n" +
      "• Click OK to lock nominations & submit payment proof.\n" +
      "• Click Cancel if you still need to add or edit athletes."
    );

    if (!confirmed) {
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('utrNumber', utr.trim());
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
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link href="/squad/dashboard" style={{ fontSize: '0.875rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
            &larr; Back to Contingent Roster
          </Link>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--text-primary)' }}>
            Entry Fee Settlement ({squadCode})
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Official participation dues settlement &bull; Dr. ACS College of Engineering Meet 2026
          </p>
        </div>

        <Badge variant={breakdown.squadPaymentStatus === 'VERIFIED' ? 'success' : 'warning'} style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}>
          Status: {breakdown.squadPaymentStatus}
        </Badge>
      </div>

      {isZeroSquad && (
        <div style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', color: '#b45309', fontSize: '0.95rem' }}>
          ℹ️ <strong>Roster Empty:</strong> You currently have 0 registered athletes. Please <Link href="/squad/dashboard" style={{ fontWeight: 700, textDecoration: 'underline' }}>register athletes</Link> into individual and relay disciplines before settling entry fees.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
        
        {/* Left: Fee Breakdown & UPI QR */}
        <Card>
          <CardHeader>
            <CardTitle style={{ fontSize: '1.15rem' }}>Computed Fee Breakdown</CardTitle>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.95rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Regular Event Entries ({breakdown.regularEventsCount} &times; ₹{breakdown.regularFeeRate})
                </span>
                <span style={{ fontWeight: 700 }}>₹{breakdown.regularEventsCount * breakdown.regularFeeRate}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Relay Squad Members ({breakdown.relayTeamsCount} &times; ₹{breakdown.relayFeeRate})
                </span>
                <span style={{ fontWeight: 700 }}>₹{breakdown.relayTeamsCount * breakdown.relayFeeRate}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Half Marathon Participants ({breakdown.hmCount} &times; ₹{breakdown.hmFeeRate})
                </span>
                <span style={{ fontWeight: 700 }}>₹{breakdown.hmCount * breakdown.hmFeeRate}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.6rem', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Reserve Disciplines ({breakdown.reserveEventsCount} entries)
                </span>
                <span style={{ color: 'var(--success)', fontWeight: 700 }}>FREE (₹0)</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Roster Fee:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  ₹{breakdown.totalAmount}
                </span>
              </div>

              {breakdown.totalPaid > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--success)', fontWeight: 600 }}>
                    Verified Payments Settled:
                  </span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success)' }}>
                    -₹{breakdown.totalPaid}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '2px solid var(--border-color)', alignItems: 'center' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>Net Balance Due:</span>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: breakdown.balanceDue > 0 ? 'var(--accent-primary)' : 'var(--success)' }}>
                  ₹{breakdown.balanceDue}
                </span>
              </div>
            </div>

            {isFullySettled ? (
              <div style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: 'var(--success)', textAlign: 'center', fontWeight: 600 }}>
                ✓ All entry fees for your current squad roster are fully verified and settled.
              </div>
            ) : (
              <>
                {/* Institutional Banking & Electronic Settlement Card */}
                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>🏛️</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>Directorate Electronic Transfer Desk</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>State Bank of India / NEFT / RTGS / UPI</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px dashed #e2e8f0' }}>
                      <span style={{ color: '#64748b' }}>Beneficiary Account:</span>
                      <strong style={{ color: '#0f172a', textAlign: 'right' }}>{breakdown.hostAccountName}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px dashed #e2e8f0', alignItems: 'center' }}>
                      <span style={{ color: '#64748b' }}>Host UPI VPA:</span>
                      <code style={{ fontWeight: 700, color: 'var(--accent-primary)', background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px' }}>
                        {breakdown.hostUpiId}
                      </code>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px dashed #e2e8f0' }}>
                      <span style={{ color: '#64748b' }}>Mandatory Remark:</span>
                      <strong style={{ color: '#0f172a' }}>{squadCode}</strong>
                    </div>
                  </div>

                  <a
                    href={upiUri}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.6rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--accent-primary)',
                      color: '#ffffff',
                      textDecoration: 'none',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      textAlign: 'center',
                      marginTop: '0.25rem'
                    }}
                  >
                    ⚡ Open UPI App Directly
                  </a>

                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, textAlign: 'center', lineHeight: 1.4 }}>
                    Enter <strong>{squadCode}</strong> in the payment remarks/narration. After transferring, copy the 12-digit UTR and upload the receipt on the right.
                  </p>
                </div>
              </>
            )}

          </CardContent>
        </Card>

        {/* Right: Payment Submission Form */}
        <Card>
          <CardHeader>
            <CardTitle style={{ fontSize: '1.15rem' }}>Submit Payment Proof</CardTitle>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Prominent Roster Lock Alert */}
            {!isFullySettled && (
              <div style={{
                padding: '1rem 1.15rem',
                background: '#fffbeb',
                border: '1.5px solid #fde68a',
                borderRadius: '12px',
                color: '#92400e',
                fontSize: '0.875rem',
                lineHeight: 1.5,
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>⚠️</span>
                <div>
                  <strong style={{ display: 'block', marginBottom: '0.2rem', color: '#78350f', fontSize: '0.925rem' }}>
                    IMPORTANT: Ensure Entire Squad is Registered Before Paying
                  </strong>
                  Submitting payment proof <strong>permanently locks your squad nominations</strong>. Once locked, athlete entries, events, and relay compositions cannot be modified directly.
                  <div style={{ marginTop: '0.45rem', fontSize: '0.8rem', color: '#b45309' }}>
                    Need to add more athletes first? <Link href="/squad/athletes" style={{ color: '#1d4ed8', fontWeight: 700, textDecoration: 'underline' }}>Return to Athlete Nominations &rarr;</Link>
                  </div>
                </div>
              </div>
            )}

            {/* Emergency & Amendment Protocol Notice */}
            <div style={{
              padding: '0.85rem 1rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '0.8rem',
              color: '#475569',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.6rem',
              lineHeight: 1.45,
            }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🚨</span>
              <div>
                <strong>Accidental Lock or Emergency Changes?</strong> If you accidentally submitted payment before finishing, or need an emergency athlete medical substitution, contact the <strong>VTU Meet Directorate Desk</strong>. The Administrator can unlock your roster or approve official late entries.
              </div>
            </div>

            {isFullySettled && (
              <div style={{ padding: '0.85rem 1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-sm)', color: 'var(--success)', fontSize: '0.9rem' }}>
                ✓ Squad Roster Fees Settled. No pending balance due.
              </div>
            )}

            {error && (
              <div style={{ padding: '0.85rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: '0.85rem' }}>
                ⚠️ {error}
              </div>
            )}

            {success && (
              <div style={{ padding: '0.85rem 1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-sm)', color: 'var(--success)', fontSize: '0.85rem' }}>
                ✓ Payment proof submitted successfully! Awaiting finance verification.
              </div>
            )}

            <form onSubmit={handleSubmit} id="form-submit-payment" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle} htmlFor="amount">Amount Transferred (₹) *</label>
                <input
                  id="amount"
                  type="number"
                  required
                  style={inputStyle}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isZeroSquad || isFullySettled}
                />
              </div>

              <div>
                <label style={labelStyle} htmlFor="utr">12-Digit UTR / Transaction Reference *</label>
                <input
                  id="utr"
                  type="text"
                  required
                  placeholder="e.g. 428719283741"
                  style={{ ...inputStyle, fontFamily: 'monospace', fontWeight: 700 }}
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.trim())}
                  disabled={isZeroSquad}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                  Found on your UPI receipt under &quot;UPI Ref No&quot; or &quot;UTR&quot;.
                </span>
              </div>

              <div>
                <label style={labelStyle} htmlFor="screenshot">Upload Payment Receipt Screenshot *</label>
                <input
                  id="screenshot"
                  type="file"
                  accept="image/*"
                  required={!screenshotData}
                  style={{ ...inputStyle, padding: '0.5rem', fontSize: '0.85rem' }}
                  onChange={handleFileChange}
                  disabled={isZeroSquad}
                />
              </div>

              {screenshotData && (
                <div style={{ margin: '0.5rem 0', textAlign: 'center' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={screenshotData}
                    alt="Receipt Preview"
                    style={{ maxHeight: '160px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading || isZeroSquad || isFullySettled}
                id="btn-submit-payment-proof"
                style={{
                  width: '100%',
                  marginTop: '0.5rem',
                  background: isZeroSquad || isFullySettled ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
                  color: isZeroSquad || isFullySettled ? 'var(--text-muted)' : '#fff',
                  border: 'none',
                  padding: '0.9rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '1rem',
                  fontWeight: 800,
                  cursor: loading || isZeroSquad || isFullySettled ? 'not-allowed' : 'pointer',
                  opacity: loading || isZeroSquad || isFullySettled ? 0.6 : 1,
                  boxShadow: isZeroSquad || isFullySettled ? 'none' : '0 4px 14px var(--accent-glow)'
                }}
              >
                {loading 
                  ? 'Submitting Receipt...' 
                  : isFullySettled 
                    ? '✓ Entry Fees Fully Settled' 
                    : `Submit Payment for Verification (₹${amount}) →`}
              </button>
            </form>

          </CardContent>
        </Card>

      </div>

      {/* Payment Submission History */}
      <Card>
        <CardHeader>
          <CardTitle style={{ fontSize: '1.15rem' }}>Payment Submission History</CardTitle>
        </CardHeader>
        <CardContent style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>UTR Reference</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>Amount</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>Desk Remarks</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No payment submissions recorded yet for this squad.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem', fontSize: '0.9rem' }} suppressHydrationWarning>
                        {formatDate(p.created_at)}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <code style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{p.utr_number}</code>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 700 }}>₹{p.amount_submitted}</td>
                      <td style={{ padding: '1rem' }}>
                        <Badge variant={p.status === 'VERIFIED' ? 'success' : p.status === 'REJECTED' ? 'danger' : 'warning'}>
                          {p.status}
                        </Badge>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                        {p.rejection_reason ? (
                          <span style={{ color: 'var(--danger)' }}>
                            Reason: {p.rejection_reason}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {p.status === 'VERIFIED' ? 'Verified by Host Desk' : 'Under Review'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: '0.35rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.95rem',
  outline: 'none',
  boxSizing: 'border-box',
};
