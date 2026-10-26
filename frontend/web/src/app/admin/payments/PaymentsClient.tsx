'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { verifySquadPaymentAction } from '@/app/actions/admin-operations';

interface Props {
  squads: any[];
}

export default function PaymentsClient({ squads }: Props) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Active squad in modal
  const [selectedSquad, setSelectedSquad] = useState<any | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filter squads
  const filteredSquads = squads.filter((sq) => {
    if (statusFilter !== 'ALL' && sq.payment_status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const colName = (sq.colleges?.name || '').toLowerCase();
      const colCode = (sq.colleges?.code || sq.squad_code || '').toLowerCase();
      const ped = (sq.ped_name || '').toLowerCase();
      const utr = (sq.latestPayment?.utr_number || '').toLowerCase();
      if (!colName.includes(q) && !colCode.includes(q) && !ped.includes(q) && !utr.includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Handle Verify or Reject
  async function handleVerification(status: 'VERIFIED' | 'REJECTED') {
    if (!selectedSquad) return;
    setIsVerifying(true);
    setActionError(null);

    try {
      const res = await verifySquadPaymentAction(
        selectedSquad.id,
        status,
        status === 'REJECTED' ? rejectionReason : undefined
      );

      if (res.success) {
        // Update local state
        selectedSquad.payment_status = status;
        if (selectedSquad.latestPayment) {
          selectedSquad.latestPayment.status = status;
          if (status === 'REJECTED') selectedSquad.latestPayment.rejection_reason = rejectionReason;
        }
        setSelectedSquad(null);
        setShowRejectInput(false);
        setRejectionReason('');
        router.refresh();
      } else {
        setActionError(res.error || 'Failed to update payment status.');
      }
    } catch (err: any) {
      setActionError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="admin-page-header">
        <div className="admin-title-group">
          <h2>College Payment Verification Portal</h2>
          <p>Inspect submitted transaction UTRs, payment proofs, and approve participating delegations</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-inputs">
          <input
            type="text"
            placeholder="🔍 Search college, code, PED, or UTR number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-control"
            style={{ minWidth: '280px' }}
            id="payment-search"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-control"
            id="payment-status-filter"
          >
            <option value="ALL">All Squads ({squads.length})</option>
            <option value="SUBMITTED">⏳ Pending Verification</option>
            <option value="VERIFIED">✓ Verified & Approved</option>
            <option value="REJECTED">✕ Rejected</option>
            <option value="DRAFT">Draft (Unsubmitted)</option>
          </select>
        </div>

        {/* Counter */}
        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Showing <strong>{filteredSquads.length}</strong> of <strong>{squads.length}</strong> squads
        </div>
      </div>

      {/* Squads List Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>College</th>
              <th style={{ width: '90px' }}>Division</th>
              <th>Physical Education Director</th>
              <th style={{ width: '100px' }}>Athletes</th>
              <th>Expected Fee</th>
              <th>Submitted UTR & Amount</th>
              <th style={{ width: '130px' }}>Status</th>
              <th style={{ width: '120px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredSquads.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💳</div>
                  <div style={{ fontWeight: 600, color: '#475569' }}>No squads found</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                    Adjust your search query or filter to view college contingents.
                  </div>
                </td>
              </tr>
            ) : (
              filteredSquads.map((sq) => {
                const status = sq.payment_status || 'DRAFT';
                const athleteCount = sq.profiles?.length || 0;
                const payment = sq.latestPayment;

                return (
                  <tr key={sq.id}>
                    {/* College */}
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>
                        {sq.colleges?.code || sq.squad_code}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '280px' }}>
                        {sq.colleges?.name}
                      </div>
                    </td>

                    {/* Division */}
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          background: sq.gender === 'men' ? '#eff6ff' : '#fdf2f8',
                          color: sq.gender === 'men' ? '#1d4ed8' : '#be185d',
                        }}
                      >
                        {sq.gender === 'men' ? 'Men' : 'Women'}
                      </span>
                    </td>

                    {/* PED */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>
                        {sq.ped_name || 'Not Provided'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {sq.ped_phone ? `📞 ${sq.ped_phone}` : ''}
                      </div>
                    </td>

                    {/* Athletes Count */}
                    <td>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{athleteCount}</span>{' '}
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Athletes</span>
                    </td>

                    {/* Expected Fee */}
                    <td>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>
                        ₹{sq.expectedFee.toLocaleString()}
                      </span>
                    </td>

                    {/* Submitted UTR & Amount */}
                    <td>
                      {payment ? (
                        <div>
                          <div style={{ fontWeight: 600, color: '#2563eb', fontSize: '0.8rem' }}>
                            UTR: {payment.utr_number || 'N/A'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                            Paid: ₹{(payment.amount_submitted || 0).toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          No submission yet
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td>
                      <span
                        className={`badge-status ${
                          status === 'VERIFIED'
                            ? 'badge-verified'
                            : status === 'SUBMITTED'
                            ? 'badge-pending'
                            : status === 'REJECTED'
                            ? 'badge-rejected'
                            : 'badge-draft'
                        }`}
                      >
                        {status === 'VERIFIED'
                          ? '✓ Verified'
                          : status === 'SUBMITTED'
                          ? '⏳ Submitted'
                          : status === 'REJECTED'
                          ? '✕ Rejected'
                          : 'Draft'}
                      </span>
                    </td>

                    {/* Open Button */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSquad(sq);
                          setShowRejectInput(false);
                          setRejectionReason(sq.latestPayment?.rejection_reason || '');
                          setActionError(null);
                        }}
                        className="btn-admin btn-admin-primary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                        id={`btn-open-${sq.squad_code}`}
                      >
                        Open Details →
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Verification Modal Dialog */}
      {selectedSquad && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '780px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🏫</span>
                  <span>{selectedSquad.colleges?.name || selectedSquad.squad_code}</span>
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                  Code: <strong>{selectedSquad.colleges?.code || selectedSquad.squad_code}</strong> • Division:{' '}
                  <strong>{selectedSquad.gender === 'men' ? 'Men' : 'Women'}</strong> • PED:{' '}
                  <strong>{selectedSquad.ped_name || 'N/A'} ({selectedSquad.ped_phone || 'No phone'})</strong>
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedSquad(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {actionError && (
                <div style={{ background: '#fee2e2', border: '1px solid #fecdd3', color: '#b91c1c', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  ⚠️ {actionError}
                </div>
              )}

              {/* Transaction & Fee Comparison Section */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {/* Financial Summary Card */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Financial Computation
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Calculated Expected Fee:</span>
                    <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>
                      ₹{selectedSquad.expectedFee.toLocaleString()}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Amount Submitted by College:</span>
                    <strong style={{ fontSize: '1.05rem', color: '#059669' }}>
                      ₹{(selectedSquad.latestPayment?.amount_submitted || 0).toLocaleString()}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Transaction UTR / Ref #:</span>
                    <strong style={{ fontSize: '0.85rem', color: '#2563eb', fontFamily: 'monospace' }}>
                      {selectedSquad.latestPayment?.utr_number || 'N/A'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Verification Status:</span>
                    <span
                      className={`badge-status ${
                        selectedSquad.payment_status === 'VERIFIED'
                          ? 'badge-verified'
                          : selectedSquad.payment_status === 'SUBMITTED'
                          ? 'badge-pending'
                          : selectedSquad.payment_status === 'REJECTED'
                          ? 'badge-rejected'
                          : 'badge-draft'
                      }`}
                    >
                      {selectedSquad.payment_status}
                    </span>
                  </div>
                </div>

                {/* Screenshot Preview Card */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Payment Proof Screenshot
                  </div>
                  <div style={{ flex: 1, minHeight: '160px', background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selectedSquad.latestPayment?.screenshot_url ? (
                      <a
                        href={selectedSquad.latestPayment.screenshot_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'block', width: '100%', height: '100%', textAlign: 'center' }}
                      >
                        <img
                          src={selectedSquad.latestPayment.screenshot_url}
                          alt="Payment Receipt"
                          style={{ maxHeight: '180px', maxWidth: '100%', objectFit: 'contain' }}
                        />
                        <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '4px' }}>
                          🔍 Click to view full resolution
                        </div>
                      </a>
                    ) : (
                      <div style={{ color: '#94a3b8', textAlign: 'center', fontSize: '0.85rem' }}>
                        <div>🧾</div>
                        <div>No screenshot uploaded</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Participants Details Table */}
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                  Registered Participants in Delegation ({selectedSquad.profiles?.length || 0})
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', maxHeight: '220px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Athlete Name</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>USN</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Bib #</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Events</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSquad.profiles?.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>
                            No athletes registered in this contingent.
                          </td>
                        </tr>
                      ) : (
                        selectedSquad.profiles.map((p: any) => (
                          <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.45rem 0.75rem', fontWeight: 600, color: '#0f172a' }}>
                              {p.sslc_name}
                            </td>
                            <td style={{ padding: '0.45rem 0.75rem', color: '#2563eb' }}>
                              {p.usn}
                            </td>
                            <td style={{ padding: '0.45rem 0.75rem' }}>
                              {p.bid_number ? `#${p.bid_number}` : 'Pending'}
                            </td>
                            <td style={{ padding: '0.45rem 0.75rem', color: '#475569' }}>
                              {p.registrations?.map((r: any) => r.events?.name).join(', ') || 'None'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rejection input box when toggled */}
              {showRejectInput && (
                <div style={{ marginTop: '1rem', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.35rem' }}>
                    Reason for Payment Rejection:
                  </label>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. UTR number not matched in bank statement, amount is short..."
                    className="filter-control"
                    style={{ width: '100%', borderColor: '#fda4af' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowRejectInput(false)}
                      className="btn-admin btn-admin-secondary"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isVerifying || !rejectionReason.trim()}
                      onClick={() => handleVerification('REJECTED')}
                      className="btn-admin btn-admin-danger"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                    >
                      {isVerifying ? 'Rejecting...' : 'Confirm Rejection'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Decision Footer */}
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setSelectedSquad(null)}
                className="btn-admin btn-admin-secondary"
              >
                Close
              </button>

              {!showRejectInput && (
                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={() => setShowRejectInput(true)}
                  className="btn-admin btn-admin-danger"
                  id="btn-reject-payment"
                >
                  ✕ Reject Payment
                </button>
              )}

              <button
                type="button"
                disabled={isVerifying}
                onClick={() => handleVerification('VERIFIED')}
                className="btn-admin btn-admin-success"
                id="btn-approve-payment"
              >
                {isVerifying ? 'Approving...' : '✓ Approve & Verify Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
