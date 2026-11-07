'use client';

import { useMemo, useState } from 'react';
import {
  markCollegeAttendanceAction,
  clearCollegeAttendanceAction,
  type DeskCollege,
} from '@/app/actions/attendance';

interface Props {
  initialColleges: DeskCollege[];
  migrationApplied: boolean;
}

type Filter = 'all' | 'pending' | 'attended';

const PAYMENT_LABEL: Record<string, { text: string; color: string; bg: string }> = {
  VERIFIED: { text: 'Paid', color: '#15803d', bg: '#f0fdf4' },
  SUBMITTED: { text: 'Payment pending', color: '#b45309', bg: '#fffbeb' },
  REJECTED: { text: 'Payment rejected', color: '#b91c1c', bg: '#fef2f2' },
  DRAFT: { text: 'Not paid', color: '#64748b', bg: '#f1f5f9' },
};

export default function RegistrationDeskClient({ initialColleges, migrationApplied }: Props) {
  const [colleges, setColleges] = useState<DeskCollege[]>(initialColleges);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [target, setTarget] = useState<DeskCollege | null>(null);
  const [men, setMen] = useState('0');
  const [women, setWomen] = useState('0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registered = (c: DeskCollege, g: 'men' | 'women') => c.squads.find((s) => s.gender === g)?.athlete_count ?? 0;
  const totalRegistered = (c: DeskCollege) => registered(c, 'men') + registered(c, 'women');

  const attendedCount = colleges.filter((c) => c.attendance_marked_at).length;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return colleges.filter((c) => {
      if (filter === 'pending' && c.attendance_marked_at) return false;
      if (filter === 'attended' && !c.attendance_marked_at) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.district || '').toLowerCase().includes(q) ||
        c.squads.some((s) => s.squad_code.toLowerCase().includes(q) || s.ped_name.toLowerCase().includes(q))
      );
    });
  }, [colleges, search, filter]);

  function openMark(c: DeskCollege) {
    setMen(String(c.attendance_men_count ?? registered(c, 'men')));
    setWomen(String(c.attendance_women_count ?? registered(c, 'women')));
    setError(null);
    setTarget(c);
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!target) return;
    setSaving(true);
    setError(null);
    try {
      const m = Number(men);
      const w = Number(women);
      const res = await markCollegeAttendanceAction(target.id, m, w);
      if (res.success) {
        const id = target.id;
        setColleges((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  attendance_marked_at: res.markedAt || new Date().toISOString(),
                  attendance_marked_by: res.markedBy || null,
                  attendance_men_count: m,
                  attendance_women_count: w,
                }
              : c
          )
        );
        setTarget(null);
      } else {
        setError(res.error || 'Could not mark attendance.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUndo(c: DeskCollege) {
    if (!confirm(`Remove the attendance mark for ${c.name} (${c.code})?\n\nTheir Attendance Certificate will be locked again.`)) return;
    const res = await clearCollegeAttendanceAction(c.id);
    if (res.success) {
      setColleges((prev) =>
        prev.map((x) =>
          x.id === c.id
            ? { ...x, attendance_marked_at: null, attendance_marked_by: null, attendance_men_count: null, attendance_women_count: null }
            : x
        )
      );
    } else {
      alert(`Failed: ${res.error}`);
    }
  }

  return (
    <div id="registration-desk">
      <div className="admin-page-header">
        <div className="admin-title-group">
          <h2>Contingent Reporting &amp; Attendance</h2>
          <p>
            Mark a college as attended when its contingent reports at the desk. This unlocks the college&apos;s Attendance
            Certificate in their contingent portal.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="desk-stat">
            <span className="desk-stat-num">{attendedCount}</span>
            <span className="desk-stat-lbl">Attended</span>
          </div>
          <div className="desk-stat">
            <span className="desk-stat-num">{colleges.length - attendedCount}</span>
            <span className="desk-stat-lbl">Yet to report</span>
          </div>
        </div>
      </div>

      {!migrationApplied && (
        <div className="desk-warning" role="alert">
          ⚠️ Database migration <strong>0022_college_attendance.sql</strong> has not been applied yet, so attendance cannot be
          saved. Ask the Meet Admin to run it in the Supabase SQL editor.
        </div>
      )}

      <div className="filter-bar">
        <div className="filter-inputs">
          <input
            type="search"
            className="filter-control"
            placeholder="Search college name, code, district, squad code or PED…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: 'min(360px, 100%)' }}
            aria-label="Search colleges"
            id="desk-search"
          />
          <select
            className="filter-control"
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            aria-label="Filter by attendance"
          >
            <option value="all">All colleges ({colleges.length})</option>
            <option value="pending">Yet to report ({colleges.length - attendedCount})</option>
            <option value="attended">Attended ({attendedCount})</option>
          </select>
        </div>
        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Showing <strong>{visible.length}</strong>
        </div>
      </div>

      <div className="admin-table-container">
        <table className="admin-table" id="desk-colleges-table">
          <thead>
            <tr>
              <th>College</th>
              <th>PED</th>
              <th style={{ textAlign: 'center' }}>Registered (M / W)</th>
              <th>Fee status</th>
              <th>Attendance</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                  No colleges match this search.
                </td>
              </tr>
            ) : (
              visible.map((c) => {
                const menSq = c.squads.find((s) => s.gender === 'men');
                const womenSq = c.squads.find((s) => s.gender === 'women');
                const ped = menSq?.ped_name || womenSq?.ped_name || '—';
                const phone = menSq?.ped_phone || womenSq?.ped_phone || '';
                return (
                  <tr key={c.id} id={`desk-row-${c.code}`}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        <strong style={{ color: '#b45309' }}>{c.code}</strong>
                        {c.district ? ` • ${c.district}` : ''}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{ped}</div>
                      {phone && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{phone}</div>}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>
                      {registered(c, 'men')} / {registered(c, 'women')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {[menSq, womenSq].map((sq) => {
                          if (!sq) return null;
                          const p = PAYMENT_LABEL[sq.payment_status] || PAYMENT_LABEL.DRAFT;
                          return (
                            <span key={sq.id} className="desk-pill" style={{ color: p.color, background: p.bg }}>
                              {sq.gender === 'men' ? 'M' : 'W'}: {p.text}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td>
                      {c.attendance_marked_at ? (
                        <div>
                          <span className="desk-pill" style={{ color: '#15803d', background: '#f0fdf4', fontWeight: 800 }}>
                            ✓ Attended
                          </span>
                          <div style={{ fontSize: '0.75rem', color: '#334155', marginTop: '0.25rem' }}>
                            {c.attendance_men_count ?? 0} men • {c.attendance_women_count ?? 0} women
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {new Date(c.attendance_marked_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            {c.attendance_marked_by ? ` • ${c.attendance_marked_by}` : ''}
                          </div>
                        </div>
                      ) : (
                        <span className="desk-pill" style={{ color: '#64748b', background: '#f1f5f9' }}>
                          Not reported
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {c.attendance_marked_at ? (
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button type="button" className="btn-admin" onClick={() => openMark(c)} disabled={!migrationApplied}>
                            Edit
                          </button>
                          <button type="button" className="btn-admin btn-admin-danger" onClick={() => handleUndo(c)} disabled={!migrationApplied}>
                            Undo
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn-admin btn-admin-success"
                          onClick={() => openMark(c)}
                          disabled={!migrationApplied}
                          title={totalRegistered(c) === 0 ? 'No athletes registered online for this college' : undefined}
                          id={`btn-mark-attended-${c.code}`}
                        >
                          Mark Attended
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {target && (
        <div className="desk-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="desk-modal-title" onClick={() => !saving && setTarget(null)}>
          <div className="desk-modal" onClick={(e) => e.stopPropagation()}>
            <h3 id="desk-modal-title" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.3rem' }}>
              Mark contingent attended
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1rem' }}>
              <strong>{target.name}</strong> ({target.code}). Enter how many participants actually reported. These numbers are
              printed on the college&apos;s Attendance Certificate.
            </p>

            {error && <div className="desk-warning">⚠️ {error}</div>}

            <form onSubmit={handleSave} id="form-mark-attended">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <label className="desk-field">
                  <span>Men participants</span>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    step={1}
                    required
                    value={men}
                    onChange={(e) => setMen(e.target.value)}
                    className="filter-control"
                    id="desk-men-count"
                    autoFocus
                  />
                  <small>Registered: {registered(target, 'men')}</small>
                </label>
                <label className="desk-field">
                  <span>Women participants</span>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    step={1}
                    required
                    value={women}
                    onChange={(e) => setWomen(e.target.value)}
                    className="filter-control"
                    id="desk-women-count"
                  />
                  <small>Registered: {registered(target, 'women')}</small>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn-admin" onClick={() => setTarget(null)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn-admin btn-admin-success" disabled={saving} id="btn-confirm-attended">
                  {saving ? 'Saving…' : 'Mark Attended & Unlock Certificate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .desk-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 96px;
          padding: 0.5rem 0.9rem;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
        }
        .desk-stat-num {
          font-size: 1.4rem;
          font-weight: 900;
          color: #1e3a8a;
          line-height: 1.1;
        }
        .desk-stat-lbl {
          font-size: 0.7rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .desk-warning {
          padding: 0.75rem 1rem;
          margin-bottom: 1rem;
          border-radius: 8px;
          background: #fffbeb;
          border: 1px solid #fcd34d;
          color: #92400e;
          font-size: 0.85rem;
        }
        :global(.desk-pill) {
          display: inline-block;
          padding: 0.15rem 0.55rem;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 700;
          white-space: nowrap;
        }
        .desk-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 100000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: rgba(15, 23, 42, 0.6);
        }
        .desk-modal {
          width: 100%;
          max-width: 460px;
          background: #fff;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.3);
        }
        .desk-field {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          font-size: 0.8rem;
          font-weight: 700;
          color: #334155;
        }
        .desk-field small {
          font-weight: 500;
          color: #64748b;
        }
      `}</style>
    </div>
  );
}
