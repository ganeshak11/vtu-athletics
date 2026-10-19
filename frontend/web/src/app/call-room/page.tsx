'use client';

import React, { useState, useEffect } from 'react';

interface CallRoomAthlete {
  id: string;
  lane_number: number;
  call_room_reported: boolean;
  profiles?: {
    id: string;
    sslc_name: string;
    usn: string;
    bid_number: number;
    squads: {
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
  call_room_inspections?: Array<{
    id: string;
    reported_status: string;
    bib_affixed: boolean;
    spike_length_mm: number;
    uniform_approved: boolean;
    notes: string;
  }>;
}

interface Heat {
  id: string;
  heat_number: number;
  stage: string;
  status: string;
  events: {
    id: string;
    name: string;
    code: string;
    gender: string;
    category: string;
  };
}

export default function CallRoomPage() {
  const [token, setToken] = useState<string>('');
  const [pin, setPin] = useState<string>('1234');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [officialName, setOfficialName] = useState<string>('');

  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedHeatId, setSelectedHeatId] = useState<string>('');

  const [heat, setHeat] = useState<Heat | null>(null);
  const [athletes, setAthletes] = useState<CallRoomAthlete[]>([]);
  const [loading, setLoading] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Athlete inspection edit state
  const [selectedAthlete, setSelectedAthlete] = useState<CallRoomAthlete | null>(null);
  const [inspectStatus, setInspectStatus] = useState<string>('REPORTED');
  const [bibAffixed, setBibAffixed] = useState<boolean>(true);
  const [spikeLength, setSpikeLength] = useState<string>('9.0');
  const [uniformApproved, setUniformApproved] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (isLoggedIn && token) {
      loadSchedule();
    }
  }, [isLoggedIn, token]);

  useEffect(() => {
    if (selectedHeatId && token) {
      loadHeatDetails(selectedHeatId);
    }
  }, [selectedHeatId, token]);

  const loadSchedule = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/schedule/sessions');
      const data = await res.json();
      if (res.ok) {
        setSessions(data.sessions || []);
        // Find first available heat
        if (data.sessions?.length > 0 && data.sessions[0].schedule_items?.length > 0) {
          const firstEv = data.sessions[0].schedule_items[0].events;
          fetchEventHeats(firstEv.id);
        }
      }
    } catch (e) {}
  };

  const fetchEventHeats = async (eventId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/schedule/heats/${eventId}`);
      const data = await res.json();
      if (res.ok && data.heats?.length > 0) {
        setSelectedHeatId(data.heats[0].id);
      }
    } catch (e) {}
  };

  const loadHeatDetails = async (heatId: string) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`http://localhost:5000/api/callroom/heats/${heatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setHeat(data.heat);
        setAthletes(data.athletes || []);
      } else {
        setErrorMessage(data.error || 'Failed to load call room heat');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const res = await fetch('http://localhost:5000/api/auth/staff/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'call_room_official', pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to authenticate');
        return;
      }
      setToken(data.token);
      setOfficialName(data.staff?.displayName || 'Call Room Marshal');
      setIsLoggedIn(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error');
    }
  };

  const openInspection = (athlete: CallRoomAthlete) => {
    setSelectedAthlete(athlete);
    const existing = athlete.call_room_inspections?.[0];
    if (existing) {
      setInspectStatus(existing.reported_status);
      setBibAffixed(existing.bib_affixed);
      setSpikeLength(existing.spike_length_mm.toString());
      setUniformApproved(existing.uniform_approved);
      setNotes(existing.notes || '');
    } else {
      setInspectStatus('REPORTED');
      setBibAffixed(true);
      setSpikeLength('9.0');
      setUniformApproved(true);
      setNotes('');
    }
  };

  const handleSaveInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAthlete) return;

    try {
      const res = await fetch('http://localhost:5000/api/callroom/inspect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          heatAthleteId: selectedAthlete.id,
          reportedStatus: inspectStatus,
          bibAffixed,
          spikeLengthMm: parseFloat(spikeLength),
          uniformApproved,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Inspection rejected');
      } else {
        setSelectedAthlete(null);
        loadHeatDetails(selectedHeatId);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleAdvanceToTrack = async () => {
    if (!confirm('Advance heat to track? Any unreported athlete will be marked DNS.')) {
      return;
    }
    setAdvancing(true);
    setStatusMessage('');
    try {
      const res = await fetch(`http://localhost:5000/api/callroom/advance/${selectedHeatId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to advance heat');
      } else {
        setStatusMessage(`✅ Heat advanced to ON_TRACK! (${data.result?.reported_athletes} reported, ${data.result?.dns_athletes} DNS).`);
        loadHeatDetails(selectedHeatId);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error');
    } finally {
      setAdvancing(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="container" style={{ maxWidth: '440px', marginTop: '4rem' }}>
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏱️</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Call Room Marshaling Desk
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Call Room Official Passcode Login
          </p>

          {errorMessage && (
            <div style={{ background: '#7f1d1d', color: '#fecaca', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              {errorMessage}
            </div>
          )}

          <form onSubmit={handlePinLogin}>
            <div style={{ marginBottom: '1.5rem' }}>
              <input
                type="password"
                className="input-field text-center"
                placeholder="Enter Marshal PIN (Default: 1234)"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={6}
                style={{ fontSize: '1.4rem', letterSpacing: '4px' }}
                autoFocus
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Unlock Call Room Desk →
            </button>
          </form>
        </div>
      </div>
    );
  }

  const reportedCount = athletes.filter((a) => a.call_room_reported).length;

  return (
    <div className="container" id="call-room-container">
      {/* Top Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 700, textTransform: 'uppercase' }}>
            VTU Stadium • Call Room Area
          </span>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.2rem' }}>
            Athlete Check-in &amp; Spike Inspection Desk
          </h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Chief Marshal: <strong style={{ color: '#fff' }}>{officialName}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => setIsLoggedIn(false)}
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
          >
            Lock Desk
          </button>
        </div>
      </div>

      {/* Heat Status Summary Card */}
      {heat && (
        <div
          className="glass-panel"
          style={{
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            borderLeft: '4px solid var(--accent-cyan)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 800 }}>
              {heat.events?.name} ({heat.events?.gender?.toUpperCase()}) • {heat.stage}
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', marginTop: '2px' }}>
              HEAT {heat.heat_number}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>REPORTED</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#10b981' }}>
                {reportedCount} / {athletes.length}
              </div>
            </div>

            <button
              onClick={handleAdvanceToTrack}
              disabled={advancing || heat.status === 'ON_TRACK'}
              className="btn btn-primary"
              style={{
                background: heat.status === 'ON_TRACK' ? '#334155' : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                padding: '0.65rem 1.25rem',
              }}
            >
              {heat.status === 'ON_TRACK' ? '✓ Heat on Track' : 'Marshal Heat to Track →'}
            </button>
          </div>
        </div>
      )}

      {statusMessage && (
        <div style={{ background: '#064e3b', color: '#6ee7b7', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 600 }}>
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{ background: '#7f1d1d', color: '#fecaca', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Roster & Inspection Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: '#fff' }}>
          Call Room Roster &amp; Gear Inspection
        </h3>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading heat roster...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '8px', width: '60px' }}>Lane</th>
                  <th style={{ padding: '8px', width: '70px' }}>Bid #</th>
                  <th style={{ padding: '8px' }}>Athlete / College</th>
                  <th style={{ padding: '8px' }}>Bib &amp; Spikes</th>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {athletes.map((ha) => {
                  const athlete = ha.profiles;
                  const inspection = ha.call_room_inspections?.[0];
                  const isReported = ha.call_room_reported;

                  return (
                    <tr key={ha.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 900, color: '#38bdf8', fontSize: '1.1rem' }}>
                        {ha.lane_number}
                      </td>
                      <td style={{ padding: '10px 8px', fontWeight: 800, color: 'var(--accent-gold)' }}>
                        #{athlete?.bid_number || '---'}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ fontWeight: 700, color: '#fff' }}>{athlete?.sslc_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {athlete?.squads?.colleges?.name} ({athlete?.usn})
                        </div>
                      </td>
                      <td style={{ padding: '10px 8px', fontSize: '0.8rem' }}>
                        {inspection ? (
                          <div>
                            <span style={{ color: inspection.bib_affixed ? '#10b981' : '#ef4444' }}>
                              Bib: {inspection.bib_affixed ? '✓ OK' : '✗ Missing'}
                            </span>{' '}
                            •{' '}
                            <span style={{ color: inspection.spike_length_mm <= 9.0 ? '#10b981' : '#f59e0b' }}>
                              Spikes: {inspection.spike_length_mm}mm
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>Pending check</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <span
                          style={{
                            background: isReported ? '#064e3b' : inspection?.reported_status === 'DNS' ? '#7f1d1d' : '#334155',
                            color: isReported ? '#6ee7b7' : '#f8fafc',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            padding: '3px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          {inspection?.reported_status || (isReported ? 'REPORTED' : 'AWAITING')}
                        </span>
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                        <button
                          onClick={() => openInspection(ha)}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                        >
                          Inspect Gear 🔍
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Inspection Dialog */}
      {selectedAthlete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.25rem', color: '#fff' }}>
              Inspect Gear: {selectedAthlete.profiles?.sslc_name}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Lane {selectedAthlete.lane_number} • Bid #{selectedAthlete.profiles?.bid_number} • {selectedAthlete.profiles?.squads?.colleges?.name}
            </p>

            <form onSubmit={handleSaveInspection}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Call Room Attendance Status:
                </label>
                <select
                  className="input-field"
                  value={inspectStatus}
                  onChange={(e) => setInspectStatus(e.target.value)}
                >
                  <option value="REPORTED">Present &amp; Reported (Ready to Race)</option>
                  <option value="SCRATCH">Withdrawn / Scratch</option>
                  <option value="DNS">DNS (Did Not Start)</option>
                  <option value="DISQUALIFIED">Disqualified (Kit / Infraction)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Spike Length (mm):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    max="12"
                    min="3"
                    className="input-field"
                    value={spikeLength}
                    onChange={(e) => setSpikeLength(e.target.value)}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Max 9mm track / 12mm HJ</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Checks:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={bibAffixed}
                        onChange={(e) => setBibAffixed(e.target.checked)}
                      />
                      Bibs Affixed OK
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={uniformApproved}
                        onChange={(e) => setUniformApproved(e.target.checked)}
                      />
                      Uniform Approved
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Inspection Notes:
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Spikes verified with gauge, yellow bib affixed"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedAthlete(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Inspection ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
