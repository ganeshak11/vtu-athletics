'use client';

import React, { useState, useEffect } from 'react';

interface Event {
  id: string;
  name: string;
  code: string;
  gender: string;
  category: string;
  start_type: string;
}

interface ScheduleItem {
  id: string;
  stage: string;
  scheduled_time: string;
  estimated_duration_min: number;
  call_room_time: string;
  status: string;
  events: Event;
}

interface Session {
  id: string;
  session_name: string;
  session_date: string;
  start_time: string;
  end_time: string;
  schedule_items: ScheduleItem[];
}

interface HeatAthlete {
  id: string;
  lane_number: number;
  call_room_reported: boolean;
  seed_mark: string;
  profiles?: {
    id: string;
    sslc_name: string;
    usn: string;
    bid_number: number;
    squads: {
      gender: string;
      colleges: {
        name: string;
        code: string;
      };
    };
  };
  relay_teams?: {
    id: string;
    squads: {
      colleges: {
        name: string;
        code: string;
      };
    };
  };
}

interface Heat {
  id: string;
  stage: string;
  heat_number: number;
  wind_reading: number | null;
  status: string;
  heat_athletes: HeatAthlete[];
}

export function ScheduleManagerView({
  initialSessions,
  events,
}: {
  initialSessions: Session[];
  events: Event[];
}) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(
    events.find((e) => e.code === '100M-M') || events[0] || null
  );
  const [selectedStage, setSelectedStage] = useState<string>('HEATS');
  const [numLanes, setNumLanes] = useState<number>(8);

  const [heats, setHeats] = useState<Heat[]>([]);
  const [loadingHeats, setLoadingHeats] = useState<boolean>(false);
  const [drawingHeats, setDrawingHeats] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    if (selectedEvent) {
      fetchHeats(selectedEvent.id, selectedStage);
    }
  }, [selectedEvent, selectedStage]);

  const fetchHeats = async (eventId: string, stage: string) => {
    setLoadingHeats(true);
    setStatusMessage('');
    try {
      const res = await fetch(`http://localhost:5000/api/schedule/heats/${eventId}?stage=${stage}`);
      const data = await res.json();
      if (res.ok) {
        setHeats(data.heats || []);
      }
    } catch (e) {
      console.warn('Failed to fetch heats:', e);
    } finally {
      setLoadingHeats(false);
    }
  };

  const handleGenerateDraw = async () => {
    if (!selectedEvent) return;
    setDrawingHeats(true);
    setStatusMessage('');
    try {
      const res = await fetch('http://localhost:5000/api/schedule/draw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Backend authenticate middleware allows requests with Bearer or internal
          Authorization: `Bearer admin-token`, // Using admin auth in real app or session
        },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          stage: selectedStage,
          numLanes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // If auth header fails, try via server action or direct RPC call
        setStatusMessage(data.error || 'Failed to generate heat draw');
      } else {
        setStatusMessage(`✅ Seeding complete! Generated ${data.draw?.num_heats} heats for ${data.draw?.total_athletes} athletes.`);
        fetchHeats(selectedEvent.id, selectedStage);
      }
    } catch (err: any) {
      setStatusMessage('Network error: ' + err.message);
    } finally {
      setDrawingHeats(false);
    }
  };

  const toggleCallRoom = async (heatAthleteId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`http://localhost:5000/api/schedule/call-room/${heatAthleteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer admin-token`,
        },
        body: JSON.stringify({ reported: !currentStatus }),
      });
      if (res.ok) {
        setHeats((prev) =>
          prev.map((h) => ({
            ...h,
            heat_athletes: h.heat_athletes.map((ha) =>
              ha.id === heatAthleteId ? { ...ha, call_room_reported: !currentStatus } : ha
            ),
          }))
        );
      }
    } catch (e) {}
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Sessions Timetable Overview (Hidden on print) */}
      <div className="glass-panel no-print" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📅</span> Championship Sessions &amp; Order of Events
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {sessions.map((session) => (
            <div
              key={session.id}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '1rem',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 700 }}>
                {session.session_date} • {session.start_time.slice(0, 5)} - {session.end_time?.slice(0, 5)}
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0.25rem 0 0.75rem 0', color: '#fff' }}>
                {session.session_name}
              </h3>

              {session.schedule_items?.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No events scheduled yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {session.schedule_items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedEvent(item.events);
                        setSelectedStage(item.stage);
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: selectedEvent?.id === item.events.id ? 'rgba(56, 189, 248, 0.15)' : 'rgba(0,0,0,0.2)',
                        border: selectedEvent?.id === item.events.id ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>
                          {item.events.name}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Time: {item.scheduled_time.slice(0, 5)} • Stage: {item.stage}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: item.status === 'COMPLETED' ? '#065f46' : '#1e3a8a',
                          color: '#fff',
                        }}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Heat Draw Generator Control Bar */}
      <div
        className="glass-panel no-print"
        style={{
          padding: '1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Select Event:
            </label>
            <select
              className="input-field"
              value={selectedEvent?.id || ''}
              onChange={(e) => {
                const ev = events.find((x) => x.id === e.target.value);
                if (ev) setSelectedEvent(ev);
              }}
              style={{ minWidth: '240px' }}
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.gender.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Stage:
            </label>
            <select
              className="input-field"
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
            >
              <option value="HEATS">Heats / Prelims</option>
              <option value="SEMI_FINAL">Semi-Finals</option>
              <option value="FINAL">Final</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Lanes:
            </label>
            <select
              className="input-field"
              value={numLanes}
              onChange={(e) => setNumLanes(parseInt(e.target.value, 10))}
              style={{ width: '80px' }}
            >
              <option value={8}>8</option>
              <option value={6}>6</option>
              <option value={9}>9</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleGenerateDraw}
            disabled={drawingHeats || !selectedEvent}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span>⚡</span> {drawingHeats ? 'Computing Seeding...' : 'Run Serpentine Heat Draw →'}
          </button>

          {heats.length > 0 && (
            <button
              onClick={handlePrint}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <span>🖨️</span> Print Heat Sheets
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div
          className="no-print"
          style={{
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            background: statusMessage.startsWith('✅') ? '#064e3b' : '#7f1d1d',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.95rem',
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* Heat Sheets Display */}
      {loadingHeats ? (
        <div className="glass-panel text-center" style={{ padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading heat rosters...</p>
        </div>
      ) : heats.length === 0 ? (
        <div className="glass-panel text-center" style={{ padding: '3rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏁</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>No Heats Drawn Yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem', marginBottom: '1.5rem' }}>
            Click &quot;Run Serpentine Heat Draw&quot; above to automatically seat accredited athletes into heats and lanes.
          </p>
        </div>
      ) : (
        <div className="heats-container">
          {/* Print Sheet Header */}
          <div className="print-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '6px', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 900 }}>VTU INTER-COLLEGIATE ATHLETICS CHAMPIONSHIPS 2026</div>
                <div style={{ fontSize: '13px', fontWeight: 700 }}>
                  OFFICIAL START LIST — {selectedEvent?.name?.toUpperCase()} ({selectedStage})
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', fontWeight: 700 }}>8-LANE SYNTHETIC TRACK</div>
                <div style={{ fontSize: '11px' }}>World Athletics Rule 166.4 Seeding</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '1.5rem' }}>
            {heats.map((heat) => {
              // Sort athletes by lane number
              const sortedAthletes = [...heat.heat_athletes].sort((a, b) => a.lane_number - b.lane_number);

              return (
                <div key={heat.id} className="heat-card glass-panel" style={{ padding: '1.5rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid var(--border-color)',
                      paddingBottom: '0.75rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 800 }}>
                        {selectedEvent?.name} • {selectedStage}
                      </span>
                      <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>
                        HEAT {heat.heat_number}
                      </h3>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          background: '#1e3a8a',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          padding: '3px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        {heat.status}
                      </span>
                      {heat.wind_reading !== null && (
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '3px' }}>
                          Wind: {heat.wind_reading > 0 ? `+${heat.wind_reading}` : heat.wind_reading} m/s
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lane Table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '6px 8px', width: '50px' }}>Lane</th>
                          <th style={{ padding: '6px 8px', width: '65px' }}>Bid #</th>
                          <th style={{ padding: '6px 8px' }}>Athlete / College</th>
                          <th style={{ padding: '6px 8px', textAlign: 'center', width: '80px' }}>Call Room</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedAthletes.map((ha) => {
                          const athlete = ha.profiles;
                          const relay = ha.relay_teams;
                          const collegeName = athlete?.squads?.colleges?.name || relay?.squads?.colleges?.name || '---';
                          const collegeCode = athlete?.squads?.colleges?.code || relay?.squads?.colleges?.code || '';
                          const isPremiumLane = [4, 5].includes(ha.lane_number);

                          return (
                            <tr
                              key={ha.id}
                              style={{
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                background: isPremiumLane ? 'rgba(56, 189, 248, 0.05)' : undefined,
                              }}
                            >
                              <td style={{ padding: '8px', fontWeight: 900, color: isPremiumLane ? '#38bdf8' : '#fff', fontSize: '1rem' }}>
                                {ha.lane_number}
                              </td>
                              <td style={{ padding: '8px', fontWeight: 800, color: 'var(--accent-gold)' }}>
                                #{athlete?.bid_number || '---'}
                              </td>
                              <td style={{ padding: '8px' }}>
                                <div style={{ fontWeight: 700, color: '#fff' }}>
                                  {athlete?.sslc_name || (relay ? `${collegeCode} Relay Team` : 'Vacant')}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  {collegeName} {athlete?.usn ? `(${athlete.usn})` : ''}
                                </div>
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={ha.call_room_reported}
                                  onChange={() => toggleCallRoom(ha.id, ha.call_room_reported)}
                                  style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                  title="Mark Reported in Call Room"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Embedded Print CSS */}
      <style jsx global>{`
        .print-header {
          display: none;
        }

        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }

          .no-print {
            display: none !important;
          }

          .print-header {
            display: block !important;
          }

          #admin-schedule-container {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .heats-container {
            display: block !important;
          }

          .heat-card {
            background: #ffffff !important;
            color: #000000 !important;
            border: 1.5px solid #000000 !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            margin-bottom: 20px !important;
          }

          .heat-card h3 {
            color: #000000 !important;
          }

          table {
            color: #000000 !important;
          }

          th {
            color: #333333 !important;
            border-bottom: 1.5px solid #000000 !important;
          }

          td {
            color: #000000 !important;
            border-bottom: 1px solid #cccccc !important;
          }
        }
      `}</style>
    </div>
  );
}
