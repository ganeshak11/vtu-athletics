'use client';

import { useState, useMemo } from 'react';
import QRCode from 'react-qr-code';

interface Props {
  athletes: any[];
}

export default function IdCardsClient({ athletes }: Props) {
  const [selectedCollege, setSelectedCollege] = useState('ALL');
  const [selectedGender, setSelectedGender] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyAssignedBibs, setOnlyAssignedBibs] = useState(false);

  // Derive college list
  const collegesList = useMemo(() => {
    const map = new Map<string, string>();
    athletes.forEach((a) => {
      const code = a.squads?.colleges?.code || a.squads?.squad_code;
      const name = a.squads?.colleges?.name || code;
      if (code && !map.has(code)) {
        map.set(code, `${code} - ${name}`);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [athletes]);

  // Filtered list
  const filteredAthletes = useMemo(() => {
    return athletes.filter((a) => {
      if (onlyAssignedBibs && !a.bid_number) return false;

      if (selectedCollege !== 'ALL') {
        const colCode = a.squads?.colleges?.code || a.squads?.squad_code;
        if (colCode !== selectedCollege) return false;
      }

      if (selectedGender !== 'ALL') {
        if (a.squads?.gender !== selectedGender) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (a.sslc_name || '').toLowerCase();
        const usn = (a.usn || '').toLowerCase();
        const bib = String(a.bid_number || '');
        if (!name.includes(q) && !usn.includes(q) && !bib.includes(q)) return false;
      }

      return true;
    });
  }, [athletes, selectedCollege, selectedGender, searchQuery, onlyAssignedBibs]);

  return (
    <div>
      {/* Page Header (Hidden on Print) */}
      <div className="admin-page-header no-print">
        <div className="admin-title-group">
          <h2>Official Accreditation & ID Cards Studio</h2>
          <p>Printable identification cards with athlete photo, serialized bib number, registered events, and verification QR code</p>
        </div>

        <div className="admin-actions-group">
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-admin btn-admin-primary"
            id="btn-print-id-cards"
          >
            <span>🖨️</span>
            <span>Print {filteredAthletes.length} ID Cards</span>
          </button>
        </div>
      </div>

      {/* Filter Bar (Hidden on Print) */}
      <div className="filter-bar no-print">
        <div className="filter-inputs">
          <input
            type="text"
            placeholder="🔍 Search name, USN, bib #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-control"
            style={{ minWidth: '220px' }}
          />

          <select
            value={selectedCollege}
            onChange={(e) => setSelectedCollege(e.target.value)}
            className="filter-control"
          >
            <option value="ALL">All Colleges ({collegesList.length})</option>
            {collegesList.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value)}
            className="filter-control"
          >
            <option value="ALL">All Divisions</option>
            <option value="men">Men (Boys)</option>
            <option value="women">Women (Girls)</option>
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={onlyAssignedBibs}
              onChange={(e) => setOnlyAssignedBibs(e.target.checked)}
            />
            <span>Only Athletes with Bib #</span>
          </label>
        </div>

        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Ready to print: <strong>{filteredAthletes.length}</strong> cards
        </div>
      </div>

      {/* ID Cards Print Grid */}
      {filteredAthletes.length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🪪</div>
          <div style={{ fontWeight: 600, color: '#475569' }}>No athletes match selection</div>
          <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
            Adjust filters or generate bib numbers from the administrative dashboard.
          </div>
        </div>
      ) : (
        <div className="id-cards-grid">
          {filteredAthletes.map((athlete) => {
            const collegeName = athlete.squads?.colleges?.name || athlete.squads?.squad_code || '';
            const collegeCode = athlete.squads?.colleges?.code || athlete.squads?.squad_code || '';
            const qrPayload = `VTU-ATH-2026|USN:${athlete.usn}|BIB:${athlete.bid_number || 'PENDING'}|COL:${collegeCode}|NAME:${athlete.sslc_name}`;

            return (
              <div key={athlete.id} className="id-card">
                {/* Header */}
                <div className="id-card-header">
                  <h4>VTU 26TH ATHLETICS CHAMPIONSHIP</h4>
                  <p>Dr. Ambedkar Institute of Technology • Bengaluru (Host)</p>
                </div>

                {/* Body */}
                <div className="id-card-body">
                  {/* Photo */}
                  <div className="id-photo-container">
                    {athlete.photo_url ? (
                      <img
                        src={athlete.photo_url}
                        alt={athlete.sslc_name}
                      />
                    ) : (
                      <span style={{ fontSize: '2.5rem' }}>🏃</span>
                    )}
                  </div>

                  {/* Serialized Bib Number */}
                  <div className="id-bib-badge">
                    {athlete.bid_number ? `BIB #${athlete.bid_number}` : 'BIB PENDING'}
                  </div>

                  {/* Athlete Name & USN */}
                  <div className="id-athlete-name">{athlete.sslc_name}</div>
                  <div className="id-athlete-usn">
                    {athlete.usn} {athlete.semester ? `• Sem ${athlete.semester}` : ''}
                  </div>

                  {/* College */}
                  <div className="id-college-name">
                    <strong>{collegeCode}</strong> — {collegeName}
                  </div>

                  {/* Details Split: Events List & QR Code */}
                  <div className="id-card-details">
                    <div className="id-events-list">
                      <strong>Disciplines:</strong>
                      <div>
                        {athlete.registrations?.length > 0 ? (
                          athlete.registrations.map((r: any, idx: number) => (
                            <span key={r.id}>
                              {r.events?.name || 'Event'}
                              {idx < athlete.registrations.length - 1 ? ', ' : ''}
                            </span>
                          ))
                        ) : (
                          <span>Roster Entry</span>
                        )}
                      </div>
                      <div style={{ marginTop: '4px', fontSize: '0.65rem', color: '#64748b' }}>
                        Division: <strong>{athlete.squads?.gender === 'men' ? 'Men' : 'Women'}</strong> • Blood:{' '}
                        <strong>{athlete.blood_group || 'N/A'}</strong>
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="id-qr-box">
                      <QRCode
                        value={qrPayload}
                        size={60}
                        style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                        viewBox={`0 0 256 256`}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="id-card-footer">
                  <span>OFFICIAL ACCREDITATION</span>
                  <span>VERIFIED BADGE</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
