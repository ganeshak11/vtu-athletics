'use client';

import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

interface Props {
  athletes: any[];
}

export default function AthletesClient({ athletes }: Props) {
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollege, setSelectedCollege] = useState('ALL');
  const [selectedGender, setSelectedGender] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedEvent, setSelectedEvent] = useState('ALL');

  // Derive unique college list
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

  // Derive unique events list
  const eventsList = useMemo(() => {
    const set = new Set<string>();
    athletes.forEach((a) => {
      a.registrations?.forEach((r: any) => {
        if (r.events?.name) set.add(r.events.name);
      });
    });
    return Array.from(set).sort();
  }, [athletes]);

  // Filtered athletes computation
  const filteredAthletes = useMemo(() => {
    return athletes.filter((a) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (a.sslc_name || '').toLowerCase();
        const usn = (a.usn || '').toLowerCase();
        const bib = String(a.bid_number || '');
        const col = (a.squads?.colleges?.name || '').toLowerCase();
        if (!name.includes(q) && !usn.includes(q) && !bib.includes(q) && !col.includes(q)) {
          return false;
        }
      }

      // College filter
      if (selectedCollege !== 'ALL') {
        const colCode = a.squads?.colleges?.code || a.squads?.squad_code;
        if (colCode !== selectedCollege) return false;
      }

      // Gender filter
      if (selectedGender !== 'ALL') {
        if (a.squads?.gender !== selectedGender) return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL') {
        if (a.squads?.payment_status !== selectedStatus) return false;
      }

      // Event filter
      if (selectedEvent !== 'ALL') {
        const hasEvent = a.registrations?.some((r: any) => r.events?.name === selectedEvent);
        if (!hasEvent) return false;
      }

      return true;
    });
  }, [athletes, searchQuery, selectedCollege, selectedGender, selectedStatus, selectedEvent]);

  // Helper to format rows for Excel export
  function formatForExcel(list: any[]) {
    return list.map((a, index) => {
      const eventNames = a.registrations?.map((r: any) => {
        return `${r.events?.name || 'Event'} (${r.kind === 'reserve' ? 'Reserve' : 'Primary'})`;
      }).join('; ') || 'None';

      return {
        'Sl No': index + 1,
        'Bib Number': a.bid_number ? `#${a.bid_number}` : 'Unassigned',
        'Athlete Name (SSLC)': a.sslc_name || '',
        'USN': a.usn || '',
        'College Code': a.squads?.colleges?.code || a.squads?.squad_code || '',
        'College Name': a.squads?.colleges?.name || '',
        'Gender': a.squads?.gender === 'men' ? 'Men' : 'Women',
        'Semester': a.semester || '',
        'Blood Group': a.blood_group || '',
        'Registered Events': eventNames,
        'Payment Status': a.squads?.payment_status || 'DRAFT',
      };
    });
  }

  // Export to Excel handler
  function handleExport(dataset: any[], filename: string) {
    if (dataset.length === 0) {
      alert('No athlete records available to export.');
      return;
    }
    const formatted = formatForExcel(dataset);
    const ws = XLSX.utils.json_to_sheet(formatted);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Athletes Roster');

    // Auto-fit column widths
    const colWidths = Object.keys(formatted[0] || {}).map((key) => ({
      wch: Math.max(key.length, 14),
    }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  return (
    <div>
      {/* Page Header */}
      <div className="admin-page-header">
        <div className="admin-title-group">
          <h2>Athletes Delegation Management</h2>
          <p>Complete athlete directory with multi-dimensional filters and Excel export</p>
        </div>

        {/* Excel Export Buttons (Both entire and filtered) */}
        <div className="admin-actions-group">
          <button
            type="button"
            onClick={() => handleExport(athletes, `VTU_Athletics_Entire_Roster_${new Date().toISOString().split('T')[0]}`)}
            className="btn-admin btn-admin-secondary"
            id="btn-export-entire"
          >
            <span>📥</span>
            <span>Export Entire Roster ({athletes.length}) .xlsx</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport(filteredAthletes, `VTU_Athletics_Filtered_Roster_${new Date().toISOString().split('T')[0]}`)}
            className="btn-admin btn-admin-primary"
            id="btn-export-filtered"
          >
            <span>📊</span>
            <span>Export Filtered View ({filteredAthletes.length}) .xlsx</span>
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="filter-bar">
        <div className="filter-inputs">
          {/* Search Input */}
          <input
            type="text"
            placeholder="🔍 Search name, USN, bib #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-control"
            style={{ minWidth: '220px' }}
            id="filter-search"
          />

          {/* College Filter */}
          <select
            value={selectedCollege}
            onChange={(e) => setSelectedCollege(e.target.value)}
            className="filter-control"
            id="filter-college"
          >
            <option value="ALL">All Colleges ({collegesList.length})</option>
            {collegesList.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>

          {/* Gender Filter */}
          <select
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value)}
            className="filter-control"
            id="filter-gender"
          >
            <option value="ALL">All Divisions</option>
            <option value="men">Men (Boys)</option>
            <option value="women">Women (Girls)</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="filter-control"
            id="filter-status"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="VERIFIED">Verified (Approved)</option>
            <option value="SUBMITTED">Pending Verification</option>
            <option value="REJECTED">Rejected</option>
            <option value="DRAFT">Draft</option>
          </select>

          {/* Event Filter */}
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="filter-control"
            id="filter-event"
          >
            <option value="ALL">All Events ({eventsList.length})</option>
            {eventsList.map((ev) => (
              <option key={ev} value={ev}>
                {ev}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button */}
        {(searchQuery || selectedCollege !== 'ALL' || selectedGender !== 'ALL' || selectedStatus !== 'ALL' || selectedEvent !== 'ALL') && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCollege('ALL');
              setSelectedGender('ALL');
              setSelectedStatus('ALL');
              setSelectedEvent('ALL');
            }}
            className="btn-admin btn-admin-secondary"
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Roster Counter Summary */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.825rem', color: '#64748b' }}>
        <span>
          Showing <strong style={{ color: '#0f172a' }}>{filteredAthletes.length}</strong> of{' '}
          <strong style={{ color: '#0f172a' }}>{athletes.length}</strong> athletes
        </span>
        {selectedCollege !== 'ALL' && (
          <span>
            Filtered by College: <strong>{selectedCollege}</strong>
          </span>
        )}
      </div>

      {/* Athletes Data Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Bib #</th>
              <th>Athlete Name & USN</th>
              <th>College</th>
              <th style={{ width: '90px' }}>Division</th>
              <th style={{ width: '70px' }}>Blood</th>
              <th>Registered Events</th>
              <th style={{ width: '130px' }}>Payment Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredAthletes.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                  <div style={{ fontWeight: 600, color: '#475569' }}>No athletes found</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                    Try adjusting your search criteria or resetting filters.
                  </div>
                </td>
              </tr>
            ) : (
              filteredAthletes.map((athlete) => {
                const status = athlete.squads?.payment_status || 'DRAFT';
                return (
                  <tr key={athlete.id}>
                    {/* Bib Number */}
                    <td>
                      {athlete.bid_number ? (
                        <span
                          style={{
                            background: '#0f172a',
                            color: '#ffffff',
                            fontWeight: 800,
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            letterSpacing: '0.03em',
                            display: 'inline-block',
                          }}
                        >
                          #{athlete.bid_number}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic' }}>
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Athlete Name & USN */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: '#e2e8f0',
                            overflow: 'hidden',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1rem',
                          }}
                        >
                          {athlete.photo_url ? (
                            <img
                              src={athlete.photo_url}
                              alt={athlete.sslc_name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            '🏃'
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{athlete.sslc_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
                            {athlete.usn} {athlete.semester ? `• Sem ${athlete.semester}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* College */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>
                        {athlete.squads?.colleges?.code || athlete.squads?.squad_code}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {athlete.squads?.colleges?.name}
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
                          background: athlete.squads?.gender === 'men' ? '#eff6ff' : '#fdf2f8',
                          color: athlete.squads?.gender === 'men' ? '#1d4ed8' : '#be185d',
                        }}
                      >
                        {athlete.squads?.gender === 'men' ? 'Men' : 'Women'}
                      </span>
                    </td>

                    {/* Blood Group */}
                    <td>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                        {athlete.blood_group || '—'}
                      </span>
                    </td>

                    {/* Registered Events */}
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxWidth: '340px' }}>
                        {athlete.registrations?.length > 0 ? (
                          athlete.registrations.map((r: any) => (
                            <span
                              key={r.id}
                              style={{
                                background: r.kind === 'reserve' ? '#f1f5f9' : '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                padding: '0.15rem 0.45rem',
                                fontSize: '0.725rem',
                                color: r.kind === 'reserve' ? '#64748b' : '#0f172a',
                                fontWeight: 500,
                              }}
                            >
                              {r.events?.name || 'Event'} {r.kind === 'reserve' ? '(Res)' : ''}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No events registered</span>
                        )}
                      </div>
                    </td>

                    {/* Payment Status */}
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
                          ? '⏳ Pending'
                          : status === 'REJECTED'
                          ? '✕ Rejected'
                          : 'Draft'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
