'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FeeBreakdown, PaymentRecord } from '@/app/actions/payment';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  breakdown: FeeBreakdown;
  payments: PaymentRecord[];
  squadCode: string;
}

export default function FeeInvoiceModal({
  isOpen,
  onClose,
  breakdown,
  payments,
  squadCode,
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

  const invoiceNumber = `INV-VTU2026-${squadCode.toUpperCase()}`;
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const isFullySettled = breakdown.balanceDue === 0 && breakdown.totalPaid > 0 && breakdown.squadPaymentStatus === 'VERIFIED';

  function handlePrint() {
    window.print();
  }

  return createPortal(
    <div className="invoice-modal-overlay">
      {/* Top Action Bar (hidden when printing) */}
      <div className="invoice-action-bar no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>📄</span>
          <span style={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem' }}>
            Official Contingent Entry Fee Invoice — {squadCode}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={handlePrint}
            className="invoice-btn-print"
            id="btn-print-invoice-pdf"
          >
            🖨️ Download / Save as PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="invoice-btn-close"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="invoice-sheet-container">
        <div className="invoice-paper" id="printable-fee-invoice">

          {/* 1. OFFICIAL HEADER WITH BOTH LOGOS */}
          <div className="invoice-header">
            {/* Top Left: VTU Logo */}
            <div className="invoice-logo-left">
              <img
                src="/vtu.png"
                alt="VTU Belagavi Logo"
                className="invoice-logo-img"
              />
              <div className="invoice-inst-text">
                <div className="invoice-inst-name">VISVESVARAYA TECHNOLOGICAL UNIVERSITY</div>
                <div className="invoice-inst-sub">Directorate of Physical Education &amp; Sports</div>
                <div className="invoice-inst-loc">Jnana Sangama, Belagavi – 590018, Karnataka</div>
              </div>
            </div>

            {/* Top Right: ACSCE Logo */}
            <div className="invoice-logo-right">
              <div className="invoice-inst-text text-right">
                <div className="invoice-inst-name">Dr. ACS COLLEGE OF ENGINEERING</div>
                <div className="invoice-inst-sub">Department of Physical Education &amp; Sports</div>
                <div className="invoice-inst-loc">Kambipura, Mysore Road, Bengaluru – 560074</div>
              </div>
              <img
                src="/acsce-logo.png"
                alt="Dr. ACSCE Logo"
                className="invoice-logo-img"
              />
            </div>
          </div>

          <div className="invoice-divider-thick" />

          {/* 2. MEET BANNER & INVOICE TITLE */}
          <div className="invoice-meet-banner">
            <div className="invoice-meet-tag">DR. ACS AURA – 2026</div>
            <h1 className="invoice-meet-title">
              28th VTU Inter-Collegiate State Level Athletic Meet 2026
            </h1>
            <div className="invoice-doc-type">
              OFFICIAL PARTICIPATION ENTRY FEE INVOICE &amp; RECEIPT
            </div>
          </div>

          {/* 3. METADATA & STATUS BAR */}
          <div className="invoice-meta-row">
            <div className="invoice-meta-block">
              <span className="meta-lbl">INVOICE NUMBER:</span>
              <span className="meta-val highlight">{invoiceNumber}</span>
            </div>
            <div className="invoice-meta-block">
              <span className="meta-lbl">DATE OF ISSUE:</span>
              <span className="meta-val">{currentDate}</span>
            </div>
            <div className="invoice-meta-block">
              <span className="meta-lbl">HOST MEET DATES:</span>
              <span className="meta-val">Dec 07 – 10, 2026</span>
            </div>
            <div className="invoice-meta-block">
              <span className="meta-lbl">PAYMENT STATUS:</span>
              <span className={`meta-status-pill ${isFullySettled ? 'status-settled' : 'status-pending'}`}>
                {isFullySettled ? '✓ FULLY SETTLED' : breakdown.totalPaid > 0 ? 'PARTIAL PAYMENT' : 'PAYMENT PENDING'}
              </span>
            </div>
          </div>

          {/* 4. INSTITUTION & DELEGATION INFO */}
          <div className="invoice-delegation-card">
            <div className="delegation-col">
              <div className="sec-lbl">PARTICIPATING INSTITUTION</div>
              <div className="college-title">
                {breakdown.collegeName || 'VTU Affiliated Institution'}
              </div>
              <div className="college-detail">
                <span>College Code: <strong>{breakdown.collegeCode || squadCode.split('-')[0]}</strong></span>
                {breakdown.district && <span> &bull; District: <strong>{breakdown.district}</strong></span>}
              </div>
              <div className="college-detail">
                Division / Squad: <strong>{breakdown.gender === 'men' ? "Men's Squad" : breakdown.gender === 'women' ? "Women's Squad" : 'College Delegation'} ({squadCode})</strong>
              </div>
            </div>

            <div className="delegation-col">
              <div className="sec-lbl">CONTINGENT IN-CHARGE (PED)</div>
              <div className="ped-name">{breakdown.pedName || 'Physical Education Director'}</div>
              <div className="ped-contact">
                {breakdown.pedPhone && <span>Phone: <strong>{breakdown.pedPhone}</strong></span>}
                {breakdown.pedEmail && <span> &bull; Email: <strong>{breakdown.pedEmail}</strong></span>}
              </div>
              <div className="ped-contact">
                Total Athletes Enrolled: <strong>{breakdown.athletesCount || 0} Students</strong>
              </div>
            </div>
          </div>

          {/* 5. ITEMIZED FEE SCHEDULE TABLE */}
          <div className="invoice-table-wrap">
            <div className="sec-lbl" style={{ marginBottom: '0.4rem' }}>FEE BREAKDOWN SCHEDULE</div>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th style={{ width: '45px' }}>#</th>
                  <th>Nomination / Discipline Category</th>
                  <th className="text-center" style={{ width: '100px' }}>Unit Rate</th>
                  <th className="text-center" style={{ width: '90px' }}>Qty</th>
                  <th className="text-right" style={{ width: '130px' }}>Amount (INR)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-center">1</td>
                  <td>
                    <strong>Individual Regular Events</strong>
                    <div className="table-sub">Track sprint, middle/long distance, hurdles &amp; field throws/jumps</div>
                  </td>
                  <td className="text-center">₹100</td>
                  <td className="text-center">{breakdown.regularEventsCount}</td>
                  <td className="text-right">₹{(breakdown.regularEventsCount * 100).toLocaleString('en-IN')}</td>
                </tr>

                <tr>
                  <td className="text-center">2</td>
                  <td>
                    <strong>Reserve Nominations</strong>
                    <div className="table-sub">Emergency substitution disciplines (strictly free of charge)</div>
                  </td>
                  <td className="text-center" style={{ color: '#16a34a', fontWeight: 700 }}>FREE</td>
                  <td className="text-center">{breakdown.reserveEventsCount}</td>
                  <td className="text-right" style={{ color: '#16a34a', fontWeight: 700 }}>₹0</td>
                </tr>

                <tr>
                  <td className="text-center">3</td>
                  <td>
                    <strong>Relay Squad Teams</strong>
                    <div className="table-sub">4x100m, 4x400m &amp; 4x400m Mixed Relay (Flat ₹400/team: 4 active runners + 2 reserves free)</div>
                  </td>
                  <td className="text-center">₹400 / Team</td>
                  <td className="text-center">{breakdown.relayTeamsCount} {breakdown.relayTeamsCount === 1 ? 'Team' : 'Teams'}</td>
                  <td className="text-right">₹{(breakdown.relayTeamsCount * 400).toLocaleString('en-IN')}</td>
                </tr>

                <tr>
                  <td className="text-center">4</td>
                  <td>
                    <strong>21 km Road Half Marathon</strong>
                    <div className="table-sub">Official championship endurance road discipline</div>
                  </td>
                  <td className="text-center">₹100</td>
                  <td className="text-center">{breakdown.hmCount}</td>
                  <td className="text-right">₹{(breakdown.hmCount * 100).toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="tfoot-subtotal">
                  <td colSpan={4} className="text-right"><strong>Gross Total Computed Fee:</strong></td>
                  <td className="text-right"><strong>₹{breakdown.totalAmount.toLocaleString('en-IN')}</strong></td>
                </tr>
                <tr className="tfoot-paid">
                  <td colSpan={4} className="text-right">Verified Settlement Received (Paid):</td>
                  <td className="text-right" style={{ color: '#16a34a', fontWeight: 700 }}>
                    - ₹{breakdown.totalPaid.toLocaleString('en-IN')}
                  </td>
                </tr>
                <tr className="tfoot-balance">
                  <td colSpan={4} className="text-right">
                    <strong>Net Remaining Balance Due:</strong>
                  </td>
                  <td className="text-right" style={{ color: breakdown.balanceDue > 0 ? '#dc2626' : '#16a34a', fontSize: '1.1rem', fontWeight: 800 }}>
                    ₹{breakdown.balanceDue.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 6. PAYMENT TRANSACTIONS LOG */}
          {payments.length > 0 && (
            <div className="invoice-payments-section">
              <div className="sec-lbl" style={{ marginBottom: '0.4rem' }}>TRANSACTION SETTLEMENT LEDGER</div>
              <table className="payments-log-table">
                <thead>
                  <tr>
                    <th>Date &amp; Time</th>
                    <th>Bank Reference / UTR Number</th>
                    <th className="text-center">Status</th>
                    <th className="text-right">Amount Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>{new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{p.utr_number}</td>
                      <td className="text-center">
                        <span className={`status-badge-sm ${p.status === 'VERIFIED' ? 'badge-ver' : p.status === 'REJECTED' ? 'badge-rej' : 'badge-sub'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="text-right" style={{ fontWeight: 700 }}>
                        ₹{p.amount_submitted.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 7. SIGNATURES & OFFICIAL SEALS */}
          <div className="invoice-signatures">
            <div className="sig-block">
              <div className="sig-line" />
              <div className="sig-title">Physical Education Director</div>
              <div className="sig-sub">{breakdown.collegeName || 'Participating College'}</div>
            </div>

            <div className="sig-block">
              <div className="sig-seal-box">
                <span className="seal-text">VTU DPE&amp;S<br />OFFICIAL SEAL</span>
              </div>
              <div className="sig-title">Finance Scrutiny Desk</div>
              <div className="sig-sub">Dr. ACS AURA – 2026</div>
            </div>

            <div className="sig-block">
              <div className="sig-line" />
              <div className="sig-title">Organising Chairman / Principal</div>
              <div className="sig-sub">Dr. ACS College of Engineering</div>
            </div>
          </div>

          {/* 8. FOOTER NOTE */}
          <div className="invoice-footer-note">
            This is an official computer-generated fee invoice &amp; participation voucher issued under the authority of Visvesvaraya Technological University (VTU) and Dr. ACS College of Engineering, Bengaluru. Any subsequent student additions will accrue differential dues to be settled prior to bib clearance.
          </div>

        </div>
      </div>

      <style jsx>{`
        .invoice-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 100000;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1.5rem;
        }

        .invoice-action-bar {
          width: 100%;
          max-width: 820px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding: 0.75rem 1rem;
          background: #1e293b;
          border-radius: 8px;
          border: 1px solid #334155;
        }

        .invoice-btn-print {
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

        .invoice-btn-print:hover {
          background: #1d4ed8;
        }

        .invoice-btn-close {
          background: rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          border: 1px solid #475569;
          padding: 0.6rem 1rem;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
        }

        .invoice-btn-close:hover {
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
        }

        .invoice-sheet-container {
          width: 100%;
          max-width: 820px;
          margin-bottom: 3rem;
        }

        .invoice-paper {
          background: #ffffff;
          color: #0f172a;
          padding: 2.5rem 3rem;
          border-radius: 8px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
        }

        .invoice-logo-left, .invoice-logo-right {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .invoice-logo-img {
          height: 64px;
          width: auto;
          object-fit: contain;
        }

        .invoice-inst-name {
          font-size: 0.85rem;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.01em;
        }

        .invoice-inst-sub {
          font-size: 0.72rem;
          font-weight: 600;
          color: #475569;
          margin-top: 1px;
        }

        .invoice-inst-loc {
          font-size: 0.65rem;
          color: #64748b;
        }

        .text-right {
          text-align: right;
        }

        .invoice-divider-thick {
          height: 3px;
          background: linear-gradient(to right, #1e3a8a, #d97706, #1e3a8a);
          margin: 1.25rem 0 1rem;
        }

        .invoice-meet-banner {
          text-align: center;
          margin-bottom: 1.25rem;
        }

        .invoice-meet-tag {
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #b45309;
          text-transform: uppercase;
        }

        .invoice-meet-title {
          font-size: 1.35rem;
          font-weight: 900;
          color: #0f172a;
          margin: 0.2rem 0;
        }

        .invoice-doc-type {
          font-size: 0.85rem;
          font-weight: 800;
          color: #1e3a8a;
          letter-spacing: 0.05em;
        }

        .invoice-meta-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 0.75rem 1rem;
          margin-bottom: 1.25rem;
        }

        .invoice-meta-block {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .meta-lbl {
          font-size: 0.65rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
        }

        .meta-val {
          font-size: 0.85rem;
          font-weight: 700;
          color: #0f172a;
        }

        .meta-val.highlight {
          color: #1e3a8a;
          font-family: monospace;
          font-size: 0.9rem;
        }

        .meta-status-pill {
          display: inline-block;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-size: 0.72rem;
          font-weight: 800;
          text-align: center;
          width: fit-content;
        }

        .status-settled {
          background: #dcfce7;
          color: #15803d;
        }

        .status-pending {
          background: #fef3c7;
          color: #b45309;
        }

        .invoice-delegation-card {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 1.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 1rem 1.25rem;
          margin-bottom: 1.25rem;
          background: #ffffff;
        }

        .sec-lbl {
          font-size: 0.7rem;
          font-weight: 800;
          color: #1e3a8a;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 0.25rem;
        }

        .college-title {
          font-size: 1rem;
          font-weight: 800;
          color: #0f172a;
        }

        .college-detail, .ped-contact {
          font-size: 0.8rem;
          color: #475569;
          margin-top: 2px;
        }

        .ped-name {
          font-size: 0.95rem;
          font-weight: 800;
          color: #0f172a;
        }

        .invoice-table-wrap {
          margin-bottom: 1.25rem;
        }

        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }

        .invoice-table th {
          background: #0f172a;
          color: #ffffff;
          padding: 0.55rem 0.75rem;
          font-weight: 700;
          text-align: left;
          font-size: 0.75rem;
        }

        .invoice-table td {
          padding: 0.55rem 0.75rem;
          border-bottom: 1px solid #e2e8f0;
          color: #334155;
        }

        .table-sub {
          font-size: 0.72rem;
          color: #64748b;
          margin-top: 1px;
        }

        .tfoot-subtotal td, .tfoot-paid td, .tfoot-balance td {
          padding: 0.45rem 0.75rem;
          border-bottom: 1px solid #cbd5e1;
        }

        .tfoot-balance {
          background: #f8fafc;
        }

        .invoice-payments-section {
          margin-bottom: 1.5rem;
        }

        .payments-log-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8rem;
        }

        .payments-log-table th {
          background: #f1f5f9;
          color: #475569;
          padding: 0.4rem 0.6rem;
          font-weight: 700;
          text-align: left;
          font-size: 0.7rem;
        }

        .payments-log-table td {
          padding: 0.4rem 0.6rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .status-badge-sm {
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 700;
        }

        .badge-ver { background: #dcfce7; color: #16a34a; }
        .badge-sub { background: #fef3c7; color: #d97706; }
        .badge-rej { background: #fee2e2; color: #dc2626; }

        .invoice-signatures {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          margin-top: 2rem;
          padding-top: 1rem;
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
          margin-bottom: 0.5rem;
        }

        .sig-seal-box {
          width: 80px;
          height: 80px;
          border: 2px dashed #94a3b8;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.5rem;
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

        .invoice-footer-note {
          margin-top: 1.5rem;
          padding-top: 0.75rem;
          border-top: 1px solid #e2e8f0;
          font-size: 0.65rem;
          color: #64748b;
          line-height: 1.4;
          text-align: center;
        }

        /* PRINT STYLES */
        @media print {
          .no-print {
            display: none !important;
          }

          .invoice-modal-overlay {
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
            backdrop-filter: none !important;
          }

          .invoice-sheet-container {
            max-width: 100% !important;
            margin: 0 !important;
          }

          .invoice-paper {
            padding: 0.5cm 0.75cm !important;
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

