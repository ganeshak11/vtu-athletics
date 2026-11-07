'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface ReportAthlete {
  id: string;
  sslc_name: string;
  usn: string;
  semester: string | number;
  blood_group: string;
  aadhaar_number?: string;
  bid_number?: number | null;
  photo_url?: string | null;
  registrations: {
    id: string;
    kind: string;
    event_id: string;
    events?: {
      name?: string;
      code?: string;
      category?: string;
    };
  }[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  squad: {
    squadCode: string;
    collegeName: string;
    collegeCode?: string;
    district?: string;
    gender?: string;
    pedName?: string;
    pedPhone?: string;
    pedEmail?: string;
  };
  athletes: ReportAthlete[];
}

export default function RegistrationReportModal({
  isOpen,
  onClose,
  squad,
  athletes,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const reportDocNumber = `REG-VTU2026-${squad.squadCode.toUpperCase()}`;
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  function handlePrint() {
    window.print();
  }

  return createPortal(
    <div className="report-modal-overlay">
      {/* Action Bar (Hidden when printing) */}
      <div className="report-action-bar no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>📋</span>
          <span style={{ fontWeight: 800, color: '#fff', fontSize: '1.05rem' }}>
            Official Contingent Registration Report &amp; Eligibility Proforma — {squad.squadCode}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={handlePrint}
            className="report-btn-print"
            id="btn-print-reg-report-pdf"
          >
            🖨️ Download / Save as PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="report-btn-close"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="report-sheet-container">
        <div className="report-paper" id="printable-reg-report">

          {/* 1. OFFICIAL UNIVERSITY HEADER WITH BOTH LOGOS */}
          <div className="report-header">
            {/* Top Left: VTU Logo */}
            <div className="report-logo-left">
              <img
                src="/vtu.png"
                alt="VTU Belagavi Logo"
                className="report-logo-img"
              />
              <div className="report-inst-text">
                <div className="report-inst-name">VISVESVARAYA TECHNOLOGICAL UNIVERSITY</div>
                <div className="report-inst-sub">Directorate of Physical Education &amp; Sports</div>
                <div className="report-inst-loc">Jnana Sangama, Belagavi – 590018, Karnataka</div>
              </div>
            </div>

            {/* Top Right: ACSCE Logo */}
            <div className="report-logo-right">
              <div className="report-inst-text text-right">
                <div className="report-inst-name">Dr. ACS COLLEGE OF ENGINEERING</div>
                <div className="report-inst-sub">Department of Physical Education &amp; Sports</div>
                <div className="report-inst-loc">Kambipura, Mysore Road, Bengaluru – 560074</div>
              </div>
              <img
                src="/logo.jpeg"
                alt="Dr. ACSCE Logo"
                className="report-logo-img"
              />
            </div>
          </div>

          <div className="report-divider-thick" />

          {/* 2. MEET BANNER & REPORT TITLE */}
          <div className="report-meet-banner">
            <div className="report-meet-tag">Dr. ACS-AURA – 2026</div>
            <h1 className="report-meet-title">
              VTU&rsquo;s 28th Inter-Collegiate State Level Athletic Meet 2026
            </h1>
            <div className="report-doc-type">
              OFFICIAL CONTINGENT REGISTRATION REPORT &amp; ELIGIBILITY PROFORMA
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
              In accordance with AIU, IAAF, and VTU Athletic Competition Regulations (Dates: Dec 07 – 10, 2026)
            </div>
          </div>

          {/* 3. METADATA STRIP */}
          <div className="report-meta-row">
            <div className="report-meta-block">
              <span className="meta-lbl">REPORT REFERENCE:</span>
              <span className="meta-val highlight">{reportDocNumber}</span>
            </div>
            <div className="report-meta-block">
              <span className="meta-lbl">DATE OF ISSUE:</span>
              <span className="meta-val">{currentDate}</span>
            </div>
            <div className="report-meta-block">
              <span className="meta-lbl">TOTAL ATHLETES:</span>
              <span className="meta-val">{athletes.length} Students {athletes.length >= 8 ? '✓ (Min 8 Met)' : '⚠️ (< 8 Min)'}</span>
            </div>
            <div className="report-meta-block">
              <span className="meta-lbl">DIVISION:</span>
              <span className="meta-val" style={{ textTransform: 'uppercase' }}>
                {squad.gender === 'men' ? "Men's Squad" : squad.gender === 'women' ? "Women's Squad" : 'College Squad'}
              </span>
            </div>
          </div>

          {/* 4. INSTITUTION & DELEGATION INFO */}
          <div className="report-delegation-card">
            <div className="delegation-col">
              <div className="sec-lbl">PARTICIPATING INSTITUTION</div>
              <div className="college-title">
                {squad.collegeName || 'VTU Affiliated Institution'}
              </div>
              <div className="college-detail">
                <span>College Code: <strong>{squad.collegeCode || squad.squadCode.split('-')[0]}</strong></span>
                {squad.district && <span> &bull; District: <strong>{squad.district}</strong></span>}
                <span> &bull; Squad Code: <strong>{squad.squadCode}</strong></span>
              </div>
            </div>

            <div className="delegation-col">
              <div className="sec-lbl">PHYSICAL EDUCATION DIRECTOR (IN-CHARGE)</div>
              <div className="ped-name">{squad.pedName || 'Physical Education Director'}</div>
              <div className="ped-contact">
                {squad.pedPhone && <span>Phone: <strong>{squad.pedPhone}</strong></span>}
                {squad.pedEmail && <span> &bull; Email: <strong>{squad.pedEmail}</strong></span>}
              </div>
            </div>
          </div>

          {/* 5. ATHLETE ROSTER TABLE */}
          <div className="report-table-wrap">
            <div className="sec-lbl" style={{ marginBottom: '0.4rem' }}>
              NOMINATED STUDENT-ATHLETE PARTICIPATION LIST
            </div>

            <table className="report-table">
              <thead>
                <tr>
                  <th style={{ width: '32px' }} className="text-center">#</th>
                  <th style={{ width: '65px' }} className="text-center">Bib</th>
                  <th>Student Athlete Name (SSLC)</th>
                  <th style={{ width: '105px' }}>USN</th>
                  <th style={{ width: '45px' }} className="text-center">Sem</th>
                  <th style={{ width: '45px' }} className="text-center">Bld</th>
                  <th style={{ width: '105px' }}>Aadhaar</th>
                  <th>Registered Events (Max 2)</th>
                  <th style={{ width: '110px' }}>Reserve</th>
                  <th style={{ width: '130px' }}>Relays / Marathon</th>
                </tr>
              </thead>
              <tbody>
                {athletes.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                      No athletes currently registered in this delegation roster.
                    </td>
                  </tr>
                ) : (
                  athletes.map((athlete, idx) => {
                    const regularEvents = athlete.registrations.filter((r) => r.kind === 'regular');
                    const reserveReg = athlete.registrations.find((r) => r.kind === 'reserve');
                    const relayRegs = athlete.registrations.filter((r) => r.kind === 'relay');
                    const hmReg = athlete.registrations.find((r) => r.kind === 'half_marathon');

                    const maskedAadhaar = athlete.aadhaar_number
                      ? `•••• ${athlete.aadhaar_number.slice(-4)}`
                      : '—';

                    return (
                      <tr key={athlete.id}>
                        <td className="text-center" style={{ color: '#64748b' }}>{idx + 1}</td>
                        <td className="text-center font-bold" style={{ color: '#1e3a8a' }}>
                          {athlete.bid_number ? `#${athlete.bid_number}` : 'Pending'}
                        </td>
                        <td>
                          <strong>{athlete.sslc_name}</strong>
                        </td>
                        <td className="font-mono">{athlete.usn}</td>
                        <td className="text-center">{athlete.semester}</td>
                        <td className="text-center font-bold" style={{ fontSize: '0.75rem' }}>{athlete.blood_group}</td>
                        <td className="font-mono" style={{ fontSize: '0.75rem' }}>{maskedAadhaar}</td>
                        <td>
                          {regularEvents.length === 0 ? (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          ) : (
                            regularEvents.map((r) => (
                              <div key={r.id} style={{ lineHeight: 1.3 }}>
                                &bull; {r.events?.name || 'Regular Event'}
                              </div>
                            ))
                          )}
                        </td>
                        <td>
                          {reserveReg?.events?.name ? (
                            <span style={{ color: '#b45309', fontWeight: 600 }}>
                              {reserveReg.events.name}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>None</span>
                          )}
                        </td>
                        <td>
                          {relayRegs.map((r) => (
                            <div key={r.id} style={{ fontSize: '0.72rem', color: '#1d4ed8', fontWeight: 600 }}>
                              🎽 {r.events?.name || 'Relay'}
                            </div>
                          ))}
                          {hmReg && (
                            <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>
                              🏃 21km Marathon
                            </div>
                          )}
                          {relayRegs.length === 0 && !hmReg && (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 6. MANDATORY DOCUMENT CHECKLIST AS PER VTU RULE 40-48 */}
          <div className="report-rules-box">
            <div className="sec-lbl" style={{ marginBottom: '0.35rem' }}>
              MANDATORY SCRUTINY &amp; REPORTING CHECKLIST (VTU RULES 40–48)
            </div>
            <div className="rules-check-grid">
              <div className="rule-item">
                <span className="check-box">☑</span>
                <span><strong>Bonafide Regular Student:</strong> Enrolled in degree course with active VTU USN (Rule 10).</span>
              </div>
              <div className="rule-item">
                <span className="check-box">☑</span>
                <span><strong>Academic Proof:</strong> Attested copies of PUC / Degree certificates and valid College ID Card (Rule 44 &amp; 46).</span>
              </div>
              <div className="rule-item">
                <span className="check-box">☑</span>
                <span><strong>Aadhaar Card:</strong> Self-attested copy of 12-digit Aadhaar Card attached for each athlete (Rule 47).</span>
              </div>
              <div className="rule-item">
                <span className="check-box">☑</span>
                <span><strong>Half Marathon Fitness:</strong> Mandatory Medical Fitness Certificate attached for 21km road runners (Rule 48).</span>
              </div>
              <div className="rule-item">
                <span className="check-box">☑</span>
                <span><strong>Marchpast Assembly:</strong> College team uniform &amp; flag required for compulsory opening marchpast (Rule 60).</span>
              </div>
            </div>
          </div>

          {/* 7. INSTITUTIONAL CERTIFICATION & SIGNATURE SEALS */}
          <div className="report-cert-text">
            <strong>INSTITUTIONAL DECLARATION &amp; ELIGIBILITY CERTIFICATION:</strong><br />
            I hereby certify that the student athletes listed above are bonafide regular students studying in our institution, are eligible to represent our college in the VTU&rsquo;s 28th Inter-Collegiate State Level Athletic Meet 2026 as per AIU &amp; VTU sports regulations, and have been declared medically fit to participate in the athletic events nominated.
          </div>

          <div className="report-signatures">
            <div className="sig-block">
              <div className="sig-line" />
              <div className="sig-title">Physical Education Director</div>
              <div className="sig-sub">{squad.pedName || 'Contingent In-Charge'}</div>
              <div className="sig-date">Date: __________________</div>
            </div>

            <div className="sig-block">
              <div className="sig-seal-box">
                <span className="seal-text">OFFICIAL<br />COLLEGE SEAL</span>
              </div>
              <div className="sig-title">Principal / Head of Institution</div>
              <div className="sig-sub">{squad.collegeName || 'Affiliated College'}</div>
            </div>

            <div className="sig-block">
              <div className="sig-line" />
              <div className="sig-title">Call Room Scrutiny Desk</div>
              <div className="sig-sub">Dr. ACSCE Meet Directorate</div>
              <div className="sig-date">Verified &amp; Cleared</div>
            </div>
          </div>

          {/* 8. FOOTER NOTE */}
          <div className="report-footer-note">
            Note: This official registration report, along with entry fee receipt and eligibility proforma with attested documents, must be submitted at the Registration Counter on 07 December 2026 during reporting at the Dr. ACS College of Engineering sports pavilion.
          </div>

        </div>
      </div>

      <style jsx>{`
        .report-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.88);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 100000;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1.5rem;
        }

        .report-action-bar {
          width: 100%;
          max-width: 960px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding: 0.75rem 1rem;
          background: #1e293b;
          border-radius: 8px;
          border: 1px solid #334155;
        }

        .report-btn-print {
          background: #2563eb;
          color: #fff;
          border: none;
          padding: 0.6rem 1.25rem;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .report-btn-print:hover {
          background: #1d4ed8;
        }

        .report-btn-close {
          background: rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          border: 1px solid #475569;
          padding: 0.6rem 1rem;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
        }

        .report-btn-close:hover {
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
        }

        .report-sheet-container {
          width: 100%;
          max-width: 960px;
          margin-bottom: 3rem;
        }

        .report-paper {
          background: #ffffff;
          color: #0f172a;
          padding: 2rem 2.5rem;
          border-radius: 8px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
        }

        .report-logo-left, .report-logo-right {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .report-logo-img {
          height: 60px;
          width: auto;
          object-fit: contain;
        }

        .report-inst-name {
          font-size: 0.825rem;
          font-weight: 900;
          color: #0f172a;
        }

        .report-inst-sub {
          font-size: 0.7rem;
          font-weight: 600;
          color: #475569;
          margin-top: 1px;
        }

        .report-inst-loc {
          font-size: 0.625rem;
          color: #64748b;
        }

        .text-right {
          text-align: right;
        }

        .report-divider-thick {
          height: 3px;
          background: linear-gradient(to right, #1e3a8a, #d97706, #1e3a8a);
          margin: 1rem 0 0.85rem;
        }

        .report-meet-banner {
          text-align: center;
          margin-bottom: 1rem;
        }

        .report-meet-tag {
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #b45309;
          text-transform: uppercase;
        }

        .report-meet-title {
          font-size: 1.3rem;
          font-weight: 900;
          color: #0f172a;
          margin: 0.15rem 0;
        }

        .report-doc-type {
          font-size: 0.85rem;
          font-weight: 800;
          color: #1e3a8a;
          letter-spacing: 0.04em;
        }

        .report-meta-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 0.65rem 0.85rem;
          margin-bottom: 1rem;
        }

        .report-meta-block {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .meta-lbl {
          font-size: 0.625rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
        }

        .meta-val {
          font-size: 0.8rem;
          font-weight: 700;
          color: #0f172a;
        }

        .meta-val.highlight {
          color: #1e3a8a;
          font-family: monospace;
          font-size: 0.85rem;
        }

        .report-delegation-card {
          display: grid;
          grid-template-columns: 3fr 2fr;
          gap: 1.25rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 0.75rem 1rem;
          margin-bottom: 1rem;
          background: #ffffff;
        }

        .sec-lbl {
          font-size: 0.65rem;
          font-weight: 800;
          color: #64748b;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 0.25rem;
        }

        .college-title {
          font-size: 1rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.3;
        }

        .college-detail {
          font-size: 0.75rem;
          color: #475569;
          margin-top: 0.2rem;
        }

        .ped-name {
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
        }

        .ped-contact {
          font-size: 0.75rem;
          color: #475569;
          margin-top: 0.2rem;
        }

        .report-table-wrap {
          margin-bottom: 1rem;
        }

        .report-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.75rem;
        }

        .report-table th {
          background: #0f172a;
          color: #ffffff;
          padding: 0.5rem 0.5rem;
          font-weight: 700;
          text-align: left;
          font-size: 0.7rem;
          border: 1px solid #334155;
        }

        .report-table td {
          padding: 0.45rem 0.5rem;
          border: 1px solid #e2e8f0;
          vertical-align: middle;
        }

        .report-table tbody tr:nth-child(even) {
          background: #f8fafc;
        }

        .text-center { text-align: center; }
        .font-mono { font-family: monospace; font-size: 0.75rem; }
        .font-bold { font-weight: 700; }

        .report-rules-box {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 0.75rem 1rem;
          margin-bottom: 1rem;
        }

        .rules-check-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.4rem 1rem;
          font-size: 0.7rem;
          color: #334155;
        }

        .rule-item {
          display: flex;
          align-items: flex-start;
          gap: 0.4rem;
        }

        .check-box {
          color: #16a34a;
          font-weight: 800;
          font-size: 0.8rem;
        }

        .report-cert-text {
          font-size: 0.72rem;
          color: #334155;
          line-height: 1.5;
          padding: 0.65rem 0.85rem;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 6px;
          margin-bottom: 1.5rem;
        }

        .report-signatures {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          margin-top: 1rem;
          text-align: center;
        }

        .sig-block {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .sig-line {
          width: 150px;
          height: 1px;
          background: #94a3b8;
          margin-bottom: 0.4rem;
        }

        .sig-seal-box {
          width: 75px;
          height: 75px;
          border: 2px dashed #94a3b8;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.4rem;
        }

        .seal-text {
          font-size: 0.55rem;
          font-weight: 800;
          color: #64748b;
          text-align: center;
        }

        .sig-title {
          font-size: 0.75rem;
          font-weight: 800;
          color: #0f172a;
        }

        .sig-sub {
          font-size: 0.68rem;
          color: #64748b;
        }

        .sig-date {
          font-size: 0.65rem;
          color: #64748b;
          margin-top: 0.2rem;
        }

        .report-footer-note {
          margin-top: 1.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid #e2e8f0;
          font-size: 0.65rem;
          color: #64748b;
          text-align: center;
          line-height: 1.4;
        }

        /* PRINT STYLES */
        @media print {
          .no-print {
            display: none !important;
          }

          .report-modal-overlay {
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
            backdrop-filter: none !important;
          }

          .report-sheet-container {
            max-width: 100% !important;
            margin: 0 !important;
          }

          .report-paper {
            padding: 0.4cm 0.6cm !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
