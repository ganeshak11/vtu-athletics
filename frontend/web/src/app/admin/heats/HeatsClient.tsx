'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateTrackHeatsAction } from '@/app/actions/admin-operations';

interface Props {
  heats: any[];
}

export default function HeatsClient({ heats }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleGenerateHeats() {
    if (!window.confirm('This will seed all verified athletes with bib numbers into preliminary heats and preferred lanes. Continue?')) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await generateTrackHeatsAction();
      if (res.success) {
        setMessage({
          type: 'success',
          text: `Successfully seeded ${res.totalAthletesSeeded} athletes across ${res.totalHeatsCreated} track heats!`,
        });
        router.refresh();
      } else {
        setMessage({
          type: 'error',
          text: res.error || 'Failed to seed heats.',
        });
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'An error occurred.',
      });
    } finally {
      setLoading(false);
    }
  }

  // Group heats by event
  const heatsByEvent = heats.reduce((acc: Record<string, any[]>, heat) => {
    const eventName = heat.events?.name || 'Track Event';
    if (!acc[eventName]) acc[eventName] = [];
    acc[eventName].push(heat);
    return acc;
  }, {});

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-title-group">
          <h2>Automated Track Heats & Lane Seeding</h2>
          <p>World Athletics standard lane assignment (preferred lanes 4, 5, 3, 6, 2, 7, 1, 8) for verified athletes</p>
        </div>

        <div className="admin-actions-group">
          <button
            type="button"
            disabled={loading}
            onClick={handleGenerateHeats}
            className="btn-admin btn-admin-primary"
            id="btn-generate-heats"
          >
            <span>{loading ? 'Seeding Heats...' : '⚡ Generate / Re-seed Heats'}</span>
          </button>
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            background: message.type === 'success' ? '#ecfdf5' : '#fee2e2',
            border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecdd3'}`,
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          {message.type === 'success' ? '✅' : '⚠️'} {message.text}
        </div>
      )}

      {Object.keys(heatsByEvent).length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⏱️</div>
          <div style={{ fontWeight: 600, color: '#475569' }}>No heats generated yet</div>
          <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
            Click &ldquo;Generate / Re-seed Heats&rdquo; above to automatically organize verified athletes into heats and lanes.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {Object.entries(heatsByEvent).map(([eventName, eventHeats]) => (
            <div key={eventName} style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>{eventName}</h3>
                <span style={{ fontSize: '0.8rem', background: '#eff6ff', color: '#1d4ed8', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontWeight: 700 }}>
                  {eventHeats.length} {eventHeats.length === 1 ? 'Final' : 'Heats'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {eventHeats.map((heat) => {
                  const sortedLanes = [...(heat.heat_athletes || [])].sort((a, b) => a.lane_number - b.lane_number);

                  return (
                    <div key={heat.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ background: '#f8fafc', padding: '0.6rem 0.85rem', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Heat {heat.heat_number} ({heat.stage || 'Heats'})</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{sortedLanes.length} Athletes</span>
                      </div>

                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ background: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
                            <th style={{ padding: '0.4rem 0.6rem', textAlign: 'center', width: '50px', color: '#64748b' }}>Lane</th>
                            <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left', width: '70px', color: '#64748b' }}>Bib</th>
                            <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left', color: '#64748b' }}>Athlete Name</th>
                            <th style={{ padding: '0.4rem 0.6rem', textAlign: 'right', color: '#64748b' }}>College</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedLanes.map((item) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                              <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center', fontWeight: 800, color: '#2563eb' }}>
                                {item.lane_number}
                              </td>
                              <td style={{ padding: '0.4rem 0.6rem', fontWeight: 700, color: '#0f172a' }}>
                                #{item.profiles?.bid_number || '—'}
                              </td>
                              <td style={{ padding: '0.4rem 0.6rem', fontWeight: 600, color: '#1e293b' }}>
                                {item.profiles?.sslc_name}
                              </td>
                              <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontSize: '0.75rem', color: '#64748b' }}>
                                {item.profiles?.squads?.colleges?.code || item.profiles?.squads?.squad_code}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
