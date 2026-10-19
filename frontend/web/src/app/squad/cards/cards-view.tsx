'use client';

import React, { useState } from 'react';
import QRCode from 'react-qr-code';

interface AthleteCardProps {
  athletes: any[];
  collegeName: string;
  squadCode: string;
  gender: string;
  pedName: string;
}

export function CardsPrintView({
  athletes,
  collegeName,
  squadCode,
  gender,
  pedName,
}: AthleteCardProps) {
  const [search, setSearch] = useState('');
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);

  const filteredAthletes = athletes.filter((a) => {
    const q = search.toLowerCase();
    const matchesSearch =
      a.sslc_name.toLowerCase().includes(q) ||
      a.usn.toLowerCase().includes(q) ||
      (a.bid_number && a.bid_number.toString().includes(q));
    const matchesSelected = selectedAthleteId ? a.id === selectedAthleteId : true;
    return matchesSearch && matchesSelected;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Control Bar (Hidden during print) */}
      <div
        className="glass-panel no-print"
        style={{
          padding: '1.25rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '260px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search by name, USN, or Bid #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: '340px' }}
          />

          <select
            className="input-field"
            value={selectedAthleteId || ''}
            onChange={(e) => setSelectedAthleteId(e.target.value || null)}
            style={{ maxWidth: '260px' }}
          >
            <option value="">All Athletes ({athletes.length})</option>
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>
                #{a.bid_number || 'No Bid'} — {a.sslc_name} ({a.usn})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {selectedAthleteId && (
            <button
              onClick={() => setSelectedAthleteId(null)}
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem' }}
            >
              Show All
            </button>
          )}
          <button
            onClick={handlePrint}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span>🖨️</span> Print Cards ({filteredAthletes.length})
          </button>
        </div>
      </div>

      {filteredAthletes.length === 0 ? (
        <div className="glass-panel text-center" style={{ padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No athletes found matching your search.</p>
        </div>
      ) : (
        <div className="cards-grid">
          {filteredAthletes.map((athlete) => {
            const qrPayload = JSON.stringify({
              type: 'athlete',
              id: athlete.id,
              bid: athlete.bid_number,
              usn: athlete.usn,
              name: athlete.sslc_name,
            });

            const regularEvents = (athlete.registrations || [])
              .filter((r: any) => r.kind === 'REGULAR')
              .map((r: any) => r.events?.name)
              .filter(Boolean);

            const reserveEvents = (athlete.registrations || [])
              .filter((r: any) => r.kind === 'RESERVE')
              .map((r: any) => r.events?.name)
              .filter(Boolean);

            return (
              <div key={athlete.id} className="id-card">
                {/* Header */}
                <div className="id-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="vtu-emblem">VTU</div>
                    <div>
                      <div className="card-org-title">VTU ATHLETICS MEET 2026</div>
                      <div className="card-org-sub">OFFICIAL ACCREDITATION PASS</div>
                    </div>
                  </div>
                  <div className="card-gender-badge">{gender.toUpperCase()}</div>
                </div>

                {/* Body */}
                <div className="id-card-body">
                  <div className="card-left-col">
                    <div className="athlete-avatar-placeholder">
                      <span>🏃</span>
                    </div>
                    <div className="bid-badge-box">
                      <div className="bid-label">CHEST / BID #</div>
                      <div className="bid-digits">{athlete.bid_number ?? '---'}</div>
                    </div>
                  </div>

                  <div className="card-main-col">
                    <div className="athlete-name">{athlete.sslc_name}</div>
                    <div className="college-title">{collegeName}</div>

                    <div className="details-table">
                      <div className="detail-row">
                        <span className="lbl">USN:</span>
                        <span className="val font-mono">{athlete.usn}</span>
                      </div>
                      <div className="detail-row">
                        <span className="lbl">Sem / Squad:</span>
                        <span className="val">
                          Sem {athlete.semester} • {squadCode}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="lbl">Blood Group:</span>
                        <span className="val">{athlete.blood_group || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Events list */}
                    <div className="events-box">
                      <div className="events-label">PARTICIPATING EVENTS:</div>
                      <div className="events-list">
                        {regularEvents.length > 0 ? (
                          regularEvents.map((ev: string, idx: number) => (
                            <span key={idx} className="event-pill">
                              {ev}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '10px', color: '#666' }}>No individual events</span>
                        )}
                        {reserveEvents.map((ev: string, idx: number) => (
                          <span key={`res-${idx}`} className="event-pill event-pill-reserve">
                            {ev} (Res)
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* QR Code column */}
                  <div className="card-qr-col">
                    <div className="qr-container">
                      <QRCode
                        value={qrPayload}
                        size={84}
                        level="M"
                        style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                      />
                    </div>
                    <div className="qr-caption">SCAN AT GATE</div>
                  </div>
                </div>

                {/* Card Footer with Signatures */}
                <div className="id-card-footer">
                  <div className="sig-block">
                    <div className="sig-line"></div>
                    <div className="sig-title">PED / Coach Signature</div>
                  </div>
                  <div className="sig-block">
                    <div className="sig-line"></div>
                    <div className="sig-title">Meet Director</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Embedded CSS for cards and print */}
      <style jsx global>{`
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 1.5rem;
        }

        .id-card {
          background: #ffffff;
          color: #111827;
          border-radius: 10px;
          border: 2px solid #e5e7eb;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          page-break-inside: avoid;
          display: flex;
          flex-direction: column;
        }

        .id-card-header {
          background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
          color: #ffffff;
          padding: 8px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .vtu-emblem {
          background: #f59e0b;
          color: #111827;
          font-weight: 900;
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.5px;
        }

        .card-org-title {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.5px;
          line-height: 1.2;
        }

        .card-org-sub {
          font-size: 9px;
          opacity: 0.9;
          letter-spacing: 0.8px;
        }

        .card-gender-badge {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.4);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
        }

        .id-card-body {
          padding: 10px 12px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
          flex: 1;
        }

        .card-left-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          width: 80px;
          flex-shrink: 0;
        }

        .athlete-avatar-placeholder {
          width: 72px;
          height: 78px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
        }

        .bid-badge-box {
          background: #1e293b;
          color: #ffffff;
          border-radius: 6px;
          width: 100%;
          text-align: center;
          padding: 3px 0;
        }

        .bid-label {
          font-size: 8px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
        }

        .bid-digits {
          font-size: 18px;
          font-weight: 900;
          line-height: 1.1;
          color: #38bdf8;
        }

        .card-main-col {
          flex: 1;
          min-width: 0;
        }

        .athlete-name {
          font-size: 14px;
          font-weight: 800;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .college-title {
          font-size: 10px;
          font-weight: 600;
          color: #4b5563;
          margin-bottom: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .details-table {
          font-size: 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-bottom: 6px;
        }

        .detail-row {
          display: flex;
          gap: 6px;
        }

        .detail-row .lbl {
          color: #6b7280;
          font-weight: 600;
          width: 65px;
          flex-shrink: 0;
        }

        .detail-row .val {
          color: #111827;
          font-weight: 600;
        }

        .font-mono {
          font-family: monospace;
        }

        .events-box {
          border-top: 1px dashed #e5e7eb;
          padding-top: 4px;
        }

        .events-label {
          font-size: 8px;
          font-weight: 700;
          color: #6b7280;
          margin-bottom: 3px;
        }

        .events-list {
          display: flex;
          flex-wrap: wrap;
          gap: 3px;
        }

        .event-pill {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          font-size: 9px;
          padding: 1px 5px;
          border-radius: 4px;
          font-weight: 600;
        }

        .event-pill-reserve {
          background: #fef2f2;
          color: #b91c1c;
          border-color: #fecaca;
        }

        .card-qr-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          width: 84px;
          flex-shrink: 0;
        }

        .qr-container {
          padding: 4px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }

        .qr-caption {
          font-size: 8px;
          font-weight: 700;
          color: #6b7280;
          letter-spacing: 0.5px;
        }

        .id-card-footer {
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
          padding: 6px 12px 4px 12px;
          display: flex;
          justify-content: space-between;
        }

        .sig-block {
          width: 45%;
          text-align: center;
        }

        .sig-line {
          height: 1px;
          background: #9ca3af;
          margin-bottom: 3px;
          margin-top: 12px;
        }

        .sig-title {
          font-size: 8px;
          color: #4b5563;
          font-weight: 600;
        }

        /* PRINT STYLES */
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }

          .no-print {
            display: none !important;
          }

          #cards-page-container {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .cards-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 12px !important;
            padding: 0 !important;
          }

          .id-card {
            border: 1.5px solid #000000 !important;
            box-shadow: none !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 8px !important;
          }

          .id-card-header {
            background: #1e3a8a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .bid-badge-box {
            background: #111827 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
