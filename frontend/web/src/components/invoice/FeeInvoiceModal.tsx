'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { creditedAmount } from '@/lib/payment-status';
import { FeeBreakdown, PaymentRecord } from '@/app/actions/payment';
import { OFFICIAL_CHAMPIONSHIP_EVENTS, DB_CODE_TO_OFFICIAL_MAP } from '@/lib/championship-events';

export interface InvoiceAthlete {
  id: string;
  sslc_name: string;
  usn: string;
  registrations: {
    id: string;
    kind: string;
    events?: { code?: string; name?: string } | null;
  }[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  breakdown: FeeBreakdown;
  payments: PaymentRecord[];
  squadCode: string;
  athletes?: InvoiceAthlete[];
}

/** Official event code number (1–25) for a DB event code like '100M-M'. */
function officialCode(dbCode?: string): number | null {
  if (!dbCode) return null;
  return DB_CODE_TO_OFFICIAL_MAP[dbCode.toUpperCase()]?.codeNum ?? null;
}

function codesFor(athlete: InvoiceAthlete, kinds: string[]): string {
  const codes = athlete.registrations
    .filter((r) => kinds.includes(r.kind))
    .map((r) => officialCode(r.events?.code) ?? r.events?.code ?? '?')
    .sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))));
  return codes.length ? codes.join(', ') : '';
}

const SECTION_LABEL: Record<string, string> = {
  'Men & Women': 'M / W',
  Men: 'M',
  Women: 'W',
  'Mix Relay': 'Mixed',
};

export default function FeeInvoiceModal({ isOpen, onClose, breakdown, payments, squadCode, athletes = [] }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const invoiceNumber = `INV-VTU2026-${squadCode.toUpperCase()}`;
  const issueDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const genderLetter = breakdown.gender === 'women' ? 'F' : breakdown.gender === 'men' ? 'M' : '—';
  const divisionLabel = breakdown.gender === 'women' ? 'Women' : breakdown.gender === 'men' ? 'Men' : 'Squad';
  const listedPayments = payments.filter((p) => p.status !== 'REJECTED');
  const isFullySettled = breakdown.balanceDue === 0 && breakdown.totalPaid > 0 && breakdown.squadPaymentStatus === 'VERIFIED';

  // Always print at least 12 roster lines so the sheet reads like the official form
  const minRows = Math.max(0, 12 - athletes.length);

  return createPortal(
    <div className="kit-invoice-overlay">
      {/* Action bar (hidden when printing) */}
      <div className="kit-action-bar no-print">
        <span className="kit-action-title">📄 Registration Form &amp; Fee Invoice — {squadCode}</span>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => window.print()} className="kit-btn-print" id="btn-print-invoice-pdf">
            🖨️ Download / Save as PDF
          </button>
          <button type="button" onClick={onClose} className="kit-btn-close">
            ✕ Close
          </button>
        </div>
      </div>

      <div className="kit-sheet-container">
        <div className="kit-paper" id="printable-fee-invoice">
          {/* 1. Host letterhead */}
          <div className="kit-letterhead">
            <img src="/logo.jpeg" alt="Dr. ACSCE logo" className="kit-logo" />
            <div className="kit-letterhead-text">
              <div className="kit-host-sub">Visvesvaraya Technological University, Belagavi</div>
              <div className="kit-host-name">Dr. ACS COLLEGE OF ENGINEERING</div>
              <div className="kit-host-sub">Kambipura, Mysore Road, Bengaluru – 560074, Karnataka</div>
              <div className="kit-meet-line">
                28th VTU State Level Inter-Collegiate Athletic Meet 2026 &bull; Dr. ACS AURA 2026 &bull; 7th – 10th December 2026
              </div>
              <div className="kit-form-title">Registration Form</div>
            </div>
            {/* Spacer the width of the logo keeps the letterhead text centred (ACSCE logo only) */}
            <div className="kit-logo-spacer" aria-hidden="true" />
          </div>

          {/* 2. College & PED row */}
          <table className="kit-info-table">
            <tbody>
              <tr>
                <th>Name of the College &amp; Address</th>
                <td>
                  <strong>{breakdown.collegeName || 'Participating College'}</strong>
                  {breakdown.district ? `, ${breakdown.district}` : ''}
                  <div className="kit-info-sub">
                    College Code: <strong>{breakdown.collegeCode || squadCode.split('-')[0]}</strong> &bull; Squad: <strong>{squadCode}</strong> ({divisionLabel})
                  </div>
                </td>
                <th>Name of the PED / Manager with Contact No.</th>
                <td>
                  <strong>{breakdown.pedName || '—'}</strong>
                  <div className="kit-info-sub">{breakdown.pedPhone || ''}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 3. Athletes (left) + list of events with code (right) */}
          <div className="kit-body">
            <div className="kit-roster-wrap">
              <table className="kit-roster">
                <thead>
                  <tr>
                    <th rowSpan={2} style={{ width: '34px' }}>Sl.</th>
                    <th rowSpan={2}>Name of the Athlete</th>
                    <th rowSpan={2} style={{ width: '112px' }}>University Seat No.</th>
                    <th rowSpan={2} style={{ width: '52px' }}>Gender</th>
                    <th colSpan={2}>Event code participating</th>
                    <th rowSpan={2} style={{ width: '70px' }}>Reserve Event code</th>
                  </tr>
                  <tr>
                    <th style={{ width: '70px' }}>Event</th>
                    <th style={{ width: '60px' }}>Relay</th>
                  </tr>
                </thead>
                <tbody>
                  {athletes.map((a, idx) => (
                    <tr key={a.id}>
                      <td className="c">{idx + 1}</td>
                      <td className="name">{a.sslc_name}</td>
                      <td className="mono">{a.usn}</td>
                      <td className="c">{genderLetter}</td>
                      <td className="c b">{codesFor(a, ['regular', 'half_marathon'])}</td>
                      <td className="c b">{codesFor(a, ['relay'])}</td>
                      <td className="c">{codesFor(a, ['reserve'])}</td>
                    </tr>
                  ))}
                  {Array.from({ length: minRows }).map((_, i) => (
                    <tr key={`blank-${i}`} className="blank">
                      <td className="c">{athletes.length + i + 1}</td>
                      <td />
                      <td />
                      <td />
                      <td />
                      <td />
                      <td />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="kit-events-wrap">
              <table className="kit-events">
                <thead>
                  <tr>
                    <th colSpan={3}>List of events with code</th>
                  </tr>
                  <tr>
                    <th style={{ width: '38px' }}>Code</th>
                    <th>Event</th>
                    <th style={{ width: '48px' }}>Section</th>
                  </tr>
                </thead>
                <tbody>
                  {OFFICIAL_CHAMPIONSHIP_EVENTS.map((ev) => (
                    <tr key={ev.code}>
                      <td className="c b">{ev.code}</td>
                      <td>{ev.name}</td>
                      <td className="c">{SECTION_LABEL[ev.sections] || ev.sections}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Fees payment detail */}
          <table className="kit-fees">
            <tbody>
              <tr>
                <th rowSpan={Math.max(1, listedPayments.length) + 1} className="kit-fees-head">
                  Fees Payment
                  <br />
                  Detail
                </th>
                <th>DD / Cheque No. / Transaction ID</th>
                <th>Date</th>
                <th>Name of the Bank</th>
                <th>Status</th>
                <th>Amount Rs.</th>
              </tr>
              {listedPayments.length === 0 ? (
                <tr>
                  <td>&nbsp;</td>
                  <td />
                  <td />
                  <td className="c">Not yet paid</td>
                  <td />
                </tr>
              ) : (
                listedPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="mono b">{p.utr_number}</td>
                    <td className="c">
                      {new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="c">UPI / Bank Transfer</td>
                    <td className="c">{p.status === 'VERIFIED' ? 'Verified' : 'Awaiting verification'}</td>
                    <td className="r b">
                      {(p.status === 'VERIFIED' ? creditedAmount(p) : p.amount_submitted).toLocaleString('en-IN')}/-
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="kit-fee-summary">
            <span>
              Individual events {breakdown.regularEventsCount} × ₹{breakdown.regularFeeRate || 100}
            </span>
            <span>Half Marathon {breakdown.hmCount} × ₹{breakdown.hmFeeRate || 100}</span>
            <span>
              Relay teams {breakdown.relayTeamsCount} × ₹{breakdown.relayFeeRate || 400}
            </span>
            <span>Reserve events {breakdown.reserveEventsCount} (free)</span>
            <span className="kit-total">Total fee: ₹{breakdown.totalAmount.toLocaleString('en-IN')}/-</span>
            <span>Paid (verified): ₹{breakdown.totalPaid.toLocaleString('en-IN')}/-</span>
            <span className={breakdown.balanceDue > 0 ? 'kit-due' : 'kit-clear'}>
              Balance due: ₹{breakdown.balanceDue.toLocaleString('en-IN')}/-
            </span>
          </div>

          {/* 5. Signatures */}
          <div className="kit-signatures">
            <div className="kit-sig">
              <div className="kit-sig-space" />
              <div className="kit-sig-title">Physical Education Director</div>
              <div className="kit-sig-sub">{breakdown.pedName || ''}</div>
              <div className="kit-sig-sub">{breakdown.collegeName || ''}</div>
            </div>
            <div className="kit-sig kit-sig-mid">
              <div className="kit-ref">Ref: {invoiceNumber}</div>
              <div className="kit-ref">Date: {issueDate}</div>
              {isFullySettled && <div className="kit-stamp">FEES PAID</div>}
            </div>
            <div className="kit-sig">
              <div className="kit-sig-space" />
              <div className="kit-sig-title">Principal</div>
              <div className="kit-sig-sub">(Signature &amp; Seal)</div>
              <div className="kit-sig-sub">{breakdown.collegeName || ''}</div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .kit-invoice-overlay {
          position: fixed;
          inset: 0;
          z-index: 100000;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1.25rem 16px;
          background: rgba(15, 23, 42, 0.88);
        }
        .kit-action-bar {
          width: 100%;
          max-width: 1120px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-bottom: 1rem;
          padding: 0.75rem 1rem;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 8px;
        }
        .kit-action-title {
          color: #fff;
          font-weight: 800;
          font-size: 1rem;
        }
        .kit-btn-print {
          background: #2563eb;
          color: #fff;
          border: none;
          padding: 0.6rem 1.15rem;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
        }
        .kit-btn-print:hover {
          background: #1d4ed8;
        }
        .kit-btn-close {
          background: rgba(255, 255, 255, 0.1);
          color: #e2e8f0;
          border: 1px solid #475569;
          padding: 0.6rem 1rem;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
        }
        .kit-sheet-container {
          width: 100%;
          max-width: 1120px;
          margin-bottom: 3rem;
        }
        .kit-paper {
          background: #fff;
          color: #000;
          padding: 1.5rem 1.75rem;
          border-radius: 6px;
          font-family: 'Times New Roman', Times, serif;
          overflow-x: auto;
        }

        /* Letterhead */
        .kit-letterhead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          border-bottom: 2px solid #000;
          padding-bottom: 0.5rem;
          margin-bottom: 0.6rem;
        }
        .kit-logo {
          height: 64px;
          width: auto;
          object-fit: contain;
        }
        .kit-logo-spacer {
          width: 64px;
          flex-shrink: 0;
        }
        .kit-letterhead-text {
          text-align: center;
          flex: 1;
        }
        .kit-host-name {
          font-size: 1.35rem;
          font-weight: 900;
          letter-spacing: 0.02em;
        }
        .kit-host-sub {
          font-size: 0.75rem;
        }
        .kit-meet-line {
          font-size: 0.8rem;
          font-weight: 700;
          margin-top: 0.15rem;
        }
        .kit-form-title {
          display: inline-block;
          margin-top: 0.25rem;
          font-size: 1rem;
          font-weight: 800;
          text-decoration: underline;
        }

        /* Shared table look */
        table {
          border-collapse: collapse;
          width: 100%;
        }
        th,
        td {
          border: 1px solid #000;
          padding: 0.25rem 0.4rem;
          font-size: 0.78rem;
          vertical-align: middle;
        }
        th {
          font-weight: 700;
          text-align: center;
          background: #f3f4f6;
        }
        .c {
          text-align: center;
        }
        .r {
          text-align: right;
        }
        .b {
          font-weight: 700;
        }
        .mono {
          font-family: 'Courier New', monospace;
          font-size: 0.76rem;
        }
        .name {
          text-transform: uppercase;
        }

        .kit-info-table th {
          width: 17%;
          text-align: left;
        }
        .kit-info-table td {
          width: 33%;
        }
        .kit-info-sub {
          font-size: 0.72rem;
          margin-top: 0.1rem;
        }

        /* Body: roster left, events right */
        .kit-body {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 250px;
          gap: 0.6rem;
          margin-top: 0.6rem;
          align-items: start;
        }
        .kit-roster-wrap {
          overflow-x: auto;
        }
        .kit-roster {
          min-width: 560px;
        }
        .kit-roster tbody tr {
          height: 24px;
        }
        .kit-events th,
        .kit-events td {
          font-size: 0.7rem;
          padding: 0.15rem 0.3rem;
        }

        /* Fees */
        .kit-fees {
          margin-top: 0.6rem;
        }
        .kit-fees-head {
          width: 90px;
        }
        .kit-fee-summary {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem 1.1rem;
          margin-top: 0.4rem;
          font-size: 0.75rem;
        }
        .kit-total {
          font-weight: 800;
        }
        .kit-due {
          font-weight: 800;
          color: #b91c1c;
        }
        .kit-clear {
          font-weight: 800;
          color: #15803d;
        }

        /* Signatures */
        .kit-signatures {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1rem;
          margin-top: 1rem;
          align-items: end;
        }
        .kit-sig {
          text-align: center;
        }
        .kit-sig-space {
          height: 42px;
          border-bottom: 1px solid #000;
          margin: 0 1.5rem 0.3rem;
        }
        .kit-sig-title {
          font-weight: 800;
          font-size: 0.8rem;
          text-transform: uppercase;
        }
        .kit-sig-sub {
          font-size: 0.72rem;
        }
        .kit-sig-mid {
          align-self: center;
        }
        .kit-ref {
          font-size: 0.72rem;
        }
        .kit-stamp {
          display: inline-block;
          margin-top: 0.3rem;
          padding: 0.15rem 0.6rem;
          border: 2px solid #15803d;
          color: #15803d;
          font-weight: 900;
          letter-spacing: 0.08em;
          transform: rotate(-4deg);
        }

        @media (max-width: 900px) {
          .kit-body {
            grid-template-columns: 1fr;
          }
          .kit-paper {
            padding: 1rem;
          }
          .kit-info-table th,
          .kit-info-table td {
            display: block;
            width: auto;
          }
          .kit-signatures {
            grid-template-columns: 1fr;
          }
        }

        @media print {
          .no-print {
            display: none !important;
          }
          .kit-invoice-overlay {
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .kit-sheet-container {
            max-width: 100% !important;
            margin: 0 !important;
          }
          .kit-paper {
            padding: 0 !important;
            border-radius: 0 !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .kit-body {
            grid-template-columns: minmax(0, 1fr) 230px !important;
          }
          .kit-roster {
            min-width: 0 !important;
          }
        }
      `}</style>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          body > *:not(.kit-invoice-overlay) {
            display: none !important;
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
