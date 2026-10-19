'use client';

import React, { useState, useEffect } from 'react';

interface ScanResult {
  athlete_id: string;
  sslc_name: string;
  usn: string;
  bid_number: number;
  college_name: string;
  squad_code: string;
  status: string;
  already_accredited: boolean;
  is_duplicate_sync: boolean;
  events?: Array<{ name: string; code: string; kind: string }>;
}

export default function AccreditationScannerPage() {
  const [token, setToken] = useState<string>('');
  const [pin, setPin] = useState<string>('1234');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [volunteerName, setVolunteerName] = useState<string>('');

  const [stats, setStats] = useState({
    totalAthletes: 0,
    accreditedAthletes: 0,
    pendingAccreditation: 0,
  });

  const [scanInput, setScanInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);

  // Load offline queue from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('vtu_accred_queue');
    if (saved) {
      try {
        setOfflineQueue(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // Check stats and sync queue whenever logged in
  useEffect(() => {
    if (isLoggedIn && token) {
      fetchStats();
      syncOfflineQueue();
      const interval = setInterval(fetchStats, 10000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, token]);

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/accreditation/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setStats(data);
      }
    } catch (e) {
      console.warn('Could not fetch stats offline:', e);
    }
  };

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const res = await fetch('http://localhost:5000/api/auth/staff/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'accreditation_volunteer', pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to login');
        return;
      }
      setToken(data.token);
      setVolunteerName(data.staff?.displayName || 'Volunteer');
      setIsLoggedIn(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error');
    }
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    setLoading(true);
    setErrorMessage('');
    setLastResult(null);

    let athleteId = scanInput.trim();
    // Support scanning raw JSON QR payload
    try {
      if (scanInput.includes('{')) {
        const parsed = JSON.parse(scanInput);
        if (parsed.id) athleteId = parsed.id;
      }
    } catch (e) {}

    const clientScanUuid = crypto.randomUUID();

    try {
      const res = await fetch('http://localhost:5000/api/accreditation/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientScanUuid,
          athleteId,
          deviceTimestamp: new Date().toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to process scan');
      } else {
        const result: ScanResult = data.result;
        setLastResult(result);
        setRecentScans((prev) => [result, ...prev.slice(0, 9)]);
        setScanInput('');
        fetchStats();
      }
    } catch (err: any) {
      // Offline fallback: save to local queue
      const queueItem = {
        clientScanUuid,
        athleteId,
        timestamp: new Date().toISOString(),
      };
      const updated = [...offlineQueue, queueItem];
      setOfflineQueue(updated);
      localStorage.setItem('vtu_accred_queue', JSON.stringify(updated));
      setErrorMessage('Network offline! Scan saved in local queue and will sync automatically.');
      setScanInput('');
    } finally {
      setLoading(false);
    }
  };

  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0 || !token) return;

    const remaining = [...offlineQueue];
    for (let i = 0; i < offlineQueue.length; i++) {
      const item = offlineQueue[i];
      try {
        const res = await fetch('http://localhost:5000/api/accreditation/scan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            clientScanUuid: item.clientScanUuid,
            athleteId: item.athleteId,
            deviceTimestamp: item.timestamp,
          }),
        });
        if (res.ok) {
          remaining.shift();
        }
      } catch (e) {
        break;
      }
    }

    setOfflineQueue(remaining);
    localStorage.setItem('vtu_accred_queue', JSON.stringify(remaining));
    if (remaining.length === 0) {
      fetchStats();
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="container" style={{ maxWidth: '440px', marginTop: '4rem' }}>
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎫</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Gate Accreditation Desk
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Volunteer Passcode Login
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
                placeholder="Enter Volunteer PIN (Default: 1234)"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={6}
                style={{ fontSize: '1.4rem', letterSpacing: '4px' }}
                autoFocus
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Unlock Scanner Desk →
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container" id="accreditation-desk-container">
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
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
            Stadium Entry Gate • Security Point 1
          </span>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.2rem' }}>
            Entry Gate Accreditation Scanner
          </h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Scanner: <strong style={{ color: '#fff' }}>{volunteerName}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {offlineQueue.length > 0 && (
            <span
              onClick={syncOfflineQueue}
              style={{
                background: '#f59e0b',
                color: '#111827',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              🔄 Offline Queue: {offlineQueue.length} (Click to Sync)
            </span>
          )}
          <button
            onClick={() => setIsLoggedIn(false)}
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
          >
            Lock Desk
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>TOTAL ATHLETES</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{stats.totalAthletes}</div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ACCREDITED AT GATE</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>{stats.accreditedAthletes}</div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>PENDING GATE ENTRY</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b' }}>{stats.pendingAccreditation}</div>
        </div>
      </div>

      {/* Scanner & Manual Entry Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Input Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📷</span> Barcode / QR Scan or Athlete ID
          </h2>

          <form onSubmit={handleScanSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Scan QR code or paste Athlete Profile ID / JSON payload..."
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                autoFocus
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem' }}
            >
              {loading ? 'Processing Gate Verification...' : 'Verify & Accredit Athlete →'}
            </button>
          </form>

          {errorMessage && (
            <div
              style={{
                marginTop: '1rem',
                background: '#7f1d1d',
                color: '#fecaca',
                padding: '0.85rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
              }}
            >
              ⚠️ {errorMessage}
            </div>
          )}
        </div>

        {/* Scan Result Feedback Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>
            Latest Verification Status
          </h2>

          {lastResult ? (
            <div
              style={{
                background: lastResult.already_accredited ? '#362f0f' : '#064e3b',
                border: `1.5px solid ${lastResult.already_accredited ? '#f59e0b' : '#10b981'}`,
                borderRadius: '8px',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span
                  style={{
                    background: lastResult.already_accredited ? '#f59e0b' : '#10b981',
                    color: '#111827',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                  }}
                >
                  {lastResult.already_accredited ? '⚠️ ALREADY ACCREDITED' : '✅ ENTRY PERMITTED'}
                </span>

                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#38bdf8' }}>
                  CHEST #{lastResult.bid_number || '---'}
                </div>
              </div>

              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>
                {lastResult.sslc_name}
              </div>
              <div style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                {lastResult.college_name} ({lastResult.squad_code})
              </div>

              <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                <span>USN: <strong style={{ color: '#fff' }}>{lastResult.usn}</strong></span>
                <span>Status: <strong style={{ color: '#10b981' }}>{lastResult.status}</strong></span>
              </div>

              {lastResult.events && lastResult.events.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>REGISTERED EVENTS:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {lastResult.events.map((ev, i) => (
                      <span key={i} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px' }}>
                        {ev.name} ({ev.kind})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Awaiting scan input. Ready for athlete badge verification.
            </div>
          )}
        </div>
      </div>

      {/* Recent Scans Table */}
      {recentScans.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
            Gate Scan Log (Recent 10 Entries)
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '8px' }}>Bid #</th>
                  <th style={{ padding: '8px' }}>Athlete Name</th>
                  <th style={{ padding: '8px' }}>USN</th>
                  <th style={{ padding: '8px' }}>College / Squad</th>
                  <th style={{ padding: '8px' }}>Gate Status</th>
                </tr>
              </thead>
              <tbody>
                {recentScans.map((scan, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px', fontWeight: 800, color: '#38bdf8' }}>#{scan.bid_number}</td>
                    <td style={{ padding: '8px', fontWeight: 600 }}>{scan.sslc_name}</td>
                    <td style={{ padding: '8px', fontFamily: 'monospace' }}>{scan.usn}</td>
                    <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{scan.college_name} ({scan.squad_code})</td>
                    <td style={{ padding: '8px' }}>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>VERIFIED</span>
                    </td>
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
