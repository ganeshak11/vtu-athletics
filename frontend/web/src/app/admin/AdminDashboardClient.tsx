'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AdminDashboardStats,
  toggleRegistrationStatusAction,
  generateBibNumbersAction,
} from '@/app/actions/admin-operations';

interface Props {
  initialStats: AdminDashboardStats;
}

export default function AdminDashboardClient({ initialStats }: Props) {
  const router = useRouter();
  const [stats, setStats] = useState<AdminDashboardStats>(initialStats);
  const [loadingToggle, setLoadingToggle] = useState(false);
  const [loadingBibs, setLoadingBibs] = useState(false);
  
  // Feedback modals & messages
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'confirm_toggle';
    title: string;
    message: string;
    items?: string[];
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  // Handle registration toggle
  async function handleToggleRegistration() {
    setLoadingToggle(true);
    try {
      const res = await toggleRegistrationStatusAction();
      if (res.success) {
        setStats((prev) => ({
          ...prev,
          registrationOpen: res.isOpen,
          registrationClosedAt: res.isOpen ? null : new Date().toISOString(),
        }));
        setModalState({
          isOpen: true,
          type: 'success',
          title: res.isOpen ? 'Registration Opened' : 'Registration Closed & Locked',
          message: res.isOpen
            ? 'College squads can now add athletes, modify events, and submit registration payments.'
            : 'Registration is now CLOSED. Squad rosters are permanently locked across all colleges.',
        });
      } else {
        setModalState({
          isOpen: true,
          type: 'error',
          title: 'Operation Failed',
          message: res.error || 'Failed to update registration status.',
        });
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Network Error',
        message: err.message || 'An error occurred while contacting the server.',
      });
    } finally {
      setLoadingToggle(false);
      router.refresh();
    }
  }

  // Handle Generate Bib Numbers
  async function handleGenerateBibNumbers() {
    // Client-side quick check
    if (stats.registrationOpen) {
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Registration Is Open',
        message: 'Strict Rule: Registration is currently OPEN. You must click "Close Registration" first before generating bib numbers.',
      });
      return;
    }

    setLoadingBibs(true);
    try {
      const res = await generateBibNumbersAction();
      if (res.success) {
        setStats((prev) => ({
          ...prev,
          totalBibsGenerated: res.assignedCount || prev.totalBibsGenerated,
        }));
        setModalState({
          isOpen: true,
          type: 'success',
          title: 'Bib Numbers & QR Codes Generated!',
          message: `Successfully allocated serialized bib numbers to ${res.assignedCount} verified athletes (Boys starting at #100, Girls starting at #2001). QR codes have been attached to their accreditation badges.`,
        });
      } else {
        setModalState({
          isOpen: true,
          type: 'error',
          title: 'Bib Allocation Blocked',
          message: res.error || 'Failed to generate bib numbers.',
          items: res.unverifiedSquads,
        });
      }
    } catch (err: any) {
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error Occurred',
        message: err.message || 'An unexpected error occurred while generating bibs.',
      });
    } finally {
      setLoadingBibs(false);
      router.refresh();
    }
  }

  return (
    <div>
      {/* Page Title */}
      <div className="admin-page-header">
        <div className="admin-title-group">
          <h2>Administrative Command Center</h2>
          <p>Real-time tournament governance, registration controls, and delegation management</p>
        </div>
      </div>

      {/* Control Banner: Single Toggle Button & Generate Bib Numbers Button */}
      <div className="control-panel-banner">
        <div className="control-status-info">
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
              Current Portal State
            </div>
            <div className={`status-indicator-badge ${stats.registrationOpen ? 'status-badge-open' : 'status-badge-closed'}`}>
              <span style={{ fontSize: '0.9rem' }}>{stats.registrationOpen ? '●' : '■'}</span>
              <span>{stats.registrationOpen ? 'REGISTRATION OPEN' : 'REGISTRATION CLOSED'}</span>
            </div>
          </div>
          {stats.registrationClosedAt && (
            <div style={{ fontSize: '0.75rem', color: '#64748b', borderLeft: '1px solid #e2e8f0', paddingLeft: '1rem' }}>
              Closed on: <strong style={{ color: '#0f172a' }}>{new Date(stats.registrationClosedAt).toLocaleString()}</strong>
            </div>
          )}
        </div>

        {/* Action Buttons: Close/Open Registration and Generate Bib Numbers */}
        <div className="admin-actions-group">
          {/* Toggle Registration Button */}
          <button
            type="button"
            disabled={loadingToggle || loadingBibs}
            onClick={() => {
              if (stats.registrationOpen) {
                if (window.confirm('Are you sure you want to CLOSE registration? This will lock rosters for all colleges.')) {
                  handleToggleRegistration();
                }
              } else {
                if (window.confirm('Are you sure you want to RE-OPEN registration?')) {
                  handleToggleRegistration();
                }
              }
            }}
            className={`btn-admin ${stats.registrationOpen ? 'btn-admin-danger' : 'btn-admin-success'}`}
            id="btn-toggle-registration"
          >
            {loadingToggle ? (
              'Processing...'
            ) : stats.registrationOpen ? (
              <>
                <span>🔒</span>
                <span>Close Registration</span>
              </>
            ) : (
              <>
                <span>🔓</span>
                <span>Open Registration</span>
              </>
            )}
          </button>

          {/* Generate Bib Numbers Button (Directly next to close registration) */}
          <button
            type="button"
            disabled={loadingBibs || loadingToggle}
            onClick={handleGenerateBibNumbers}
            className="btn-admin btn-admin-primary"
            id="btn-generate-bibs"
            title="Requires registration to be closed and all colleges verified"
          >
            {loadingBibs ? (
              'Assigning Bibs...'
            ) : (
              <>
                <span>⚡</span>
                <span>Generate Bib Numbers</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Operational Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-label">Registration</span>
            <span className="metric-icon">{stats.registrationOpen ? '🟢' : '🔴'}</span>
          </div>
          <div className="metric-value" style={{ color: stats.registrationOpen ? '#059669' : '#dc2626' }}>
            {stats.registrationOpen ? 'OPEN' : 'CLOSED'}
          </div>
          <div className="metric-subtext">
            {stats.registrationOpen ? 'Colleges actively registering' : 'Rosters locked for meet preparation'}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-label">Athletes Registered</span>
            <span className="metric-icon">🏃</span>
          </div>
          <div className="metric-value">{stats.totalAthletes}</div>
          <div className="metric-subtext">Across {stats.totalColleges} institutions</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-label">College Squads</span>
            <span className="metric-icon">🏫</span>
          </div>
          <div className="metric-value">{stats.totalSquads}</div>
          <div className="metric-subtext">Men & Women contingents</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-label">Payment Verification</span>
            <span className="metric-icon">💳</span>
          </div>
          <div className="metric-value" style={{ color: stats.pendingSquadsCount > 0 ? '#d97706' : '#059669' }}>
            {stats.verifiedSquadsCount} / {stats.totalSquads}
          </div>
          <div className="metric-subtext">
            {stats.pendingSquadsCount} Pending • {stats.rejectedSquadsCount} Rejected
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-label">Bib Numbers Assigned</span>
            <span className="metric-icon">🪪</span>
          </div>
          <div className="metric-value" style={{ color: '#2563eb' }}>
            {stats.totalBibsGenerated}
          </div>
          <div className="metric-subtext">Boys: #100+ • Girls: #2001+</div>
        </div>
      </div>

      {/* Administrative Operations Modules */}
      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>
          Meet Management Modules
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {/* Card: Athletes Management */}
          <Link href="/admin/athletes" style={{ textDecoration: 'none' }}>
            <div className="metric-card" style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🏃</span>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>Athletes Management</h4>
              </div>
              <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
                View complete athlete rosters, apply multi-criteria filters, and export to Excel (.xlsx) format.
              </p>
              <div style={{ marginTop: '1rem', color: '#2563eb', fontWeight: 600, fontSize: '0.85rem' }}>
                Open Athletes Manager →
              </div>
            </div>
          </Link>

          {/* Card: Payment Verification */}
          <Link href="/admin/payments" style={{ textDecoration: 'none' }}>
            <div className="metric-card" style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>💳</span>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>Payment Verification</h4>
              </div>
              <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
                Verify college payment proofs, inspect transaction UTRs, calculate expected fees, and approve/reject squad entries.
              </p>
              <div style={{ marginTop: '1rem', color: '#2563eb', fontWeight: 600, fontSize: '0.85rem' }}>
                Review Payments ({stats.pendingSquadsCount} Pending) →
              </div>
            </div>
          </Link>

          {/* Card: Printable ID Cards */}
          <Link href="/admin/id-cards" style={{ textDecoration: 'none' }}>
            <div className="metric-card" style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🪪</span>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>Printable ID Cards</h4>
              </div>
              <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
                Generate official printable accreditation badges with athlete photos, serialized bib numbers, event disciplines, and QR codes.
              </p>
              <div style={{ marginTop: '1rem', color: '#2563eb', fontWeight: 600, fontSize: '0.85rem' }}>
                Open ID Card Studio →
              </div>
            </div>
          </Link>

          {/* Card: Track Heats & Seeding */}
          <Link href="/admin/heats" style={{ textDecoration: 'none' }}>
            <div className="metric-card" style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>⏱️</span>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>Track Heats & Lane Seeding</h4>
              </div>
              <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
                Auto-seed verified athletes into preliminary heats and standard preferred lanes (Lanes 1 to 8).
              </p>
              <div style={{ marginTop: '1rem', color: '#2563eb', fontWeight: 600, fontSize: '0.85rem' }}>
                Manage Track Heats →
              </div>
            </div>
          </Link>

          {/* Card: Delegations Master Sign-off */}
          <Link href="/admin/delegations" style={{ textDecoration: 'none' }}>
            <div className="metric-card" style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>📋</span>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>Delegations Master Sign-off</h4>
              </div>
              <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
                Printable college-by-college arrival sign-in sheets for Physical Education Directors at the accreditation desk.
              </p>
              <div style={{ marginTop: '1rem', color: '#2563eb', fontWeight: 600, fontSize: '0.85rem' }}>
                View Delegation Rosters →
              </div>
            </div>
          </Link>

          {/* Card: Audit Trail */}
          <Link href="/admin/audit" style={{ textDecoration: 'none' }}>
            <div className="metric-card" style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>📜</span>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>Administrative Audit Log</h4>
              </div>
              <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
                Immutable audit trail of registration status toggles, payment approvals, and bib allocations.
              </p>
              <div style={{ marginTop: '1rem', color: '#2563eb', fontWeight: 600, fontSize: '0.85rem' }}>
                Inspect Audit Logs →
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Modal / Dialog */}
      {modalState.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>{modalState.type === 'success' ? '✅' : '⚠️'}</span>
                <span>{modalState.title}</span>
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setModalState({ ...modalState, isOpen: false })}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5 }}>
                {modalState.message}
              </p>

              {/* If there are unverified squads listed */}
              {modalState.items && modalState.items.length > 0 && (
                <div style={{ marginTop: '1rem', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.5rem' }}>
                    Pending College Squads:
                  </div>
                  <ul style={{ fontSize: '0.775rem', color: '#b91c1c', paddingLeft: '1.25rem', maxHeight: '180px', overflowY: 'auto' }}>
                    {modalState.items.map((sq, i) => (
                      <li key={i} style={{ marginBottom: '0.25rem' }}>{sq}</li>
                    ))}
                  </ul>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#7f1d1d' }}>
                    👉 Navigate to <strong>Payment Verification</strong> to review and Approve or Reject these squads first.
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {modalState.items && modalState.items.length > 0 && (
                <Link
                  href="/admin/payments"
                  className="btn-admin btn-admin-primary"
                  onClick={() => setModalState({ ...modalState, isOpen: false })}
                >
                  Go to Payment Verification →
                </Link>
              )}
              <button
                type="button"
                className="btn-admin btn-admin-secondary"
                onClick={() => setModalState({ ...modalState, isOpen: false })}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
