'use client';

import React, { useState, useEffect } from 'react';

interface Athlete {
  id: string; // heat_athlete_id
  lane_number: number;
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
  field_attempts?: Array<{
    id: string;
    round_number: number;
    attempt_type: string;
    mark_meters: number;
    wind_reading: number;
  }>;
  vertical_jump_attempts?: Array<{
    id: string;
    bar_height_meters: number;
    attempt_number: number;
    result: string;
  }>;
  track_results?: Array<{
    id: string;
    time_seconds: number;
    reaction_time_ms: number;
    wind_reading: number;
    status: string;
    dq_rule: string;
  }>;
}

interface Heat {
  id: string;
  heat_number: number;
  stage: string;
  status: string;
  wind_reading?: number;
  events: {
    id: string;
    name: string;
    code: string;
    gender: string;
    category: string;
    measurement_unit: string;
  };
}

export default function RefereeDeskPage() {
  const [token, setToken] = useState<string>('');
  const [pin, setPin] = useState<string>('1234');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [judgeName, setJudgeName] = useState<string>('');

  // Mode: 'field' or 'track'
  const [disciplineMode, setDisciplineMode] = useState<'track' | 'field'>('track');

  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [heats, setHeats] = useState<any[]>([]);
  const [selectedHeatId, setSelectedHeatId] = useState<string>('');

  const [heat, setHeat] = useState<Heat | null>(null);
  const [isVertical, setIsVertical] = useState<boolean>(false);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Horizontal attempt entry state
  const [activeAthleteId, setActiveAthleteId] = useState<string>('');
  const [activeRound, setActiveRound] = useState<number>(1);
  const [markInput, setMarkInput] = useState<string>('');
  const [windInput, setWindInput] = useState<string>('');
  const [attemptType, setAttemptType] = useState<string>('VALID');

  // Track timing inputs state: athleteId -> { timeSeconds, reactionMs, status, dqRule }
  const [trackInputs, setTrackInputs] = useState<Record<string, {
    timeSeconds: string;
    reactionMs: string;
    status: string;
    dqRule: string;
  }>>({});

  // Vertical jump bar height state
  const [barHeights, setBarHeights] = useState<number[]>([1.60, 1.65, 1.70, 1.75, 1.80, 1.85]);
  const [newBarHeight, setNewBarHeight] = useState<string>('1.90');

  useEffect(() => {
    if (isLoggedIn && token) {
      loadEvents();
    }
  }, [isLoggedIn, token]);

  useEffect(() => {
    if (allEvents.length > 0) {
      const filtered = allEvents.filter((e) =>
        disciplineMode === 'track'
          ? (e.category.startsWith('track') || e.category === 'relay')
          : e.category.startsWith('field')
      );
      if (filtered.length > 0) {
        setSelectedEventId(filtered[0].id);
      } else {
        setSelectedEventId('');
      }
    }
  }, [disciplineMode, allEvents]);

  useEffect(() => {
    if (selectedEventId) {
      loadEventHeats(selectedEventId);
    }
  }, [selectedEventId]);

  useEffect(() => {
    if (selectedHeatId && token) {
      if (disciplineMode === 'track') {
        loadTrackHeat(selectedHeatId);
      } else {
        loadFieldHeat(selectedHeatId);
      }
    }
  }, [selectedHeatId, token, disciplineMode]);

  const loadEvents = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/events');
      const data = await res.json();
      if (res.ok) {
        setAllEvents(data.events || []);
      }
    } catch (e) {}
  };

  const loadEventHeats = async (eventId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/schedule/heats/${eventId}`);
      const data = await res.json();
      if (res.ok && data.heats?.length > 0) {
        setHeats(data.heats);
        setSelectedHeatId(data.heats[0].id);
      } else {
        setHeats([]);
        setSelectedHeatId('');
        setHeat(null);
        setAthletes([]);
      }
    } catch (e) {}
  };

  const loadTrackHeat = async (heatId: string) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`http://localhost:5000/api/track/heats/${heatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setHeat(data.heat);
        setAthletes(data.athletes || []);
        // Initialize trackInputs
        const initialMap: any = {};
        (data.athletes || []).forEach((a: Athlete) => {
          const r = a.track_results?.[0];
          initialMap[a.id] = {
            timeSeconds: r?.time_seconds ? r.time_seconds.toString() : '',
            reactionMs: r?.reaction_time_ms ? r.reaction_time_ms.toString() : '',
            status: r?.status || 'FINISHED',
            dqRule: r?.dq_rule || '',
          };
        });
        setTrackInputs(initialMap);
      } else {
        setErrorMessage(data.error || 'Failed to load track heat');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const loadFieldHeat = async (heatId: string) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [hRes, sRes] = await Promise.all([
        fetch(`http://localhost:5000/api/field/heats/${heatId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`http://localhost:5000/api/field/standings/${heatId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const hData = await hRes.json();
      if (hRes.ok) {
        setHeat(hData.heat);
        setIsVertical(hData.isVertical);
        setAthletes(hData.athletes || []);
        if (hData.athletes?.length > 0 && !activeAthleteId) {
          setActiveAthleteId(hData.athletes[0].id);
        }
      }

      const sData = await sRes.json();
      if (sRes.ok) {
        setStandings(sData.standings || []);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load field heat');
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
        body: JSON.stringify({ role: 'referee', pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to authenticate');
        return;
      }
      setToken(data.token);
      setJudgeName(data.staff?.displayName || 'Referee');
      setIsLoggedIn(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error');
    }
  };

  const handleSaveTrackResult = async (athleteId: string) => {
    const input = trackInputs[athleteId];
    if (!input) return;

    try {
      const res = await fetch('http://localhost:5000/api/track/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          heatAthleteId: athleteId,
          timeSeconds: input.timeSeconds || null,
          reactionTimeMs: input.reactionMs || null,
          status: input.status,
          dqRule: input.dqRule,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to save time');
      } else {
        setSuccessMessage(`✓ Saved result for athlete in lane`);
        loadTrackHeat(selectedHeatId);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const handleFinalizeHeat = async () => {
    if (!heat || !confirm('Finalize this heat? Official times will be locked and points awarded.')) {
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/track/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          heatId: heat.id,
          eventId: heat.events?.id,
          stage: heat.stage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to finalize heat');
      } else {
        setSuccessMessage('🏆 Heat finalized successfully! Championship standings updated.');
        loadTrackHeat(selectedHeatId);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const handleAdvanceQualifiers = async () => {
    if (!heat || !confirm('Run World Athletics round progression? Top finishers and fastest times will be seeded into the Final.')) {
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/track/qualify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId: heat.events?.id,
          currentStage: heat.stage,
          nextStage: 'FINAL',
          autoQPerHeat: 3,
          timeQTotal: 2,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to advance qualifiers');
      } else {
        alert(`Success! Generated Final heat with ${data.result?.total_qualified} qualified athletes (${data.result?.auto_qualified_count} 'Q' + ${data.result?.time_qualified_count} 'q').`);
        loadEventHeats(heat.events?.id);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const handleRecordFieldAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAthleteId) return;

    try {
      const res = await fetch('http://localhost:5000/api/field/attempt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          heatAthleteId: activeAthleteId,
          roundNumber: activeRound,
          attemptType,
          markMeters: attemptType === 'VALID' ? markInput : null,
          windReading: windInput || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to record attempt');
      } else {
        setMarkInput('');
        setWindInput('');
        loadFieldHeat(selectedHeatId);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const toggleVerticalAttempt = async (
    heatAthleteId: string,
    barHeight: number,
    attemptNumber: number,
    currentResult?: string
  ) => {
    let nextResult = 'O';
    if (currentResult === 'O') nextResult = 'X';
    else if (currentResult === 'X') nextResult = '-';
    else if (currentResult === '-') nextResult = 'O';

    try {
      const res = await fetch('http://localhost:5000/api/field/vertical-attempt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          heatAthleteId,
          barHeight,
          attemptNumber,
          result: nextResult,
        }),
      });

      if (res.ok) {
        loadFieldHeat(selectedHeatId);
      }
    } catch (e) {}
  };

  const addBarHeight = () => {
    const val = parseFloat(newBarHeight);
    if (!isNaN(val) && !barHeights.includes(val)) {
      setBarHeights([...barHeights, val].sort((a, b) => a - b));
      setNewBarHeight((val + 0.05).toFixed(2));
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="container" style={{ maxWidth: '440px', marginTop: '4rem' }}>
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏱️</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Official Track &amp; Field Referee Desk
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Judge &amp; Referee Passcode Login
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
                placeholder="Enter Referee PIN (Default: 1234)"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={6}
                style={{ fontSize: '1.4rem', letterSpacing: '4px' }}
                autoFocus
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Unlock Official Desk →
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filteredEvents = allEvents.filter((e) =>
    disciplineMode === 'track'
      ? (e.category.startsWith('track') || e.category === 'relay')
      : e.category.startsWith('field')
  );

  return (
    <div className="container" id="referee-desk-container">
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
            World Athletics Official Judging &amp; Timing Desk
          </span>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.2rem' }}>
            Track Photo Finish &amp; Field Scoring Station
          </h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Chief Official: <strong style={{ color: '#fff' }}>{judgeName}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Discipline Mode Tabs */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '8px' }}>
            <button
              onClick={() => setDisciplineMode('track')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                background: disciplineMode === 'track' ? '#2563eb' : 'transparent',
                color: '#fff',
              }}
            >
              ⏱️ Track Events
            </button>
            <button
              onClick={() => setDisciplineMode('field')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                background: disciplineMode === 'field' ? '#059669' : 'transparent',
                color: '#fff',
              }}
            >
              📐 Field Events
            </button>
          </div>

          <button
            onClick={() => setIsLoggedIn(false)}
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
          >
            Lock Desk
          </button>
        </div>
      </div>

      {/* Event & Flight Selector */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
            Select {disciplineMode === 'track' ? 'Track Race' : 'Field Discipline'}:
          </label>
          <select
            className="input-field"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            style={{ minWidth: '240px' }}
          >
            {filteredEvents.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.gender.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {heats.length > 0 && (
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
              Heat / Round:
            </label>
            <select
              className="input-field"
              value={selectedHeatId}
              onChange={(e) => setSelectedHeatId(e.target.value)}
            >
              {heats.map((h) => (
                <option key={h.id} value={h.id}>
                  Heat {h.heat_number} ({h.stage})
                </option>
              ))}
            </select>
          </div>
        )}

        {heat && disciplineMode === 'track' && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
            {heat.stage === 'HEATS' && (
              <button
                onClick={handleAdvanceQualifiers}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                Advance Qualifiers (Q + q) →
              </button>
            )}
            <button
              onClick={handleFinalizeHeat}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
            >
              ✓ Finalize &amp; Award Points
            </button>
          </div>
        )}
      </div>

      {successMessage && (
        <div style={{ background: '#064e3b', color: '#6ee7b7', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.5rem', fontWeight: 600 }}>
          {successMessage}
        </div>
      )}

      {/* Main Mode Rendering */}
      {loading ? (
        <div className="glass-panel text-center" style={{ padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading participants and scores...</p>
        </div>
      ) : disciplineMode === 'track' ? (
        /* TRACK EVENTS TIMING & PHOTO FINISH INTERFACE */
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>
                Track Photo-Finish &amp; Electronic Timing Sheet ({heat?.events?.name} - Heat {heat?.heat_number})
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Rule TR 16.8 False Start automatically flagged if reaction time &lt; 100ms.
              </p>
            </div>
            <span
              style={{
                background: heat?.status === 'COMPLETED' ? '#065f46' : '#1e3a8a',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px',
              }}
            >
              STATUS: {heat?.status}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ padding: '8px', width: '50px' }}>Lane</th>
                  <th style={{ padding: '8px', width: '65px' }}>Bid #</th>
                  <th style={{ padding: '8px' }}>Athlete / College</th>
                  <th style={{ padding: '8px', width: '130px' }}>Reaction Time (ms)</th>
                  <th style={{ padding: '8px', width: '150px' }}>Finish Time (sec)</th>
                  <th style={{ padding: '8px', width: '140px' }}>Status</th>
                  <th style={{ padding: '8px', textAlign: 'right', width: '90px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {athletes.map((ath) => {
                  const input = trackInputs[ath.id] || { timeSeconds: '', reactionMs: '', status: 'FINISHED', dqRule: '' };
                  const isFalseStart = input.reactionMs && parseInt(input.reactionMs, 10) < 100;

                  return (
                    <tr key={ath.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px', fontWeight: 900, color: '#38bdf8', fontSize: '1.1rem' }}>
                        {ath.lane_number}
                      </td>
                      <td style={{ padding: '8px', fontWeight: 800, color: 'var(--accent-gold)' }}>
                        #{ath.profiles?.bid_number || '---'}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <div style={{ fontWeight: 700, color: '#fff' }}>
                          {ath.profiles?.sslc_name || ath.relay_teams?.squads?.colleges?.code}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {ath.profiles?.squads?.colleges?.name}
                        </div>
                      </td>

                      <td style={{ padding: '8px' }}>
                        <input
                          type="number"
                          className="input-field"
                          placeholder="e.g. 145"
                          value={input.reactionMs}
                          onChange={(e) =>
                            setTrackInputs({
                              ...trackInputs,
                              [ath.id]: { ...input, reactionMs: e.target.value },
                            })
                          }
                          style={{
                            width: '110px',
                            borderColor: isFalseStart ? '#ef4444' : undefined,
                            color: isFalseStart ? '#ef4444' : '#fff',
                          }}
                        />
                        {isFalseStart && (
                          <div style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 700 }}>
                            ⚠️ False Start (&lt;100ms)
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '8px' }}>
                        <input
                          type="number"
                          step="0.001"
                          className="input-field"
                          placeholder="e.g. 10.420"
                          value={input.timeSeconds}
                          onChange={(e) =>
                            setTrackInputs({
                              ...trackInputs,
                              [ath.id]: { ...input, timeSeconds: e.target.value },
                            })
                          }
                          style={{ width: '130px', fontWeight: 800 }}
                        />
                      </td>

                      <td style={{ padding: '8px' }}>
                        <select
                          className="input-field"
                          value={input.status}
                          onChange={(e) =>
                            setTrackInputs({
                              ...trackInputs,
                              [ath.id]: { ...input, status: e.target.value },
                            })
                          }
                          style={{ width: '120px', fontSize: '0.8rem' }}
                        >
                          <option value="FINISHED">FINISHED</option>
                          <option value="DNF">DNF (Did Not Finish)</option>
                          <option value="DQ">DQ (Disqualified)</option>
                          <option value="DNS">DNS (Did Not Start)</option>
                        </select>
                      </td>

                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleSaveTrackResult(ath.id)}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : isVertical ? (
        /* VERTICAL JUMPS: HIGH JUMP & POLE VAULT COUNTBACK MATRIX */
        <div>
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>
                  Vertical Bar Progression Matrix ({heat?.events?.name})
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Click an attempt box to toggle: <strong style={{ color: '#10b981' }}>O (Cleared)</strong> • <strong style={{ color: '#ef4444' }}>X (Failed)</strong> • <strong style={{ color: '#94a3b8' }}>- (Passed)</strong>
                </p>
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  type="number"
                  step="0.01"
                  className="input-field"
                  value={newBarHeight}
                  onChange={(e) => setNewBarHeight(e.target.value)}
                  style={{ width: '80px', padding: '4px 8px', fontSize: '0.85rem' }}
                />
                <button onClick={addBarHeight} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                  + Add Height
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '8px', textAlign: 'left', width: '50px' }}>Ord</th>
                    <th style={{ padding: '8px', textAlign: 'left', width: '60px' }}>Bid #</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Athlete</th>
                    {barHeights.map((ht) => (
                      <th key={ht} style={{ padding: '8px', textAlign: 'center', minWidth: '70px', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                        {ht.toFixed(2)}m
                      </th>
                    ))}
                    <th style={{ padding: '8px', textAlign: 'center', borderLeft: '1px solid var(--border-color)' }}>Best</th>
                  </tr>
                </thead>
                <tbody>
                  {athletes.map((ath) => {
                    const attempts = ath.vertical_jump_attempts || [];
                    const clearedHeights = attempts.filter((a) => a.result === 'O').map((a) => a.bar_height_meters);
                    const bestHeight = clearedHeights.length > 0 ? Math.max(...clearedHeights) : null;

                    return (
                      <tr key={ath.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '8px', fontWeight: 800, color: '#38bdf8' }}>{ath.lane_number}</td>
                        <td style={{ padding: '8px', fontWeight: 800, color: 'var(--accent-gold)' }}>#{ath.profiles?.bid_number}</td>
                        <td style={{ padding: '8px' }}>
                          <div style={{ fontWeight: 700, color: '#fff' }}>{ath.profiles?.sslc_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{ath.profiles?.squads?.colleges?.code}</div>
                        </td>

                        {barHeights.map((ht) => {
                          const att1 = attempts.find((a) => a.bar_height_meters === ht && a.attempt_number === 1)?.result;
                          const att2 = attempts.find((a) => a.bar_height_meters === ht && a.attempt_number === 2)?.result;
                          const att3 = attempts.find((a) => a.bar_height_meters === ht && a.attempt_number === 3)?.result;

                          return (
                            <td key={ht} style={{ padding: '4px', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                                {[1, 2, 3].map((num) => {
                                  const res = num === 1 ? att1 : num === 2 ? att2 : att3;
                                  return (
                                    <div
                                      key={num}
                                      onClick={() => toggleVerticalAttempt(ath.id, ht, num, res)}
                                      style={{
                                        width: '20px',
                                        height: '24px',
                                        borderRadius: '3px',
                                        background: res === 'O' ? '#065f46' : res === 'X' ? '#991b1b' : res === '-' ? '#334155' : 'rgba(255,255,255,0.05)',
                                        color: '#fff',
                                        fontWeight: 900,
                                        fontSize: '11px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {res || '·'}
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          );
                        })}

                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 900, color: '#10b981', fontSize: '1rem', borderLeft: '1px solid var(--border-color)' }}>
                          {bestHeight ? `${bestHeight.toFixed(2)}m` : 'NH'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* THROWS & HORIZONTAL JUMPS: 6 ROUNDS ENTRY */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1rem', color: '#fff' }}>
              Horizontal Flight Scorecard ({heat?.events?.name})
            </h2>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '8px', textAlign: 'left', width: '50px' }}>Ord</th>
                    <th style={{ padding: '8px', textAlign: 'left', width: '60px' }}>Bid #</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Athlete</th>
                    {[1, 2, 3, 4, 5, 6].map((r) => (
                      <th key={r} style={{ padding: '8px', textAlign: 'center', width: '65px' }}>R{r}</th>
                    ))}
                    <th style={{ padding: '8px', textAlign: 'center', borderLeft: '1px solid var(--border-color)' }}>Best</th>
                  </tr>
                </thead>
                <tbody>
                  {athletes.map((ath) => {
                    const attempts = ath.field_attempts || [];
                    const validMarks = attempts.filter((a) => a.attempt_type === 'VALID').map((a) => a.mark_meters);
                    const bestMark = validMarks.length > 0 ? Math.max(...validMarks) : null;
                    const isSelected = ath.id === activeAthleteId;

                    return (
                      <tr
                        key={ath.id}
                        onClick={() => setActiveAthleteId(ath.id)}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          background: isSelected ? 'rgba(56, 189, 248, 0.08)' : undefined,
                          cursor: 'pointer',
                        }}
                      >
                        <td style={{ padding: '8px', fontWeight: 800, color: '#38bdf8' }}>{ath.lane_number}</td>
                        <td style={{ padding: '8px', fontWeight: 800, color: 'var(--accent-gold)' }}>#{ath.profiles?.bid_number}</td>
                        <td style={{ padding: '8px' }}>
                          <div style={{ fontWeight: 700, color: '#fff' }}>{ath.profiles?.sslc_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{ath.profiles?.squads?.colleges?.code}</div>
                        </td>

                        {[1, 2, 3, 4, 5, 6].map((round) => {
                          const att = attempts.find((a) => a.round_number === round);
                          return (
                            <td key={round} style={{ padding: '8px', textAlign: 'center' }}>
                              {att ? (
                                <span
                                  style={{
                                    fontWeight: 700,
                                    color: att.attempt_type === 'VALID' ? '#fff' : att.attempt_type === 'FOUL' ? '#ef4444' : '#94a3b8',
                                  }}
                                >
                                  {att.attempt_type === 'VALID' ? att.mark_meters.toFixed(2) : att.attempt_type === 'FOUL' ? 'X' : '-'}
                                </span>
                              ) : (
                                <span style={{ color: 'rgba(255,255,255,0.1)' }}>—</span>
                              )}
                            </td>
                          );
                        })}

                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 900, color: '#10b981', fontSize: '1rem', borderLeft: '1px solid var(--border-color)' }}>
                          {bestMark ? `${bestMark.toFixed(2)}m` : 'NM'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Mark Recording Panel */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>
              Record Attempt
            </h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Athlete: <strong style={{ color: '#fff' }}>{athletes.find((a) => a.id === activeAthleteId)?.profiles?.sslc_name || 'Select above'}</strong>
            </div>

            <form onSubmit={handleRecordFieldAttempt}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  Round:
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[1, 2, 3, 4, 5, 6].map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setActiveRound(r)}
                      style={{
                        flex: 1,
                        padding: '6px 0',
                        borderRadius: '4px',
                        background: activeRound === r ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-color)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                      }}
                    >
                      R{r}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  Attempt Result:
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['VALID', 'FOUL', 'PASS'].map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setAttemptType(t)}
                      style={{
                        flex: 1,
                        padding: '6px 0',
                        borderRadius: '4px',
                        background: attemptType === t ? (t === 'VALID' ? '#065f46' : t === 'FOUL' ? '#991b1b' : '#334155') : 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-color)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {attemptType === 'VALID' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                    Distance / Mark (meters):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field"
                    placeholder="e.g. 7.42"
                    value={markInput}
                    onChange={(e) => setMarkInput(e.target.value)}
                    required
                    autoFocus
                    style={{ fontSize: '1.2rem', fontWeight: 800 }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  Wind (m/s) (Optional):
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="input-field"
                  placeholder="+1.4"
                  value={windInput}
                  onChange={(e) => setWindInput(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
                Submit Attempt R{activeRound} →
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Standings Table for Field Events */}
      {disciplineMode === 'field' && standings.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🏆</span> Official Standings &amp; Countback Tie-Breakers (Rule TR 26.8)
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '8px', width: '50px' }}>Rank</th>
                  <th style={{ padding: '8px', width: '65px' }}>Bid #</th>
                  <th style={{ padding: '8px' }}>Athlete</th>
                  <th style={{ padding: '8px' }}>College</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Best Mark</th>
                  {isVertical ? (
                    <>
                      <th style={{ padding: '8px', textAlign: 'center' }}>Att @ Height</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>Total Failures</th>
                    </>
                  ) : (
                    <th style={{ padding: '8px', textAlign: 'right' }}>2nd Best (Tie-Break)</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {standings.map((st) => (
                  <tr key={st.heat_athlete_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px', fontWeight: 900, color: st.rank === 1 ? 'var(--accent-gold)' : st.rank === 2 ? '#cbd5e1' : st.rank === 3 ? '#b45309' : '#fff' }}>
                      {st.rank === 1 ? '🥇 1' : st.rank === 2 ? '🥈 2' : st.rank === 3 ? '🥉 3' : st.rank}
                    </td>
                    <td style={{ padding: '8px', fontWeight: 800, color: 'var(--accent-gold)' }}>#{st.bid_number}</td>
                    <td style={{ padding: '8px', fontWeight: 700 }}>{st.sslc_name}</td>
                    <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{st.college_name} ({st.college_code})</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 900, color: '#10b981', fontSize: '1rem' }}>
                      {st.best_mark ? `${st.best_mark}m` : 'NM'}
                    </td>
                    {isVertical ? (
                      <>
                        <td style={{ padding: '8px', textAlign: 'center' }}>{st.attempts_at_best === 99 ? '—' : st.attempts_at_best}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>{st.total_failures}</td>
                      </>
                    ) : (
                      <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {st.second_best_mark ? `${st.second_best_mark}m` : '—'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
