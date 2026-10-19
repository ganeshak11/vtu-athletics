'use client';

import React, { useState } from 'react';
import QRCode from 'react-qr-code';

export interface Placer {
  id: string;
  place: number;
  points: number;
  created_at: string;
  events?: {
    id: string;
    name: string;
    code: string;
    gender: string;
    category: string;
  };
  colleges?: {
    id: string;
    name: string;
    code: string;
    district: string;
  };
  profiles?: {
    id: string;
    sslc_name: string;
    usn: string;
    bid_number: number;
  };
}

export interface Athlete {
  id: string;
  sslc_name: string;
  usn: string;
  bid_number: number;
  squads?: {
    colleges?: {
      name: string;
      code: string;
      district: string;
    };
  };
}

export function CertificatesView({
  placers,
  athletes,
}: {
  placers: Placer[];
  athletes: Athlete[];
}) {
  const [certType, setCertType] = useState<'merit' | 'participation'>('merit');
  const [search, setSearch] = useState('');
  const [selectedPlacerId, setSelectedPlacerId] = useState<string | null>(null);

  const filteredPlacers = placers.filter((p) => {
    const q = search.toLowerCase();
    const athleteName = p.profiles?.sslc_name?.toLowerCase() || '';
    const usn = p.profiles?.usn?.toLowerCase() || '';
    const college = p.colleges?.name?.toLowerCase() || '';
    const event = p.events?.name?.toLowerCase() || '';
    const matchesSearch = athleteName.includes(q) || usn.includes(q) || college.includes(q) || event.includes(q);
    const matchesSelected = selectedPlacerId ? p.id === selectedPlacerId : true;
    return matchesSearch && matchesSelected;
  });

  const filteredAthletes = athletes.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.sslc_name.toLowerCase().includes(q) ||
      a.usn.toLowerCase().includes(q) ||
      (a.squads?.colleges?.name && a.squads.colleges.name.toLowerCase().includes(q))
    );
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Control Bar (Hidden on print) */}
      <div
        className="glass-panel no-print"
        style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '8px' }}>
            <button
              onClick={() => setCertType('merit')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                background: certType === 'merit' ? 'var(--accent-gold)' : 'transparent',
                color: certType === 'merit' ? '#111827' : '#fff',
              }}
            >
              🏅 Merit Certificates ({placers.length})
            </button>
            <button
              onClick={() => setCertType('participation')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                background: certType === 'participation' ? '#2563eb' : 'transparent',
                color: '#fff',
              }}
            >
              📜 Participation Certificates ({athletes.length})
            </button>
          </div>

          <input
            type="text"
            className="input-field"
            placeholder="Search by athlete name, USN, or college..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '280px' }}
          />
        </div>

        <button
          onClick={handlePrint}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
        >
          <span>🖨️</span> Print / Save PDF Certificates
        </button>
      </div>

      {/* Certificate Display Area */}
      {certType === 'merit' ? (
        filteredPlacers.length === 0 ? (
          <div className="glass-panel text-center" style={{ padding: '3rem' }}>
            <p style={{ color: 'var(--text-secondary)' }}>
              No merit placers found. Finalize track or field finals to automatically generate merit certificates!
            </p>
          </div>
        ) : (
          <div className="certificates-container">
            {filteredPlacers.map((p) => {
              const placeTitle =
                p.place === 1 ? 'FIRST PLACE — GOLD MEDAL' : p.place === 2 ? 'SECOND PLACE — SILVER MEDAL' : 'THIRD PLACE — BRONZE MEDAL';
              const medalColor = p.place === 1 ? '#d97706' : p.place === 2 ? '#64748b' : '#b45309';

              const qrPayload = JSON.stringify({
                type: 'VTU_MERIT_CERTIFICATE',
                cert_no: `VTU-2026-M-${p.id.slice(0, 8)}`,
                athlete: p.profiles?.sslc_name,
                usn: p.profiles?.usn,
                college: p.colleges?.name,
                event: p.events?.name,
                place: p.place,
              });

              return (
                <div key={p.id} className="certificate-page">
                  <div className="certificate-inner-border" style={{ borderColor: medalColor }}>
                    <div className="certificate-content">
                      {/* Top Header */}
                      <div className="cert-header">
                        <div className="cert-vtu-badge">VTU</div>
                        <h2 className="cert-univ-title">VISVESVARAYA TECHNOLOGICAL UNIVERSITY</h2>
                        <div className="cert-univ-sub">Jnana Sangama, Belagavi, Karnataka — 590018</div>
                        <div className="cert-title">CERTIFICATE OF MERIT</div>
                        <div className="cert-sub-title">24TH VTU INTER-COLLEGIATE ATHLETICS CHAMPIONSHIPS 2026</div>
                      </div>

                      {/* Certificate Text Body */}
                      <div className="cert-body">
                        <p className="cert-p">This is to certify that</p>
                        <h3 className="cert-athlete-name">{p.profiles?.sslc_name || 'STUDENT ATHLETE'}</h3>
                        <p className="cert-p">
                          bearing USN <strong className="font-mono">{p.profiles?.usn}</strong> representing
                        </p>
                        <h4 className="cert-college-name">{p.colleges?.name || 'AFFILIATED COLLEGE'}</h4>
                        <p className="cert-p">
                          has secured <strong style={{ color: medalColor }}>{placeTitle}</strong> in the
                        </p>
                        <h4 className="cert-event-name">{p.events?.name?.toUpperCase()} ({p.events?.gender?.toUpperCase()})</h4>
                        <p className="cert-p">
                          held at the VTU Campus Stadium on November 10–13, 2026.
                        </p>
                      </div>

                      {/* Footer: QR Code & Signatures */}
                      <div className="cert-footer">
                        <div className="cert-qr-box">
                          <QRCode value={qrPayload} size={70} />
                          <div className="cert-qr-id">ID: VTU-2026-M-{p.id.slice(0, 8)}</div>
                        </div>

                        <div className="cert-sig-block">
                          <div className="cert-sig-line"></div>
                          <div className="cert-sig-title">Director of Physical Education</div>
                          <div className="cert-sig-org">VTU Belagavi</div>
                        </div>

                        <div className="cert-sig-block">
                          <div className="cert-sig-line"></div>
                          <div className="cert-sig-title">Registrar</div>
                          <div className="cert-sig-org">VTU Belagavi</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Participation Certificates */
        <div className="certificates-container">
          {filteredAthletes.map((ath) => {
            const qrPayload = JSON.stringify({
              type: 'VTU_PARTICIPATION_CERTIFICATE',
              cert_no: `VTU-2026-P-${ath.id.slice(0, 8)}`,
              athlete: ath.sslc_name,
              usn: ath.usn,
              college: ath.squads?.colleges?.name,
            });

            return (
              <div key={ath.id} className="certificate-page">
                <div className="certificate-inner-border" style={{ borderColor: '#2563eb' }}>
                  <div className="certificate-content">
                    <div className="cert-header">
                      <div className="cert-vtu-badge" style={{ background: '#2563eb' }}>VTU</div>
                      <h2 className="cert-univ-title">VISVESVARAYA TECHNOLOGICAL UNIVERSITY</h2>
                      <div className="cert-univ-sub">Jnana Sangama, Belagavi, Karnataka — 590018</div>
                      <div className="cert-title" style={{ color: '#1e3a8a' }}>CERTIFICATE OF PARTICIPATION</div>
                      <div className="cert-sub-title">24TH VTU INTER-COLLEGIATE ATHLETICS CHAMPIONSHIPS 2026</div>
                    </div>

                    <div className="cert-body">
                      <p className="cert-p">This is to certify that</p>
                      <h3 className="cert-athlete-name">{ath.sslc_name}</h3>
                      <p className="cert-p">
                        bearing USN <strong className="font-mono">{ath.usn}</strong> representing
                      </p>
                      <h4 className="cert-college-name">{ath.squads?.colleges?.name || 'AFFILIATED COLLEGE'}</h4>
                      <p className="cert-p">
                        has actively participated in the 24th VTU Inter-Collegiate Athletics Championships
                        held at VTU Campus Stadium on November 10–13, 2026.
                      </p>
                    </div>

                    <div className="cert-footer">
                      <div className="cert-qr-box">
                        <QRCode value={qrPayload} size={70} />
                        <div className="cert-qr-id">ID: VTU-2026-P-{ath.id.slice(0, 8)}</div>
                      </div>

                      <div className="cert-sig-block">
                        <div className="cert-sig-line"></div>
                        <div className="cert-sig-title">Director of Physical Education</div>
                        <div className="cert-sig-org">VTU Belagavi</div>
                      </div>

                      <div className="cert-sig-block">
                        <div className="cert-sig-line"></div>
                        <div className="cert-sig-title">Registrar</div>
                        <div className="cert-sig-org">VTU Belagavi</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Embedded High-Resolution Certificate Print Styles */}
      <style jsx global>{`
        .certificates-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .certificate-page {
          background: #ffffff;
          color: #111827;
          width: 100%;
          max-width: 960px;
          margin: 0 auto;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
          page-break-after: always;
          break-after: page;
        }

        .certificate-inner-border {
          border: 4px double #d97706;
          padding: 24px;
          border-radius: 8px;
        }

        .certificate-content {
          text-align: center;
        }

        .cert-vtu-badge {
          display: inline-block;
          background: #d97706;
          color: #ffffff;
          font-weight: 900;
          font-size: 13px;
          padding: 2px 10px;
          border-radius: 4px;
          margin-bottom: 6px;
        }

        .cert-univ-title {
          font-size: 20px;
          font-weight: 900;
          letter-spacing: 0.5px;
          color: #1e3a8a;
          margin-bottom: 2px;
        }

        .cert-univ-sub {
          font-size: 11px;
          color: #64748b;
          margin-bottom: 14px;
        }

        .cert-title {
          font-size: 26px;
          font-weight: 900;
          letter-spacing: 2px;
          color: #b45309;
          margin-bottom: 4px;
        }

        .cert-sub-title {
          font-size: 12px;
          font-weight: 700;
          color: #475569;
          letter-spacing: 1px;
          margin-bottom: 20px;
        }

        .cert-body {
          margin-bottom: 24px;
          line-height: 1.6;
        }

        .cert-p {
          font-size: 13px;
          color: #475569;
          margin: 4px 0;
        }

        .cert-athlete-name {
          font-size: 24px;
          font-weight: 900;
          color: #111827;
          margin: 4px 0;
          text-decoration: underline;
          text-decoration-color: #f59e0b;
        }

        .cert-college-name {
          font-size: 17px;
          font-weight: 800;
          color: #1e3a8a;
          margin: 4px 0;
        }

        .cert-event-name {
          font-size: 18px;
          font-weight: 900;
          color: #059669;
          margin: 4px 0;
        }

        .cert-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-top: 16px;
          border-top: 1px dashed #cbd5e1;
        }

        .cert-qr-box {
          text-align: left;
        }

        .cert-qr-id {
          font-size: 8px;
          font-family: monospace;
          color: #64748b;
          margin-top: 4px;
        }

        .cert-sig-block {
          width: 200px;
          text-align: center;
        }

        .cert-sig-line {
          height: 1px;
          background: #475569;
          margin-bottom: 4px;
          margin-top: 28px;
        }

        .cert-sig-title {
          font-size: 11px;
          font-weight: 700;
          color: #111827;
        }

        .cert-sig-org {
          font-size: 9px;
          color: #64748b;
        }

        /* PRINT STYLES */
        @media print {
          @page {
            size: landscape;
            margin: 0;
          }

          body {
            background: #ffffff !important;
            color: #000000 !important;
          }

          .no-print {
            display: none !important;
          }

          #admin-certificates-container {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .certificates-container {
            gap: 0 !important;
          }

          .certificate-page {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            width: 100vw !important;
            height: 100vh !important;
            page-break-after: always !important;
            break-after: page !important;
            padding: 30px !important;
          }
        }
      `}</style>
    </div>
  );
}
