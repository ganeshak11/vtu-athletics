'use client';

import React, { useState } from 'react';
import { submitPaymentAction, FeeBreakdown, PaymentRecord } from '@/app/actions/payment';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import FeeInvoiceModal, { type InvoiceAthlete } from '@/components/invoice/FeeInvoiceModal';
import Link from 'next/link';
import { OFFICIAL_UPI_QR_SRC } from '@/lib/payment-config';
import { creditedAmount } from '@/lib/payment-status';

interface Props {
  breakdown: FeeBreakdown;
  payments: PaymentRecord[];
  squadCode: string;
  athletes?: InvoiceAthlete[];
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

export default function PaymentClient({ breakdown, payments, squadCode, athletes = [] }: Props) {
  const payableTarget = breakdown.balanceDue > 0 ? breakdown.balanceDue : (breakdown.totalPaid > 0 ? 0 : breakdown.totalAmount);
  // The amount is fixed to the balance due (the server rejects anything else); Finance then
  // records what was actually credited in the bank when verifying.
  const amount = String(breakdown.balanceDue);
  const [utr, setUtr] = useState('');
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  const isZeroSquad = breakdown.totalAmount <= 0;
  const isFullySettled = breakdown.balanceDue === 0 && breakdown.totalPaid > 0 && breakdown.squadPaymentStatus === 'VERIFIED';
  // A receipt is awaiting Finance Desk verification: roster frozen, no further submissions
  const isAwaitingVerification = breakdown.hasPendingPayment;
  const isRejected = breakdown.squadPaymentStatus === 'REJECTED' && !breakdown.hasPendingPayment;
  const latestRejection = payments.find((p) => p.status === 'REJECTED');
  const relayIssues = breakdown.relayIssues || [];
  const hasRelayBlockers = relayIssues.length > 0;
  const isPedMissing = !breakdown.pedName?.trim() || !breakdown.pedPhone?.trim();
  const isFormDisabled = isZeroSquad || isFullySettled || isAwaitingVerification || hasRelayBlockers || isPedMissing;
  const statusLabel =
    breakdown.squadPaymentStatus === 'DRAFT'
      ? 'DRAFT'
      : breakdown.squadPaymentStatus;

  // UPI deep link URI
  const [upiCopied, setUpiCopied] = useState(false);
  async function copyUpiId() {
    try {
      await navigator.clipboard.writeText(breakdown.hostUpiId);
      setUpiCopied(true);
      setTimeout(() => setUpiCopied(false), 2000);
    } catch {
      window.prompt('Copy the UPI ID:', breakdown.hostUpiId);
    }
  }

  const upiUri = `upi://pay?pa=${encodeURIComponent(breakdown.hostUpiId)}&pn=${encodeURIComponent(
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

    if (isAwaitingVerification) {
      setError('A payment is already awaiting verification. You can re-submit only if it is rejected.');
      setLoading(false);
      return;
    }

    const utrClean = utr.trim().replace(/[\s-]/g, '');
    if (!/^[A-Za-z0-9]{8,30}$/.test(utrClean)) {
      setError('Please enter a valid 8 to 30 character alphanumeric UTR / Bank reference number.');
      setLoading(false);
      return;
    }

    if (!screenshotData) {
      setError('Please upload a screenshot of your payment confirmation.');
      setLoading(false);
      return;
    }

    const amountNum = Number(amount);
    if (!/^\d+$/.test(amount.trim()) || amountNum <= 0) {
      setError('Amount must be a whole number of rupees greater than zero.');
      setLoading(false);
      return;
    }

    // Confirmation prompt
    const confirmed = window.confirm(
      `Confirm submission of ₹${amount} with UTR "${utrClean}" for entry fee settlement?\n\n⚠️ Submitting payment will LOCK your squad roster. You will no longer be able to add or remove athletes or edit relay teams.`
    );

    if (!confirmed) {
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('utrNumber', utrClean);
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowInvoice(true)}
            id="btn-download-invoice-top"
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: '1px solid #334155',
              padding: '0.45rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'all 0.2s ease',
            }}
          >
            <span>📄</span> Download Fee Invoice (PDF)
          </button>

          <Badge variant={breakdown.squadPaymentStatus === 'VERIFIED' ? 'success' : 'warning'} style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}>
            Status: {statusLabel}
          </Badge>
          {breakdown.rosterLocked && (
            <Badge variant="danger" style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}>
              🔒 Roster Locked
            </Badge>
          )}
        </div>
      </div>

      {isZeroSquad && (
        <div style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', color: '#b45309', fontSize: '0.95rem' }}>
          ℹ️ <strong>Roster Empty:</strong> You currently have 0 registered athletes. Please <Link href="/squad/dashboard" style={{ fontWeight: 700, textDecoration: 'underline' }}>register athletes</Link> into individual and relay disciplines before settling entry fees.
        </div>
      )}

      {isPedMissing && !isAwaitingVerification && !isFullySettled && (
        <div id="banner-ped-missing" style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.35)', color: '#92400e', fontSize: '0.92rem' }}>
          ⚠️ <strong>Add your PED / Sports Director contact before paying.</strong> The name and mobile number appear on your invoice and are used by the Finance Desk to reach you.{' '}
          <Link href="/squad/dashboard#ped-contact-card" style={{ fontWeight: 700, textDecoration: 'underline', color: '#92400e' }}>Add contact details &rarr;</Link>
        </div>
      )}

      {hasRelayBlockers && !isAwaitingVerification && (
        <div id="banner-relay-incomplete" style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.35)', color: '#92400e', fontSize: '0.92rem' }}>
          ⚠️ <strong>Complete your relay teams before paying.</strong> Paying locks the roster, so relay lineups can&apos;t be changed afterwards:
          <ul style={{ margin: '0.5rem 0 0.25rem', paddingLeft: '1.25rem', lineHeight: 1.6 }}>
            {relayIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
          <Link href="/squad/relay" style={{ fontWeight: 700, textDecoration: 'underline', color: '#92400e' }}>Go to Relay Teams &rarr;</Link>
        </div>
      )}

      {isAwaitingVerification && (
        <div id="banner-roster-locked-payment-submitted" style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)', background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.3)', color: '#1e40af', fontSize: '0.95rem' }}>
          🔒 <strong>Roster Locked &amp; Payment Submitted:</strong> Your receipt is awaiting Finance Desk verification. Athlete and relay changes are frozen. Contact the VTU Directorate if an emergency unlock is required.
        </div>
      )}

      {isRejected && (
        <div id="banner-payment-rejected" style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger)', fontSize: '0.95rem' }}>
          ✕ <strong>Payment Rejected:</strong> {latestRejection?.rejection_reason || 'The Finance Desk rejected your last submission.'} Please re-upload a correct receipt / UTR below. Your roster remains locked.
        </div>
      )}

      {breakdown.squadPaymentStatus === 'VERIFIED' && breakdown.rosterLocked && (
        <div id="banner-roster-locked-verified" style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', color: 'var(--success)', fontSize: '0.95rem' }}>
          🔒 <strong>Payment Verified — Roster Locked:</strong> Your squad roster is permanently frozen for the championship.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.5rem' }}>
        
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
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Relay Members ({breakdown.relayMembersBilled} &times; ₹{breakdown.relayFeeRate})
                  </span>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    ₹100 for each of the first 4 members of a team; members 5 &amp; 6 free (max ₹400 per team)
                  </div>
                  {(breakdown.relayTeams || []).map((t) => (
                    <div key={t.eventId} style={{ fontSize: '0.78rem', color: '#475569' }}>
                      {t.name}: {t.members} member{t.members === 1 ? '' : 's'} &rarr; ₹{t.fee}
                    </div>
                  ))}
                </div>
                <span style={{ fontWeight: 700 }}>₹{breakdown.relayFeeTotal}</span>
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
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>Pay by UPI</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Scan the QR code with any UPI app (GPay, PhonePe, Paytm, BHIM, bank app)</div>
                    </div>
                  </div>

                  {/* Official host college UPI QR */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={OFFICIAL_UPI_QR_SRC}
                      alt={`UPI QR code for ${breakdown.hostUpiId}`}
                      id="img-upi-qr"
                      width={240}
                      height={238}
                      style={{ width: '240px', height: 'auto', background: '#ffffff', padding: '20px', boxSizing: 'content-box', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: 700, textAlign: 'center' }}>
                      Enter the amount <span style={{ color: 'var(--accent-primary)' }}>₹{payableTarget}</span> manually in your UPI app
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px dashed #e2e8f0' }}>
                      <span style={{ color: '#64748b' }}>Beneficiary Account:</span>
                      <strong style={{ color: '#0f172a', textAlign: 'right' }}>{breakdown.hostAccountName}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px dashed #e2e8f0', alignItems: 'center' }}>
                      <span style={{ color: '#64748b' }}>Host UPI VPA:</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <code style={{ fontWeight: 700, color: 'var(--accent-primary)', background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px', wordBreak: 'break-all' }}>
                          {breakdown.hostUpiId}
                        </code>
                        <button
                          type="button"
                          onClick={copyUpiId}
                          id="btn-copy-upi"
                          style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', cursor: 'pointer' }}
                        >
                          {upiCopied ? '✓ Copied' : 'Copy'}
                        </button>
                      </span>
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
                    ⚡ Pay ₹{payableTarget} in UPI App (on mobile)
                  </a>

                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, textAlign: 'center', lineHeight: 1.4 }}>
                    Enter <strong>{squadCode}</strong> in the payment remarks/narration. After paying, copy the UPI reference / UTR number from the receipt and submit it with the screenshot on the right.
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
            
            {/* Payment & Registration Workflow Notice */}
            {!isFullySettled && !isAwaitingVerification && (
              <div style={{
                padding: '1rem 1.15rem',
                background: '#eff6ff',
                border: '1.5px solid #bfdbfe',
                borderRadius: '12px',
                color: '#1e40af',
                fontSize: '0.875rem',
                lineHeight: 1.5,
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>💡</span>
                <div>
                  <strong style={{ display: 'block', marginBottom: '0.2rem', color: '#1e3a8a', fontSize: '0.925rem' }}>
                    Roster Lock Policy
                  </strong>
                  Submitting a payment <strong>locks your squad roster</strong>. Finalise all athletes, events and relay teams before you pay — after submission, no athletes can be added or removed and relay teams cannot be edited. If a receipt is rejected you may re-upload it; the roster stays locked.
                  {!breakdown.rosterLocked && (
                    <div style={{ marginTop: '0.45rem', fontSize: '0.8rem', color: '#2563eb' }}>
                      Still need to nominate athletes? <Link href="/squad/athletes" style={{ color: '#1d4ed8', fontWeight: 700, textDecoration: 'underline' }}>Go to Athlete Nominations &rarr;</Link>
                    </div>
                  )}
                </div>
              </div>
            )}

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
                  type="text"
                  readOnly
                  aria-describedby="amount-help"
                  style={{ ...inputStyle, fontWeight: 800, background: 'var(--bg-tertiary)', cursor: 'default' }}
                  value={`₹${amount}`}
                  disabled={isFormDisabled}
                />
                <div id="amount-help" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: 1.45 }}>
                  Transfer exactly this amount. The Finance Desk checks the amount actually credited against your UTR in the bank statement — only that amount is counted.
                </div>
              </div>

              <div>
                <label style={labelStyle} htmlFor="utr">UTR / Transaction Reference (8–30 characters) *</label>
                <input
                  id="utr"
                  type="text"
                  required
                  placeholder="e.g. 428719283741"
                  style={{ ...inputStyle, fontFamily: 'monospace', fontWeight: 700 }}
                  value={utr}
                  maxLength={34}
                  onChange={(e) => setUtr(e.target.value.trim())}
                  disabled={isFormDisabled}
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
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  required={!screenshotData}
                  style={{ ...inputStyle, padding: '0.5rem', fontSize: '0.85rem' }}
                  onChange={handleFileChange}
                  disabled={isFormDisabled}
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
                disabled={loading || isFormDisabled}
                id="btn-submit-payment-proof"
                style={{
                  width: '100%',
                  marginTop: '0.5rem',
                  background: isFormDisabled ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
                  color: isFormDisabled ? 'var(--text-muted)' : '#fff',
                  border: 'none',
                  padding: '0.9rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '1rem',
                  fontWeight: 800,
                  cursor: loading || isFormDisabled ? 'not-allowed' : 'pointer',
                  opacity: loading || isFormDisabled ? 0.6 : 1,
                  boxShadow: isFormDisabled ? 'none' : '0 4px 14px var(--accent-glow)'
                }}
              >
                {loading 
                  ? 'Submitting Receipt...' 
                  : isFullySettled 
                    ? '✓ Entry Fees Fully Settled' 
                    : isAwaitingVerification
                    ? '🔒 Roster Locked & Payment Submitted'
                    : isPedMissing
                    ? '⚠️ Add PED Contact Details First'
                    : hasRelayBlockers
                    ? '⚠️ Complete Relay Teams First'
                    : isRejected
                    ? `Re-submit Payment Proof (₹${amount}) →`
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
                      <td style={{ padding: '1rem', fontWeight: 700 }}>
                        ₹{p.amount_submitted}
                        {p.status === 'VERIFIED' && creditedAmount(p) !== p.amount_submitted && (
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--danger)', marginTop: '0.2rem' }}>
                            Credited in bank: ₹{creditedAmount(p)}
                          </div>
                        )}
                      </td>
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

      {/* Official Fee Invoice PDF Modal */}
      <FeeInvoiceModal
        isOpen={showInvoice}
        onClose={() => setShowInvoice(false)}
        breakdown={breakdown}
        payments={payments}
        squadCode={squadCode}
        athletes={athletes}
      />

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
