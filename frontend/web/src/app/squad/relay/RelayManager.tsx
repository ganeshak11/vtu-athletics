'use client';

import { useState } from 'react';
import { saveRelayTeamAction, RelayTeamDTO } from '@/app/actions/relay';
import Link from 'next/link';

interface AthleteOption {
  id: string;
  sslc_name: string;
  usn: string;
}

interface Props {
  relayTeams: RelayTeamDTO[];
  athletes: AthleteOption[];
  rosterLocked: boolean;
  squadCode: string;
}

export default function RelayManager({ relayTeams, athletes, rosterLocked, squadCode }: Props) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Link href="/squad/dashboard" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              ← Squad Dashboard
            </Link>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>
            Relay Team Composition ({squadCode})
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Assign 4 active runners across relay legs + up to 2 reserve runners. Relay participation is unrestricted and does not count against an athlete&apos;s 2 individual events quota.
          </p>
        </div>

        {rosterLocked && (
          <div style={{ padding: '0.6rem 1.2rem', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', color: '#f43f5e', fontSize: '0.9rem', fontWeight: 700 }}>
            🔒 Roster Locked
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1.5rem' }}>
        {relayTeams.map((team) => (
          <RelayTeamCard
            key={team.id}
            team={team}
            athletes={athletes}
            rosterLocked={rosterLocked}
          />
        ))}
      </div>
    </div>
  );
}

function RelayTeamCard({
  team,
  athletes,
  rosterLocked,
}: {
  team: RelayTeamDTO;
  athletes: AthleteOption[];
  rosterLocked: boolean;
}) {
  const [leg1, setLeg1] = useState(team.members.find((m) => m.leg_order === 1)?.profile_id || '');
  const [leg2, setLeg2] = useState(team.members.find((m) => m.leg_order === 2)?.profile_id || '');
  const [leg3, setLeg3] = useState(team.members.find((m) => m.leg_order === 3)?.profile_id || '');
  const [leg4, setLeg4] = useState(team.members.find((m) => m.leg_order === 4)?.profile_id || '');

  const reserves = team.members.filter((m) => m.is_reserve);
  const [reserve1, setReserve1] = useState(reserves[0]?.profile_id || '');
  const [reserve2, setReserve2] = useState(reserves[1]?.profile_id || '');

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      const res = await saveRelayTeamAction(team.id, leg1, leg2, leg3, leg4, reserve1, reserve2);
      if (res.success) {
        setMsg({ text: '✓ Relay team saved successfully!', error: false });
      } else {
        setMsg({ text: res.error || 'Failed to save relay team.', error: true });
      }
    } catch {
      setMsg({ text: 'Network error.', error: true });
    } finally {
      setSaving(false);
    }
  }

  const selectedAthletes = [leg1, leg2, leg3, leg4, reserve1, reserve2].filter(Boolean);

  return (
    <div className="glass-panel" style={{ padding: '2rem' }} id={`card-relay-${team.event_code}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc' }}>
            {team.event_name}
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 700 }}>
            CODE: {team.event_code}
          </span>
        </div>
        <div style={{ fontSize: '2rem' }}>🤝</div>
      </div>

      {msg && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            background: msg.error ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            color: msg.error ? '#f43f5e' : '#34d399',
            border: `1px solid ${msg.error ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          }}
        >
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSave}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {[
            { label: 'Leg 1 (Lead-Off Runner)', val: leg1, setVal: setLeg1, id: 'leg1' },
            { label: 'Leg 2 (Second Runner)', val: leg2, setVal: setLeg2, id: 'leg2' },
            { label: 'Leg 3 (Third Runner)', val: leg3, setVal: setLeg3, id: 'leg3' },
            { label: 'Leg 4 (Anchor Leg)', val: leg4, setVal: setLeg4, id: 'leg4' },
          ].map((leg) => (
            <div className="form-group" key={leg.id} style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor={`${team.id}-${leg.id}`}>{leg.label}</label>
              <select
                id={`${team.id}-${leg.id}`}
                className="input-field"
                value={leg.val}
                disabled={rosterLocked}
                onChange={(e) => leg.setVal(e.target.value)}
              >
                <option value="">Select Athlete</option>
                {athletes.map((a) => (
                  <option key={a.id} value={a.id} disabled={selectedAthletes.includes(a.id) && leg.val !== a.id}>
                    {a.sslc_name} ({a.usn})
                  </option>
                ))}
              </select>
            </div>
          ))}

          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Reserve Runners (Up to 2)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor={`${team.id}-res1`}>Reserve 1</label>
                <select
                  id={`${team.id}-res1`}
                  className="input-field"
                  value={reserve1}
                  disabled={rosterLocked}
                  onChange={(e) => setReserve1(e.target.value)}
                >
                  <option value="">None</option>
                  {athletes.map((a) => (
                    <option key={a.id} value={a.id} disabled={selectedAthletes.includes(a.id) && reserve1 !== a.id}>
                      {a.sslc_name} ({a.usn})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor={`${team.id}-res2`}>Reserve 2</label>
                <select
                  id={`${team.id}-res2`}
                  className="input-field"
                  value={reserve2}
                  disabled={rosterLocked}
                  onChange={(e) => setReserve2(e.target.value)}
                >
                  <option value="">None</option>
                  {athletes.map((a) => (
                    <option key={a.id} value={a.id} disabled={selectedAthletes.includes(a.id) && reserve2 !== a.id}>
                      {a.sslc_name} ({a.usn})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {!rosterLocked && (
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={saving} className="btn btn-primary" id={`btn-save-relay-${team.event_code}`}>
              {saving ? 'Saving...' : 'Save Relay Roster →'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
