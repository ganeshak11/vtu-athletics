'use client';

import { useState } from 'react';

interface Props {
  squads: any[];
}

export default function DelegationsClient({ squads }: Props) {
  const [selectedSquadId, setSelectedSquadId] = useState<string>('ALL');

  const visibleSquads = selectedSquadId === 'ALL'
    ? squads
    : squads.filter((s) => s.id === selectedSquadId);

  return (
    <div>
      {/* Page Header (No print) */}
      <div className="admin-page-header no-print">
        <div className="admin-title-group">
          <h2>College Delegation Master Sign-off Roster</h2>
          <p>Official check-in documentation and verification sign-off for visiting college contingents</p>
        </div>

        <div className="admin-actions-group">
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-admin btn-admin-primary"
            id="btn-print-delegations"
          >
            <span>🖨️</span>
            <span>Print Delegation Sheets</span>
          </button>
        </div>
      </div>

      {/* Filter (No print) */}
      <div className="filter-bar no-print">
        <div className="filter-inputs">
          <select
            value={selectedSquadId}
            onChange={(e) => setSelectedSquadId(e.target.value)}
            className="filter-control"
            style={{ minWidth: '320px' }}
          >
            <option value="ALL">All College Delegations ({squads.length})</option>
            {squads.map((sq) => (
              <option key={sq.id} value={sq.id}>
                {sq.colleges?.code || sq.squad_code} — {sq.colleges?.name || 'College'} ({sq.gender === 'men' ? 'Men' : 'Women'})
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Selected: <strong>{visibleSquads.length}</strong> delegation sheet(s)
        </div>
      </div>

      {/* Printable Delegation Sheets */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {visibleSquads.map((sq) => {
          const colName = sq.colleges?.name || sq.squad_code;
          const colCode = sq.colleges?.code || sq.squad_code;
          const athletes = sq.profiles || [];

          return (
            <div
              key={sq.id}
              className="printable-signoff-sheet"
              style={{
                background: '#ffffff',
                border: '2px solid #0f172a',
                borderRadius: '12px',
                padding: '2rem',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
              }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.03em' }}>
                  VISVESVARAYA TECHNOLOGICAL UNIVERSITY, BELAGAVI
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
                  26TH INTER-COLLEGIATE ATHLETICS CHAMPIONSHIP 2026
                </div>
                <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600, marginTop: '0.2rem' }}>
                  Host: Dr. Ambedkar Institute of Technology, Bengaluru
                </div>
                <div style={{ display: 'inline-block', marginTop: '0.6rem', padding: '0.25rem 0.85rem', background: '#0f172a', color: '#ffffff', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.05em' }}>
                  OFFICIAL DELEGATION ARRIVAL & CHECK-IN SIGN-OFF SHEET
                </div>
              </div>

              {/* College & PED Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Participating College</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{colName}</div>
                  <div style={{ fontSize: '0.85rem', color: '#2563eb', fontWeight: 700 }}>College Code: {colCode}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Division & Squad</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                    {sq.gender === 'men' ? 'Men (Boys)' : 'Women (Girls)'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Squad ID: {sq.squad_code}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Physical Education Director</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{sq.ped_name || 'Not Provided'}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{sq.ped_phone || 'No phone'}</div>
                </div>
              </div>

              {/* Roster Table */}
              <div style={{ marginBottom: '2rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem', border: '1px solid #cbd5e1' }}>
                  <thead style={{ background: '#f1f5f9' }}>
                    <tr>
                      <th style={{ border: '1px solid #cbd5e1', padding: '0.5rem', width: '40px', textAlign: 'center' }}>Sl</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '0.5rem', width: '70px', textAlign: 'center' }}>Bib #</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'left' }}>Athlete Name (SSLC)</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '0.5rem', width: '110px', textAlign: 'left' }}>USN</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '0.5rem', width: '50px', textAlign: 'center' }}>Sem</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'left' }}>Registered Events</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '0.5rem', width: '70px', textAlign: 'center' }}>Present?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {athletes.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ border: '1px solid #cbd5e1', padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>
                          No athletes registered in this contingent.
                        </td>
                      </tr>
                    ) : (
                      athletes.map((ath: any, idx: number) => (
                        <tr key={ath.id}>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.45rem', textAlign: 'center', color: '#64748b' }}>
                            {idx + 1}
                          </td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.45rem', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>
                            {ath.bid_number ? `#${ath.bid_number}` : '—'}
                          </td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.45rem', fontWeight: 700, color: '#0f172a' }}>
                            {ath.sslc_name}
                          </td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.45rem', color: '#2563eb', fontWeight: 600 }}>
                            {ath.usn}
                          </td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.45rem', textAlign: 'center' }}>
                            {ath.semester || '—'}
                          </td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.45rem', color: '#334155' }}>
                            {ath.registrations?.map((r: any) => r.events?.name).join(', ') || 'Roster entry'}
                          </td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.45rem', textAlign: 'center' }}>
                            <div style={{ width: '18px', height: '18px', border: '1px solid #0f172a', margin: '0 auto' }} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Sign-off Signature Blocks */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px dashed #cbd5e1' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ minHeight: '60px' }}></div>
                  <div style={{ borderTop: '1px solid #0f172a', paddingTop: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                    Signature of Physical Education Director / Team Manager
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    With College Official Seal
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ minHeight: '60px' }}></div>
                  <div style={{ borderTop: '1px solid #0f172a', paddingTop: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                    Signature of VTU Meet Technical Delegate / Desk Official
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    Dr. AIT Accreditation Desk
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
