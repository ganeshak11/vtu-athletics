'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface LiveHeat {
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
  };
  heat_athletes: Array<{
    id: string;
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
    track_results?: Array<{
      time_seconds: number;
      reaction_time_ms: number;
      status: string;
      dq_rule: string;
    }>;
    field_attempts?: Array<{
      round_number: number;
      attempt_type: string;
      mark_meters: number;
    }>;
  }>;
}

export default function LiveArenaPage() {
  const [heats, setHeats] = useState<LiveHeat[]>([]);
  const [filter, setFilter] = useState<'all' | 'track' | 'field'>('all');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchLiveFeed();
    const interval = setInterval(fetchLiveFeed, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchLiveFeed = async () => {
    try {
      // Fetch all heats
      const res = await fetch('http://localhost:5000/api/live/heats');
      if (res.ok) {
        const data = await res.json();
        setHeats(data.heats || []);
      } else {
        // Fallback: fetch from public sessions
        const sRes = await fetch('http://localhost:5000/api/schedule/sessions');
        const sData = await sRes.json();
        if (sData.sessions?.length > 0) {
          // Flatten items
          const items: any[] = [];
          sData.sessions.forEach((s: any) => {
            (s.schedule_items || []).forEach((item: any) => {
              if (item.events) items.push(item);
            });
          });
        }
      }
      setLastUpdated(new Date());
    } catch (e) {
      console.warn('Live feed offline:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredHeats = heats.filter((h) => {
    if (filter === 'track') return h.events?.category?.startsWith('track') || h.events?.category === 'relay';
    if (filter === 'field') return h.events?.category?.startsWith('field');
    return true;
  });

  return (
    <div className="container" id="live-arena-container">
      {/* Live Stadium Header */}
      <div style={{ textAlign: 'center', padding: '2rem 1rem 1.5rem 1rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '4px 12px', borderRadius: '9999px', color: '#f87171', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '1px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.5s infinite' }}></span>
          LIVE STADIUM BROADCAST
        </div>

        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.4rem' }}>
          VTU Athletics Live Arena &amp; Track Results
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '640px', margin: '0 auto 1.5rem auto' }}>
          Real-time lane finishes, electronic reaction times, field flight attempts, and live qualifying updates streaming directly from track marshals.
        </p>

        {/* Filters and Status Bar */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '8px', gap: '4px' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                background: filter === 'all' ? '#2563eb' : 'transparent',
                color: '#fff',
              }}
            >
              All Events ({heats.length})
            </button>
            <button
              onClick={() => setFilter('track')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                background: filter === 'track' ? '#2563eb' : 'transparent',
                color: '#fff',
              }}
            >
              🏃 Track &amp; Relays
            </button>
            <button
              onClick={() => setFilter('field')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                background: filter === 'field' ? '#059669' : 'transparent',
                color: '#fff',
              }}
            >
              📐 Field Disciplines
            </button>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Updated: {lastUpdated.toLocaleTimeString()} (4s auto-refresh)
          </div>
        </div>
      </div>

      {/* Live Event Cards */}
      {loading ? (
        <div className="glass-panel text-center" style={{ padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Connecting to stadium timing feed...</p>
        </div>
      ) : filteredHeats.length === 0 ? (
        <div className="glass-panel text-center" style={{ padding: '3.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏟️</div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>No Active Track Events In Progress</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '480px', margin: '0.5rem auto 1.5rem auto' }}>
            Check back during scheduled session hours or view championship standings.
          </p>
          <Link href="/leaderboard" className="btn btn-primary">
            View Championship Leaderboard 🏆 →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          {filteredHeats.map((h) => {
            const isTrack = h.events?.category?.startsWith('track') || h.events?.category === 'relay';
            const sortedAthletes = [...(h.heat_athletes || [])].sort((a, b) => {
              if (isTrack) {
                const tA = a.track_results?.[0]?.time_seconds || 9999;
                const tB = b.track_results?.[0]?.time_seconds || 9999;
                return tA - tB;
              }
              return a.lane_number - b.lane_number;
            });

            return (
              <div
                key={h.id}
                className="glass-panel"
                style={{
                  padding: '1.5rem',
                  borderTop: h.status === 'COMPLETED' ? '3px solid #10b981' : h.status === 'ON_TRACK' ? '3px solid #f59e0b' : '3px solid #38bdf8',
                }}
              >
                {/* Heat Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 800 }}>
                      {h.events?.name} ({h.events?.gender?.toUpperCase()})
                    </span>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff' }}>
                      {h.stage} • Heat {h.heat_number}
                    </h3>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        background: h.status === 'COMPLETED' ? '#065f46' : h.status === 'ON_TRACK' ? '#92400e' : '#1e3a8a',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        padding: '3px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      {h.status === 'COMPLETED' ? '✓ OFFICIAL' : h.status === 'ON_TRACK' ? '⚡ ON TRACK' : h.status}
                    </span>
                    {h.wind_reading !== undefined && (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '3px' }}>
                        Wind: {h.wind_reading > 0 ? `+${h.wind_reading}` : h.wind_reading} m/s
                      </div>
                    )}
                  </div>
                </div>

                {/* Athletes Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '6px 8px', width: '45px' }}>{isTrack ? 'Pos' : 'Lane'}</th>
                        <th style={{ padding: '6px 8px', width: '55px' }}>Bid #</th>
                        <th style={{ padding: '6px 8px' }}>Athlete / College</th>
                        {isTrack ? (
                          <>
                            <th style={{ padding: '6px 8px', textAlign: 'center', width: '80px' }}>Reaction</th>
                            <th style={{ padding: '6px 8px', textAlign: 'right', width: '90px' }}>Time</th>
                          </>
                        ) : (
                          <th style={{ padding: '6px 8px', textAlign: 'right', width: '90px' }}>Best Mark</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedAthletes.map((ha, idx) => {
                        const ath = ha.profiles;
                        const relay = ha.relay_teams;
                        const tr = ha.track_results?.[0];
                        const fa = ha.field_attempts || [];
                        const validMarks = fa.filter((a) => a.attempt_type === 'VALID').map((a) => a.mark_meters);
                        const bestMark = validMarks.length > 0 ? Math.max(...validMarks) : null;
                        const hasFinished = tr?.status === 'FINISHED' && tr?.time_seconds;

                        return (
                          <tr key={ha.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '8px', fontWeight: 800, color: isTrack && idx === 0 && hasFinished ? 'var(--accent-gold)' : '#fff' }}>
                              {isTrack ? (hasFinished ? idx + 1 : `L${ha.lane_number}`) : ha.lane_number}
                            </td>
                            <td style={{ padding: '8px', fontWeight: 800, color: 'var(--accent-gold)' }}>
                              #{ath?.bid_number || '---'}
                            </td>
                            <td style={{ padding: '8px' }}>
                              <div style={{ fontWeight: 700, color: '#fff' }}>
                                {ath?.sslc_name || (relay ? 'Relay Team' : 'Vacant')}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {ath?.squads?.colleges?.name || relay?.squads?.colleges?.name}
                              </div>
                            </td>

                            {isTrack ? (
                              <>
                                <td style={{ padding: '8px', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
                                  {tr?.reaction_time_ms ? `${tr.reaction_time_ms}ms` : '—'}
                                </td>
                                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 900, color: hasFinished ? '#10b981' : tr?.status === 'DQ' ? '#ef4444' : '#fff', fontSize: '0.95rem' }}>
                                  {hasFinished ? `${tr.time_seconds.toFixed(3)}s` : tr?.status || '—'}
                                </td>
                              </>
                            ) : (
                              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 900, color: '#10b981', fontSize: '0.95rem' }}>
                                {bestMark ? `${bestMark.toFixed(2)}m` : '—'}
                              </td>
                            )}
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
      )}

      {/* Return Home */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <Link href="/" className="btn btn-secondary">
          ← Return to Home Portal
        </Link>
      </div>
    </div>
  );
}
