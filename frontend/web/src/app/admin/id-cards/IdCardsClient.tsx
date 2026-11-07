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
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

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
          <h2>6×4″ Official Accreditation &amp; ID Cards Studio</h2>
          <p>
            Standard 6×4 inch accreditation badges with athlete photo, enlarged bib number (no text label), verified QR, events, blood group, and emergency contact.
          </p>
        </div>

        <div className="admin-actions-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Orientation Switcher */}
          <div className="orientation-toggle-group">
            <button
              type="button"
              className={`btn-orientation ${orientation === 'portrait' ? 'active' : ''}`}
              onClick={() => setOrientation('portrait')}
            >
              📄 Portrait (4″ × 6″)
            </button>
            <button
              type="button"
              className={`btn-orientation ${orientation === 'landscape' ? 'active' : ''}`}
              onClick={() => setOrientation('landscape')}
            >
              🖼️ Landscape (6″ × 4″)
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="btn-admin btn-admin-primary"
            id="btn-print-id-cards"
          >
            <span>🖨️</span>
            <span>Print {filteredAthletes.length} Cards ({orientation === 'portrait' ? '4×6″' : '6×4″'})</span>
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
            <option value="men">Men</option>
            <option value="women">Women</option>
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
          Format: <strong>{orientation === 'portrait' ? '4″ × 6″ Vertical Badge' : '6″ × 4″ Horizontal Card'}</strong> • Ready: <strong>{filteredAthletes.length}</strong> cards
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
            const collegeCode = athlete.squads?.colleges?.code || athlete.squads?.squad_code || '';
            // Signed token generated on the server (AURA26.<id>.<sig>) — scanned by AURA Officials
            const qrPayload: string = athlete.qr_token || '';
            const contactPhone = athlete.squads?.ped_phone || athlete.phone || '';
            const eventsList = (athlete.registrations || []).map((r: any) => r.events?.name || 'Event');

            if (orientation === 'landscape') {
              /* 6" x 4" Landscape Card: EXACTLY the 7 requested elements */
              return (
                <div key={athlete.id} className="id-card card-landscape">
                  {/* Left Column: Photo & QR Code */}
                  <div className="id-landscape-left">
                    <div className="id-photo-frame">
                      {athlete.photo_url ? (
                        <img src={athlete.photo_url} alt={athlete.sslc_name} />
                      ) : (
                        <span className="id-photo-placeholder">🏃</span>
                      )}
                    </div>

                    <div className="id-qr-frame">
                      <QRCode
                        value={qrPayload}
                        size={76}
                        style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                        viewBox="0 0 256 256"
                      />
                    </div>
                  </div>

                  {/* Right Column: Bib Number, Name, Events, Blood Group, Contact */}
                  <div className="id-landscape-right">
                    <div className="id-landscape-hero-top">
                      {/* Slightly bigger Bib number with strictly NO "BIB" label */}
                      <div className="id-landscape-bib">
                        {athlete.bid_number || '—'}
                      </div>

                      <div className="id-landscape-meta-tags">
                        <div className="id-blood-tag">
                          🩸 Blood: <strong>{athlete.blood_group || 'N/A'}</strong>
                        </div>
                        {contactPhone && (
                          <div className="id-contact-tag">
                            📞 Contact: <strong>{contactPhone}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      {/* Athlete Name */}
                      <div className="id-athlete-name" style={{ marginTop: 0 }}>
                        {athlete.sslc_name}
                      </div>

                      {/* Registered Events */}
                      <div className="id-events-section" style={{ marginTop: '0.1in' }}>
                        <div className="id-events-list">
                          {eventsList.length > 0 ? (
                            eventsList.map((evName: string, idx: number) => (
                              <span key={idx} className="id-event-chip">
                                {evName}
                              </span>
                            ))
                          ) : (
                            <span className="id-event-chip">Roster Entry</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            /* 4" x 6" Portrait Card: EXACTLY the 7 requested elements */
            return (
              <div key={athlete.id} className="id-card card-portrait">
                {/* 1. Top Row: Athlete Photo & Enlarged Bib Number (No "BIB" text) */}
                <div className="id-card-top-row">
                  <div className="id-photo-frame">
                    {athlete.photo_url ? (
                      <img src={athlete.photo_url} alt={athlete.sslc_name} />
                    ) : (
                      <span className="id-photo-placeholder">🏃</span>
                    )}
                  </div>

                  <div className="id-bib-hero">
                    <div className="id-bib-hero-number">
                      {athlete.bid_number || '—'}
                    </div>
                  </div>
                </div>

                {/* 2. Middle Section: Athlete Name & Registered Events */}
                <div>
                  <div className="id-athlete-name">
                    {athlete.sslc_name}
                  </div>

                  <div className="id-events-section">
                    <div className="id-events-list">
                      {eventsList.length > 0 ? (
                        eventsList.map((evName: string, idx: number) => (
                          <span key={idx} className="id-event-chip">
                            {evName}
                          </span>
                        ))
                      ) : (
                        <span className="id-event-chip">Roster Entry</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Bottom Row: Verification QR Code, Blood Group & Emergency Contact */}
                <div className="id-card-bottom-row">
                  <div className="id-qr-frame">
                    <QRCode
                      value={qrPayload}
                      size={82}
                      style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                      viewBox="0 0 256 256"
                    />
                  </div>

                  <div className="id-meta-col">
                    <div className="id-blood-tag">
                      🩸 Blood: <strong>{athlete.blood_group || 'N/A'}</strong>
                    </div>
                    {contactPhone && (
                      <div className="id-contact-tag">
                        📞 Contact: <strong>{contactPhone}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
