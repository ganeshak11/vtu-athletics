'use client';

import React, { useState, useEffect } from 'react';

interface Hostel {
  id: string;
  name: string;
  gender: string;
  total_capacity: number;
  occupied: number;
  available: number;
}

interface CheckinResult {
  athlete_id: string;
  sslc_name: string;
  usn: string;
  bid_number: number;
  college_name: string;
  squad_code: string;
  hostel_name: string;
  room_assigned: string;
  caution_deposit: number;
  caution_receipt_no: string;
  already_checked_in: boolean;
  is_duplicate_sync: boolean;
}

export default function HostelWardenPage() {
  const [token, setToken] = useState<string>('');
  const [pin, setPin] = useState<string>('1234');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [wardenName, setWardenName] = useState<string>('');

  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [selectedHostelId, setSelectedHostelId] = useState<string>('');

  const [stats, setStats] = useState({
    totalAthletes: 0,
    checkedInAthletes: 0,
    pendingCheckIn: 0,
    menCheckedIn: 0,
    womenCheckedIn: 0,
    totalCautionCollected: 0,
  });

  const [scanInput, setScanInput] = useState('');
  const [roomAssigned, setRoomAssigned] = useState('Room 101');
  const [cautionDeposit, setCautionDeposit] = useState('500');
  const [receiptNo, setReceiptNo] = useState(`REC-${Date.now().toString().slice(-4)}`);

  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<CheckinResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [recentCheckins, setRecentCheckins] = useState<CheckinResult[]>([]);

  // Load offline queue
  useEffect(() => {
    const saved = localStorage.getItem('vtu_warden_queue');
    if (saved) {
      try {
        setOfflineQueue(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && token) {
      fetchHostelsAndStats();
      syncOfflineQueue();
      const interval = setInterval(fetchHostelsAndStats, 10000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, token]);

  const fetchHostelsAndStats = async () => {
    try {
      const [hRes, sRes] = await Promise.all([
        fetch('http://localhost:5000/api/accommodation/hostels', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:5000/api/accommodation/stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (hRes.ok) {
        const hData = await hRes.json();
        setHostels(hData.hostels || []);
        if (!selectedHostelId && hData.hostels?.length > 0) {
          setSelectedHostelId(hData.hostels[0].id);
        }
      }

      if (sRes.ok) {
        const sData = await sRes.json();
        setStats(sData);
      }
    } catch (e) {
      console.warn('Could not fetch hostel data offline:', e);
    }
  };

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const res = await fetch('http://localhost:5000/api/auth/staff/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'warden', pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to login');
        return;
      }
      setToken(data.token);
      setWardenName(data.staff?.displayName || 'Hostel Warden');
      setIsLoggedIn(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error');
    }
  };

  const handleCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim() || !selectedHostelId) return;

    setLoading(true);
    setErrorMessage('');
    setLastResult(null);

    let athleteId = scanInput.trim();
    try {
      if (scanInput.includes('{')) {
        const parsed = JSON.parse(scanInput);
        if (parsed.id) athleteId = parsed.id;
      }
    } catch (e) {}

    const clientScanUuid = crypto.randomUUID();

    try {
      const res = await fetch('http://localhost:5000/api/accommodation/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientScanUuid,
          athleteId,
          hostelId: selectedHostelId,
          roomAssigned,
          cautionDeposit,
          cautionReceiptNo: receiptNo,
          deviceTimestamp: new Date().toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Check-in failed');
      } else {
        const result: CheckinResult = data.result;
        setLastResult(result);
        setRecentCheckins((prev) => [result, ...prev.slice(0, 9)]);
        setScanInput('');
        setReceiptNo(`REC-${Date.now().toString().slice(-4)}`);
        fetchHostelsAndStats();
      }
    } catch (err: any) {
      // Offline fallback: save to local queue
      const queueItem = {
        clientScanUuid,
        athleteId,
        hostelId: selectedHostelId,
        roomAssigned,
        cautionDeposit,
        receiptNo,
        timestamp: new Date().toISOString(),
      };
      const updated = [...offlineQueue, queueItem];
      setOfflineQueue(updated);
      localStorage.setItem('vtu_warden_queue', JSON.stringify(updated));
      setErrorMessage('Network offline! Check-in queued in local storage and will sync automatically.');
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
        const res = await fetch('http://localhost:5000/api/accommodation/checkin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            clientScanUuid: item.clientScanUuid,
            athleteId: item.athleteId,
            hostelId: item.hostelId,
            roomAssigned: item.roomAssigned,
            cautionDeposit: item.cautionDeposit,
            cautionReceiptNo: item.receiptNo,
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
    localStorage.setItem('vtu_warden_queue', JSON.stringify(remaining));
    if (remaining.length === 0) {
      fetchHostelsAndStats();
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="container" style={{ maxWidth: '440px', marginTop: '4rem' }}>
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏨</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Hostel Accommodation Desk
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Warden Passcode Login
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
                placeholder="Enter Warden PIN (Default: 1234)"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={6}
                style={{ fontSize: '1.4rem', letterSpacing: '4px' }}
                autoFocus
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Unlock Warden Desk →
            </button>
          </form>
        </div>
      </div>
    );
  }

  const currentHostel = hostels.find((h) => h.id === selectedHostelId);

  return (
    <div className="container" id="warden-desk-container">
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
            VTU Campus • Hostel Affairs
          </span>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.2rem' }}>
            Hostel Check-in &amp; Caution Deposit Desk
          </h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Officer: <strong style={{ color: '#fff' }}>{wardenName}</strong>
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

      {/* Aggregate Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>TOTAL ATHLETES</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats.totalAthletes}</div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CHECKED-IN</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>{stats.checkedInAthletes}</div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>PENDING CHECK-IN</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>{stats.pendingCheckIn}</div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center', borderLeft: '4px solid #38bdf8' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CAUTION DEPOSITS</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8' }}>₹{stats.totalCautionCollected}</div>
        </div>
      </div>

      {/* Hostel Block Selection Cards */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
          SELECT HOSTEL BLOCK:
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {hostels.map((hostel) => {
            const isSelected = hostel.id === selectedHostelId;
            const pct = Math.round((hostel.occupied / hostel.total_capacity) * 100) || 0;
            return (
              <div
                key={hostel.id}
                onClick={() => setSelectedHostelId(hostel.id)}
                className="glass-panel"
                style={{
                  padding: '1.25rem',
                  cursor: 'pointer',
                  border: isSelected ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                  background: isSelected ? 'rgba(56, 189, 248, 0.08)' : undefined,
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem' }}>{hostel.name}</span>
                  <span
                    style={{
                      background: hostel.gender === 'men' ? '#1e3a8a' : '#831843',
                      color: '#fff',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {hostel.gender.toUpperCase()}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Occupancy: <strong>{hostel.occupied} / {hostel.total_capacity}</strong> ({pct}%)
                </div>

                <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct > 90 ? '#ef4444' : '#10b981' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Check-In Form & Feedback Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Form Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🏨</span> Check-In Athlete into {currentHostel?.name}
          </h2>

          <form onSubmit={handleCheckinSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Scan Athlete QR Code or Enter ID:
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Scan QR or paste athlete ID / JSON payload..."
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                autoFocus
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Room / Block Allocated:
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={roomAssigned}
                  onChange={(e) => setRoomAssigned(e.target.value)}
                  placeholder="e.g. Room 104"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Caution Deposit (₹):
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={cautionDeposit}
                  onChange={(e) => setCautionDeposit(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Cash Receipt Number:
              </label>
              <input
                type="text"
                className="input-field font-mono"
                value={receiptNo}
                onChange={(e) => setReceiptNo(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !selectedHostelId}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem' }}
            >
              {loading ? 'Processing Check-In...' : 'Confirm Room & Deposit →'}
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

        {/* Check-In Confirmation Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>
            Check-In Receipt &amp; Status
          </h2>

          {lastResult ? (
            <div
              style={{
                background: lastResult.already_checked_in ? '#362f0f' : '#064e3b',
                border: `1.5px solid ${lastResult.already_checked_in ? '#f59e0b' : '#10b981'}`,
                borderRadius: '8px',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span
                  style={{
                    background: lastResult.already_checked_in ? '#f59e0b' : '#10b981',
                    color: '#111827',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                  }}
                >
                  {lastResult.already_checked_in ? '⚠️ PREVIOUSLY CHECKED-IN' : '✅ ACCOMMODATION CONFIRMED'}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>HOSTEL BLOCK:</div>
                  <strong style={{ color: '#fff' }}>{lastResult.hostel_name}</strong>
                </div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>ROOM ASSIGNED:</div>
                  <strong style={{ color: '#38bdf8' }}>{lastResult.room_assigned}</strong>
                </div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>CAUTION DEPOSIT:</div>
                  <strong style={{ color: '#10b981' }}>₹{lastResult.caution_deposit}</strong>
                </div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>RECEIPT NO:</div>
                  <strong style={{ color: '#fff' }}>{lastResult.caution_receipt_no || 'N/A'}</strong>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Awaiting scan input. Ready for hostel check-in and caution deposit collection.
            </div>
          )}
        </div>
      </div>

      {/* Recent Check-Ins Table */}
      {recentCheckins.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
            Recent Check-Ins (Hostel Desk Log)
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '8px' }}>Bid #</th>
                  <th style={{ padding: '8px' }}>Athlete Name</th>
                  <th style={{ padding: '8px' }}>Hostel &amp; Room</th>
                  <th style={{ padding: '8px' }}>Deposit</th>
                  <th style={{ padding: '8px' }}>Receipt #</th>
                </tr>
              </thead>
              <tbody>
                {recentCheckins.map((checkin, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px', fontWeight: 800, color: '#38bdf8' }}>#{checkin.bid_number}</td>
                    <td style={{ padding: '8px', fontWeight: 600 }}>{checkin.sslc_name}</td>
                    <td style={{ padding: '8px' }}>{checkin.hostel_name} ({checkin.room_assigned})</td>
                    <td style={{ padding: '8px', color: '#10b981', fontWeight: 700 }}>₹{checkin.caution_deposit}</td>
                    <td style={{ padding: '8px', fontFamily: 'monospace' }}>{checkin.caution_receipt_no}</td>
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
