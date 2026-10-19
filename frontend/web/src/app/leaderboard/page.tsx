'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface CollegeStanding {
  rank: number;
  college_id: string;
  college_name: string;
  college_code: string;
  district?: string;
  total_points: number;
  golds: number;
  silvers: number;
  bronzes: number;
}

export default function LeaderboardPage() {
  const [division, setDivision] = useState<'combined' | 'mens' | 'womens'>('combined');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    combined: CollegeStanding[];
    mens: CollegeStanding[];
    womens: CollegeStanding[];
  }>({
    combined: [],
    mens: [],
    womens: [],
  });

  useEffect(() => {
    fetchStandings();
    const interval = setInterval(fetchStandings, 8000);
    return () => clearInterval(interval);
  }, []);

  const fetchStandings = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/leaderboard/standings');
      const json = await res.json();
      if (res.ok && json.success) {
        setData({
          combined: json.combined || [],
          mens: json.mens || [],
          womens: json.womens || [],
        });
      }
    } catch (e) {
      console.warn('Failed to fetch standings:', e);
    } finally {
      setLoading(false);
    }
  };

  const currentList = data[division] || [];

  const filteredList = currentList.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.college_name.toLowerCase().includes(q) ||
      c.college_code.toLowerCase().includes(q) ||
      (c.district && c.district.toLowerCase().includes(q))
    );
  });

  const podium = currentList.slice(0, 3);

  return (
    <div className="container" id="leaderboard-page-container">
      {/* Hero Header */}
      <div style={{ textAlign: 'center', padding: '2rem 1rem 1.5rem 1rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏆</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
          Official VTU Athletics Meet 2026
        </div>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 900, marginTop: '0.25rem', marginBottom: '0.5rem' }}>
          Championship Points Table &amp; Medal Tally
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '640px', margin: '0 auto 1.5rem auto' }}>
          Points scored: 1st (7 pts), 2nd (5 pts), 3rd (4 pts), 4th (3 pts), 5th (2 pts), 6th (1 pt). Relays count 2x double points.
        </p>

        {/* Division Selector Tabs */}
        <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '10px', gap: '4px' }}>
          <button
            onClick={() => setDivision('combined')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.9rem',
              background: division === 'combined' ? 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' : 'transparent',
              color: '#fff',
              transition: 'all 0.2s',
            }}
          >
            🏆 General Trophy (Combined)
          </button>
          <button
            onClick={() => setDivision('mens')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.9rem',
              background: division === 'mens' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'transparent',
              color: '#fff',
              transition: 'all 0.2s',
            }}
          >
            🚹 Men&apos;s Division
          </button>
          <button
            onClick={() => setDivision('womens')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.9rem',
              background: division === 'womens' ? 'linear-gradient(135deg, #be185d 0%, #9d174d 100%)' : 'transparent',
              color: '#fff',
              transition: 'all 0.2s',
            }}
          >
            🚺 Women&apos;s Division
          </button>
        </div>
      </div>

      {/* Podium Cards (Top 3) */}
      {podium.length > 0 && podium[0].total_points > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          {/* 1st Place Gold */}
          <div
            className="glass-panel"
            style={{
              padding: '1.5rem',
              border: '2px solid #eab308',
              background: 'linear-gradient(180deg, rgba(234, 179, 8, 0.12) 0%, rgba(0, 0, 0, 0.2) 100%)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>🥇</div>
            <div style={{ fontSize: '0.8rem', color: '#facc15', fontWeight: 800 }}>CHAMPION LEADER</div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', margin: '0.25rem 0' }}>
              {podium[0].college_name}
            </h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {podium[0].college_code} {podium[0].district ? `• ${podium[0].district}` : ''}
            </div>

            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#facc15', margin: '0.75rem 0 0.5rem 0' }}>
              {podium[0].total_points} <span style={{ fontSize: '1rem', color: '#fff' }}>PTS</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.85rem' }}>
              <span>🥇 <strong>{podium[0].golds}</strong></span>
              <span>🥈 <strong>{podium[0].silvers}</strong></span>
              <span>🥉 <strong>{podium[0].bronzes}</strong></span>
            </div>
          </div>

          {/* 2nd Place Silver */}
          {podium[1] && (
            <div
              className="glass-panel"
              style={{
                padding: '1.5rem',
                border: '1.5px solid #94a3b8',
                background: 'linear-gradient(180deg, rgba(148, 163, 184, 0.08) 0%, rgba(0, 0, 0, 0.2) 100%)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>🥈</div>
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 800 }}>RUNNER-UP</div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', margin: '0.25rem 0' }}>
                {podium[1].college_name}
              </h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {podium[1].college_code}
              </div>

              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#cbd5e1', margin: '0.75rem 0 0.5rem 0' }}>
                {podium[1].total_points} <span style={{ fontSize: '1rem', color: '#fff' }}>PTS</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.85rem' }}>
                <span>🥇 <strong>{podium[1].golds}</strong></span>
                <span>🥈 <strong>{podium[1].silvers}</strong></span>
                <span>🥉 <strong>{podium[1].bronzes}</strong></span>
              </div>
            </div>
          )}

          {/* 3rd Place Bronze */}
          {podium[2] && (
            <div
              className="glass-panel"
              style={{
                padding: '1.5rem',
                border: '1.5px solid #b45309',
                background: 'linear-gradient(180deg, rgba(180, 83, 9, 0.08) 0%, rgba(0, 0, 0, 0.2) 100%)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>🥉</div>
              <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 800 }}>SECOND RUNNER-UP</div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', margin: '0.25rem 0' }}>
                {podium[2].college_name}
              </h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {podium[2].college_code}
              </div>

              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#f59e0b', margin: '0.75rem 0 0.5rem 0' }}>
                {podium[2].total_points} <span style={{ fontSize: '1rem', color: '#fff' }}>PTS</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.85rem' }}>
                <span>🥇 <strong>{podium[2].golds}</strong></span>
                <span>🥈 <strong>{podium[2].silvers}</strong></span>
                <span>🥉 <strong>{podium[2].bronzes}</strong></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Points Table */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
            Full Team Rankings ({division.toUpperCase()})
          </h3>

          <input
            type="text"
            className="input-field"
            placeholder="Search by college name, code, or district..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: '320px' }}
          />
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading live points table...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px 8px', width: '60px' }}>Rank</th>
                  <th style={{ padding: '10px 8px' }}>College / Institution</th>
                  <th style={{ padding: '10px 8px', width: '100px' }}>District</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', width: '60px' }}>🥇 G</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', width: '60px' }}>🥈 S</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', width: '60px' }}>🥉 B</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right', width: '110px' }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((c) => (
                  <tr key={c.college_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 900, color: c.rank === 1 ? '#facc15' : c.rank === 2 ? '#cbd5e1' : c.rank === 3 ? '#f59e0b' : '#fff' }}>
                      {c.rank === 1 ? '🥇 1' : c.rank === 2 ? '🥈 2' : c.rank === 3 ? '🥉 3' : c.rank}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ fontWeight: 800, color: '#fff' }}>{c.college_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c.college_code}</div>
                    </td>
                    <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>{c.district || '—'}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700 }}>{c.golds}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700 }}>{c.silvers}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700 }}>{c.bronzes}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 900, fontSize: '1.1rem', color: '#10b981' }}>
                      {c.total_points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <Link href="/" className="btn btn-secondary">
          ← Return to Home Portal
        </Link>
      </div>
    </div>
  );
}
