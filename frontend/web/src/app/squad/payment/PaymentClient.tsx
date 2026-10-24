'use client';

import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { submitPaymentAction, FeeBreakdown, PaymentRecord } from '@/app/actions/payment';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
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

  const isZeroSquad = breakdown.totalAmount <= 0;

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
                <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>Total Fee Due:</span>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                  ₹{breakdown.totalAmount}
                </span>
              </div>
            </div>

            {/* UPI QR Display */}
            <div style={{ textAlign: 'center', background: '#ffffff', padding: '1.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'inline-block' }}>
                <QRCode value={upiUri} size={180} />
              </div>
              <div style={{ marginTop: '0.75rem', color: '#0f172a', fontWeight: 800, fontSize: '0.95rem' }}>
                Scan to Pay via UPI (GPay / PhonePe / Paytm / BHIM)
              </div>
              <div style={{ color: '#475569', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                UPI ID: <code style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{breakdown.hostUpiId}</code>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, textAlign: 'center' }}>
              Beneficiary: <strong>{breakdown.hostAccountName}</strong> &bull; Please add squad remark <strong>{squadCode}</strong> in your UPI transfer description.
            </p>

          </CardContent>
        </Card>

        {/* Right: Payment Submission Form */}
        <Card>
          <CardHeader>
            <CardTitle style={{ fontSize: '1.15rem' }}>Submit Payment Proof</CardTitle>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Submitting payment receipt locks your squad roster and initiates financial verification with the host desk.
            </p>

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
                  disabled={isZeroSquad}
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
                disabled={loading || isZeroSquad}
                id="btn-submit-payment-proof"
                style={{
                  width: '100%',
                  marginTop: '0.5rem',
                  background: isZeroSquad ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
                  color: isZeroSquad ? 'var(--text-muted)' : '#fff',
                  border: 'none',
                  padding: '0.9rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '1rem',
                  fontWeight: 800,
                  cursor: loading || isZeroSquad ? 'not-allowed' : 'pointer',
                  opacity: loading || isZeroSquad ? 0.6 : 1,
                  boxShadow: isZeroSquad ? 'none' : '0 4px 14px var(--accent-glow)'
                }}
              >
                {loading ? 'Submitting Receipt...' : `Submit Payment for Verification (₹${amount}) →`}
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
                      <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{new Date(p.created_at).toLocaleString()}</td>
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
