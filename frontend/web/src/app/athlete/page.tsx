'use client';

import React, { useState } from 'react';
import QRCode from 'react-qr-code';

export default function AthleteWebPass() {
  const [identifier, setIdentifier] = useState('');
  const [athleteData, setAthleteData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/athlete/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Athlete not found.');
        setAthleteData(null);
        return;
      }

      // Fetch full details
      const meRes = await fetch('http://localhost:5000/api/athlete/me', {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      const meData = await meRes.json();
      if (meRes.ok) {
        setAthleteData(meData);
      }
    } catch (err: any) {
      setError(`Server error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
          VTU SportsOS Athlete Pass
        </h1>
        <p style={{ color: '#64748b', fontSize: '15px' }}>
          Enter your USN or Chest/Bib Number to display your digital gate accreditation QR code, assigned heats, and live results.
        </p>
      </div>

      <form onSubmit={handleLookup} style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="e.g. 1BM22IS073 or 101"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
          style={{
            flex: 1,
            padding: '12px 16px',
            fontSize: '16px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            textTransform: 'uppercase',
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 24px',
            backgroundColor: '#2563eb',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '15px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Finding...' : 'View Pass'}
        </button>
      </form>

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {athleteData && (
        <div style={{ border: '2px solid #e2e8f0', borderRadius: '16px', padding: '24px', backgroundColor: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                {athleteData.athlete.name}
              </h2>
              <div style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
                {athleteData.athlete.college?.name} ({athleteData.athlete.college?.code})
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>
                #{athleteData.athlete.bidNumber || 'TBD'}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>CHEST NUMBER</div>
            </div>
          </div>

          {/* QR Code Container */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <QRCode value={athleteData.athlete.qrPayload} size={180} />
            </div>
            <p style={{ color: '#64748b', fontSize: '13px', marginTop: '12px', textAlign: 'center' }}>
              Show this QR code at the Stadium Entrance Gate & Hostel Check-in Desk.
            </p>
          </div>

          {/* Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>USN</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>{athleteData.athlete.usn}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>BLOOD GROUP</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>{athleteData.athlete.bloodGroup}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>ACCREDITATION STATUS</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: athleteData.athlete.accreditationStatus === 'ACCREDITED' ? '#16a34a' : '#ca8a04' }}>
                {athleteData.athlete.accreditationStatus}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>EVENTS REGISTERED</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>{athleteData.events?.length || 0} Events</div>
            </div>
          </div>

          {/* Today's Meals */}
          <div style={{ padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a', marginBottom: '10px' }}>
              🍽️ Today's Meal Coupons
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ padding: '8px 12px', backgroundColor: athleteData.todayMeals?.breakfast ? '#dcfce7' : '#f1f5f9', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '500' }}>☕ Breakfast</span>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: athleteData.todayMeals?.breakfast ? '#16a34a' : '#64748b' }}>
                  {athleteData.todayMeals?.breakfast ? '✓ CLAIMED' : 'PENDING'}
                </span>
              </div>
              <div style={{ padding: '8px 12px', backgroundColor: athleteData.todayMeals?.lunch ? '#dcfce7' : '#f1f5f9', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '500' }}>🍛 Lunch</span>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: athleteData.todayMeals?.lunch ? '#16a34a' : '#64748b' }}>
                  {athleteData.todayMeals?.lunch ? '✓ CLAIMED' : 'PENDING'}
                </span>
              </div>
              <div style={{ padding: '8px 12px', backgroundColor: athleteData.todayMeals?.snacks ? '#dcfce7' : '#f1f5f9', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '500' }}>🍪 High Tea</span>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: athleteData.todayMeals?.snacks ? '#16a34a' : '#64748b' }}>
                  {athleteData.todayMeals?.snacks ? '✓ CLAIMED' : 'PENDING'}
                </span>
              </div>
              <div style={{ padding: '8px 12px', backgroundColor: athleteData.todayMeals?.dinner ? '#dcfce7' : '#f1f5f9', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '500' }}>🍲 Dinner</span>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: athleteData.todayMeals?.dinner ? '#16a34a' : '#64748b' }}>
                  {athleteData.todayMeals?.dinner ? '✓ CLAIMED' : 'PENDING'}
                </span>
              </div>
            </div>
          </div>

          {/* Assigned Heats */}
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginBottom: '12px' }}>
              My Assigned Heats & Lanes
            </h3>
            {athleteData.heatAssignments?.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '14px' }}>Heats are currently being scheduled.</div>
            ) : (
              athleteData.heatAssignments.map((ha: any, idx: number) => (
                <div key={idx} style={{ backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px', marginBottom: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                    <span>{ha.heats?.events?.name} ({ha.heats?.stage})</span>
                    <span style={{ color: '#2563eb' }}>Heat #{ha.heats?.heat_number} • Lane/Order #{ha.lane_number}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                    Status: <strong>{ha.heats?.status}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
