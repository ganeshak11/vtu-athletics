'use client';

import { useState } from 'react';
import { addAthleteAction, deleteAthleteAction } from '@/app/actions/athletes';
import Link from 'next/link';

interface EventItem {
  id: string;
  name: string;
  code: string;
  category: string;
}

interface RegistrationItem {
  id: string;
  kind: 'regular' | 'reserve' | 'relay' | 'half_marathon';
  event_id: string;
  events?: EventItem;
}

interface AthleteItem {
  id: string;
  sslc_name: string;
  usn: string;
  semester: number;
  blood_group: string;
  college_joining_date: string;
  sem_start_date: string;
  bid_number?: number;
  accreditation_status: string;
  registrations: RegistrationItem[];
}

interface Props {
  initialAthletes: AthleteItem[];
  availableEvents: EventItem[];
  rosterLocked: boolean;
  squadCode: string;
  gender: 'men' | 'women';
}

export default function AthletesManager({
  initialAthletes,
  availableEvents,
  rosterLocked,
  squadCode,
  gender,
}: Props) {
  const [athletes, setAthletes] = useState<AthleteItem[]>(initialAthletes);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form selections for dynamic filtering
  const [event1, setEvent1] = useState('');
  const [event2, setEvent2] = useState('');
  const [reserveEvent, setReserveEvent] = useState('');

  // Individual events (excluding pure relay events which are handled on the relay team composition board)
  const individualEvents = availableEvents.filter((e) => e.category !== 'relay');

  async function handleAddAthlete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await addAthleteAction(formData);
      if (res.success) {
        setShowAddModal(false);
        setEvent1('');
        setEvent2('');
        setReserveEvent('');
        window.location.reload();
      } else {
        setError(res.error || 'Failed to add athlete.');
      }
    } catch {
      setError('An unexpected network error occurred.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(athleteId: string, name: string) {
    if (!confirm(`Are you sure you want to remove ${name} from the squad roster?`)) return;

    const res = await deleteAthleteAction(athleteId);
    if (res.success) {
      setAthletes((prev) => prev.filter((a) => a.id !== athleteId));
    } else {
      alert(`Error: ${res.error}`);
    }
  }

  return (
    <div>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Link href="/squad/dashboard" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              ← Squad Dashboard
            </Link>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>
            {gender === 'men' ? '🚹 Men’s' : '🚺 Women’s'} Athlete Roster ({squadCode})
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Total Registered Athletes: <strong>{athletes.length}</strong> • Max 2 individual regular events + 1 reserve per athlete.
          </p>
        </div>

        <div>
          {rosterLocked ? (
            <div style={{ padding: '0.6rem 1.2rem', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', color: '#f43f5e', fontSize: '0.9rem', fontWeight: 700 }}>
              🔒 Roster Locked (Post-Payment)
            </div>
          ) : (
            <button
              onClick={() => {
                setShowAddModal(true);
                setError(null);
                setEvent1('');
                setEvent2('');
                setReserveEvent('');
              }}
              className="btn btn-primary"
              id="btn-open-add-athlete"
            >
              + Add New Athlete
            </button>
          )}
        </div>
      </div>

      {/* Athletes Data Table */}
      <div className="table-container">
        <table className="data-table" id="athletes-table">
          <thead>
            <tr>
              <th>Athlete Name (SSLC)</th>
              <th>USN</th>
              <th>Sem / Blood</th>
              <th>Primary Events</th>
              <th>Reserve Event</th>
              <th>Accreditation</th>
              {!rosterLocked && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {athletes.length === 0 ? (
              <tr>
                <td colSpan={rosterLocked ? 6 : 7} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                  No athletes registered yet in this squad. Click &quot;Add New Athlete&quot; to begin building your roster.
                </td>
              </tr>
            ) : (
              athletes.map((athlete) => {
                const regularRegs = athlete.registrations.filter((r) => r.kind === 'regular');
                const reserveRegs = athlete.registrations.filter((r) => r.kind === 'reserve');
                const hmRegs = athlete.registrations.filter((r) => r.kind === 'half_marathon');

                return (
                  <tr key={athlete.id} id={`row-athlete-${athlete.id}`}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{athlete.sslc_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Joined: {new Date(athlete.college_joining_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <code style={{ color: 'var(--accent-gold)', fontWeight: 700, fontSize: '0.9rem' }}>
                        {athlete.usn}
                      </code>
                    </td>
                    <td>
                      <span>Sem {athlete.semester}</span> • <span style={{ fontWeight: 600 }}>{athlete.blood_group}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {regularRegs.map((r) => (
                          <span
                            key={r.id}
                            style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(59, 130, 246, 0.15)',
                              color: '#60a5fa',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            {r.events?.name || 'Event'}
                          </span>
                        ))}
                        {hmRegs.length > 0 && (
                          <span
                            style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: '#fbbf24',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            🏃 21km Half Marathon
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {reserveRegs.length > 0 ? (
                        <span
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(148, 163, 184, 0.12)',
                            color: '#94a3b8',
                            border: '1px solid rgba(148, 163, 184, 0.25)',
                            fontSize: '0.75rem',
                          }}
                        >
                          {reserveRegs[0].events?.name} (Reserve)
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '9999px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: athlete.accreditation_status === 'ACCREDITED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: athlete.accreditation_status === 'ACCREDITED' ? '#34d399' : '#94a3b8',
                        }}
                      >
                        {athlete.accreditation_status}
                      </span>
                    </td>
                    {!rosterLocked && (
                      <td>
                        <button
                          onClick={() => handleDelete(athlete.id, athlete.sslc_name)}
                          className="btn btn-danger"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                          id={`btn-delete-${athlete.id}`}
                        >
                          ✕ Remove
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Athlete Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
          id="modal-add-athlete-overlay"
        >
          <div
            className="glass-panel"
            style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}
            id="modal-add-athlete"
          >
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.35rem' }}>
              Register Student Athlete ({gender.toUpperCase()})
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Enter athlete identity details exactly as printed on university marks cards.
            </p>

            {error && (
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', color: '#f43f5e', fontSize: '0.85rem', marginBottom: '1rem' }} id="add-athlete-error">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleAddAthlete} id="form-add-athlete">
              <div className="form-group">
                <label className="form-label" htmlFor="sslcName">Full Name (as per SSLC Marks Card)</label>
                <input id="sslcName" name="sslcName" type="text" required placeholder="e.g. PRAJWAL M" className="input-field" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="usn">USN (University Seat No.)</label>
                  <input id="usn" name="usn" type="text" required placeholder="e.g. 4MT22CS085" className="input-field" style={{ textTransform: 'uppercase' }} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="semester">Current Semester</label>
                  <select id="semester" name="semester" required className="input-field" defaultValue="3">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="bloodGroup">Blood Group</label>
                  <select id="bloodGroup" name="bloodGroup" required className="input-field" defaultValue="O+">
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="collegeJoiningDate">College Admission Date</label>
                  <input id="collegeJoiningDate" name="collegeJoiningDate" type="date" required className="input-field" defaultValue="2022-09-15" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="semStartDate">Current Semester Start Date</label>
                <input id="semStartDate" name="semStartDate" type="date" required className="input-field" defaultValue="2026-08-01" />
              </div>

              {/* Event Registrations */}
              <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                  Event Participation (Max 2 Regular + 1 Reserve)
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="event1Id">Primary Event 1 (Mandatory)</label>
                  <select
                    id="event1Id"
                    name="event1Id"
                    required
                    className="input-field"
                    value={event1}
                    onChange={(e) => setEvent1(e.target.value)}
                  >
                    <option value="">Select Event 1</option>
                    {individualEvents.map((ev) => (
                      <option key={ev.id} value={ev.id} disabled={ev.id === event2 || ev.id === reserveEvent}>
                        {ev.name} ({ev.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="event2Id">Event 2 (Optional)</label>
                  <select
                    id="event2Id"
                    name="event2Id"
                    className="input-field"
                    value={event2}
                    onChange={(e) => setEvent2(e.target.value)}
                  >
                    <option value="">None (Single Event Athlete)</option>
                    {individualEvents.map((ev) => (
                      <option key={ev.id} value={ev.id} disabled={ev.id === event1 || ev.id === reserveEvent}>
                        {ev.name} ({ev.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reserveEventId">Reserve Event (Optional — Free)</label>
                  <select
                    id="reserveEventId"
                    name="reserveEventId"
                    className="input-field"
                    value={reserveEvent}
                    onChange={(e) => setReserveEvent(e.target.value)}
                  >
                    <option value="">None</option>
                    {individualEvents.map((ev) => (
                      <option key={ev.id} value={ev.id} disabled={ev.id === event1 || ev.id === event2}>
                        {ev.name} ({ev.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0' }}>
                  <input type="checkbox" id="isHalfMarathon" name="isHalfMarathon" style={{ width: '18px', height: '18px', accentColor: 'var(--accent-gold)' }} />
                  <label htmlFor="isHalfMarathon" style={{ fontSize: '0.9rem', cursor: 'pointer', color: '#f8fafc' }}>
                    Enter 21km Half Marathon (Unrestricted quota)
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary" disabled={loading}>
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn btn-primary" id="btn-submit-add-athlete">
                  {loading ? 'Registering Athlete...' : 'Save to Squad Roster →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
