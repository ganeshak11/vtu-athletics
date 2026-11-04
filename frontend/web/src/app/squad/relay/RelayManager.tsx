'use client';

import React, { useState } from 'react';
import { saveRelayTeamAction, RelayTeamDTO } from '@/app/actions/relay';
import Link from 'next/link';

export interface AthleteOption {
  id: string;
  sslc_name: string;
  usn: string;
}

interface Props {
  relayTeams: RelayTeamDTO[];
  menAthletes: AthleteOption[];
  womenAthletes: AthleteOption[];
  squadGender: 'men' | 'women';
  rosterLocked: boolean;
  squadCode: string;
}

export default function RelayManager({
  relayTeams,
  menAthletes,
  womenAthletes,
  squadGender,
  rosterLocked,
  squadCode,
}: Props) {
  // Track active/reserve member IDs per team code to enforce Rule 24 mutual exclusivity across cards in real-time
  const initialMap: Record<string, string[]> = {};
  for (const t of relayTeams) {
    initialMap[t.event_code] = t.members.map((m) => m.profile_id);
  }
  const [teamSelections, setTeamSelections] = useState<Record<string, string[]>>(initialMap);

  function updateTeamSelection(code: string, selectedIds: string[]) {
    setTeamSelections((prev) => ({
      ...prev,
      [code]: selectedIds,
    }));
  }

  // Determine current squad's divisional athletes
  const divisionalAthletes = squadGender === 'men' ? menAthletes : womenAthletes;

  return (
    <div>
      {/* Top Header */}
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
            Assign 4 active runners across relay legs + up to 2 reserve runners. Relay lineups can be adjusted until championship registration closes.
          </p>
        </div>

        <div style={{ padding: '0.6rem 1.2rem', background: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(37, 99, 235, 0.25)', borderRadius: 'var(--radius-md)', color: 'var(--accent-primary)', fontSize: '0.875rem', fontWeight: 700 }}>
          ⚡ Editable until Registration Closes
        </div>
      </div>

      {/* Official VTU Relay Regulations & Scoring Info Box */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.75rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
          fontSize: '0.875rem',
          color: '#cbd5e1',
        }}
      >
        <div>
          <div style={{ fontWeight: 800, color: '#f8fafc', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>📋</span> Rule 24: Divisional Relay Quota
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.6 }}>
            <li>An athlete can participate in <strong>at most ONE divisional relay</strong> (either 4&times;100m or 4&times;400m).</li>
            <li>An athlete registered in 4&times;100m <strong>cannot</strong> be entered into 4&times;400m, and vice-versa.</li>
            <li>Each relay team allows <strong>up to 6 members</strong> (4 active runners + 2 reserves).</li>
          </ul>
        </div>

        <div>
          <div style={{ fontWeight: 800, color: '#f8fafc', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>🤝</span> Rule 27: 4&times;400m Mixed Relay
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.6 }}>
            <li>Team consists of <strong>2 Men and 2 Women</strong> from the same college.</li>
            <li>Mandatory Running Order: <strong>Leg 1: 🚺 Woman &bull; Leg 2: 🚹 Man &bull; Leg 3: 🚺 Woman &bull; Leg 4: 🚹 Man</strong>.</li>
            <li>Mixed Relay points count toward the <strong>Overall Championship Trophy</strong>.</li>
          </ul>
        </div>
      </div>

      {/* Relay Teams Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '1.5rem' }}>
        {relayTeams.map((team) => (
          <RelayTeamCard
            key={team.id}
            team={team}
            divisionalAthletes={divisionalAthletes}
            menAthletes={menAthletes}
            womenAthletes={womenAthletes}
            squadGender={squadGender}
            teamSelections={teamSelections}
            onUpdateSelection={(selectedIds) => updateTeamSelection(team.event_code, selectedIds)}
          />
        ))}
      </div>
    </div>
  );
}

function RelayTeamCard({
  team,
  divisionalAthletes,
  menAthletes,
  womenAthletes,
  squadGender,
  teamSelections,
  onUpdateSelection,
}: {
  team: RelayTeamDTO;
  divisionalAthletes: AthleteOption[];
  menAthletes: AthleteOption[];
  womenAthletes: AthleteOption[];
  squadGender: 'men' | 'women';
  teamSelections: Record<string, string[]>;
  onUpdateSelection: (selectedIds: string[]) => void;
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

  const isMixed = team.is_mixed || team.event_code === '4X400M-MIX';
  const is100 = team.event_code.includes('4X100');
  const is400 = team.event_code.includes('4X400M') && !isMixed;

  // Find athletes selected in the OTHER divisional relay to disable them per Rule 24
  const otherDivisionalCode = is100
    ? (squadGender === 'men' ? '4X400M-M' : '4X400M-W')
    : (squadGender === 'men' ? '4X100M-M' : '4X100M-W');
  const otherDivisionalSelected = !isMixed ? (teamSelections[otherDivisionalCode] || []) : [];

  // Currently selected athletes within THIS relay card
  const thisRelaySelected = [leg1, leg2, leg3, leg4, reserve1, reserve2].filter(Boolean);

  function handleLegChange(legNum: number, value: string) {
    let next1 = leg1;
    let next2 = leg2;
    let next3 = leg3;
    let next4 = leg4;
    let nextR1 = reserve1;
    let nextR2 = reserve2;

    if (legNum === 1) { next1 = value; setLeg1(value); }
    if (legNum === 2) { next2 = value; setLeg2(value); }
    if (legNum === 3) { next3 = value; setLeg3(value); }
    if (legNum === 4) { next4 = value; setLeg4(value); }
    if (legNum === 5) { nextR1 = value; setReserve1(value); }
    if (legNum === 6) { nextR2 = value; setReserve2(value); }

    const updated = [next1, next2, next3, next4, nextR1, nextR2].filter(Boolean);
    onUpdateSelection(updated);
  }

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

  return (
    <div className="glass-panel" style={{ padding: '2rem' }} id={`card-relay-${team.event_code}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            {team.event_name}
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 700, display: 'block', marginTop: '0.2rem' }}>
            CODE: {team.event_code}
          </span>
        </div>
        <div style={{ fontSize: '1.8rem' }}>{isMixed ? '🤝' : '🎽'}</div>
      </div>

      {/* Special Rule Badges */}
      {isMixed ? (
        <div
          style={{
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '8px',
            padding: '0.65rem 0.85rem',
            fontSize: '0.78rem',
            color: '#c7d2fe',
            marginBottom: '1rem',
            lineHeight: 1.45,
          }}
        >
          <strong style={{ color: '#ffffff', display: 'block', marginBottom: '0.15rem' }}>
            Rule 27 Baton Order:
          </strong>
          Leg 1: 🚺 Woman &bull; Leg 2: 🚹 Man &bull; Leg 3: 🚺 Woman &bull; Leg 4: 🚹 Man
        </div>
      ) : (
        <div
          style={{
            background: 'rgba(37, 99, 235, 0.08)',
            border: '1px solid rgba(37, 99, 235, 0.25)',
            borderRadius: '8px',
            padding: '0.55rem 0.75rem',
            fontSize: '0.75rem',
            color: '#93c5fd',
            marginBottom: '1rem',
          }}
        >
          ℹ️ Rule 24: Athletes in {is100 ? '4x100m' : '4x400m'} cannot run in {is100 ? '4x400m' : '4x100m'}.
        </div>
      )}

      {/* Notice if athletes of required gender are missing */}
      {isMixed && womenAthletes.length === 0 && (
        <div style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fcd34d', fontSize: '0.78rem', marginBottom: '1rem' }}>
          ⚠️ 0 Women athletes registered in your Girls squad. Register female athletes in Girls squad to assign Leg 1 &amp; Leg 3.
        </div>
      )}

      {isMixed && menAthletes.length === 0 && (
        <div style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fcd34d', fontSize: '0.78rem', marginBottom: '1rem' }}>
          ⚠️ 0 Men athletes registered in your Boys squad. Register male athletes in Boys squad to assign Leg 2 &amp; Leg 4.
        </div>
      )}

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
          {/* Leg 1 */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor={`${team.id}-leg1`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{isMixed ? 'Leg 1 (Lead-Off — 🚺 Woman) *' : 'Leg 1 (Lead-Off Runner)'}</span>
              {isMixed && <span style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: 700 }}>WOMAN</span>}
            </label>
            <select
              id={`${team.id}-leg1`}
              className="input-field"
              value={leg1}
              onChange={(e) => handleLegChange(1, e.target.value)}
            >
              <option value="">Select Athlete</option>
              {(isMixed ? womenAthletes : divisionalAthletes).map((a) => {
                const inThisRelay = thisRelaySelected.includes(a.id) && leg1 !== a.id;
                const inOtherRelay = !isMixed && otherDivisionalSelected.includes(a.id);
                const disabled = inThisRelay || inOtherRelay;
                return (
                  <option key={a.id} value={a.id} disabled={disabled}>
                    {isMixed ? '🚺 ' : ''}{a.sslc_name} ({a.usn})
                    {inOtherRelay ? ` — (Already in ${is100 ? '4x400m' : '4x100m'} Relay)` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Leg 2 */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor={`${team.id}-leg2`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{isMixed ? 'Leg 2 (Second Runner — 🚹 Man) *' : 'Leg 2 (Second Runner)'}</span>
              {isMixed && <span style={{ fontSize: '0.7rem', color: '#60a5fa', fontWeight: 700 }}>MAN</span>}
            </label>
            <select
              id={`${team.id}-leg2`}
              className="input-field"
              value={leg2}
              onChange={(e) => handleLegChange(2, e.target.value)}
            >
              <option value="">Select Athlete</option>
              {(isMixed ? menAthletes : divisionalAthletes).map((a) => {
                const inThisRelay = thisRelaySelected.includes(a.id) && leg2 !== a.id;
                const inOtherRelay = !isMixed && otherDivisionalSelected.includes(a.id);
                const disabled = inThisRelay || inOtherRelay;
                return (
                  <option key={a.id} value={a.id} disabled={disabled}>
                    {isMixed ? '🚹 ' : ''}{a.sslc_name} ({a.usn})
                    {inOtherRelay ? ` — (Already in ${is100 ? '4x400m' : '4x100m'} Relay)` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Leg 3 */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor={`${team.id}-leg3`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{isMixed ? 'Leg 3 (Third Runner — 🚺 Woman) *' : 'Leg 3 (Third Runner)'}</span>
              {isMixed && <span style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: 700 }}>WOMAN</span>}
            </label>
            <select
              id={`${team.id}-leg3`}
              className="input-field"
              value={leg3}
              onChange={(e) => handleLegChange(3, e.target.value)}
            >
              <option value="">Select Athlete</option>
              {(isMixed ? womenAthletes : divisionalAthletes).map((a) => {
                const inThisRelay = thisRelaySelected.includes(a.id) && leg3 !== a.id;
                const inOtherRelay = !isMixed && otherDivisionalSelected.includes(a.id);
                const disabled = inThisRelay || inOtherRelay;
                return (
                  <option key={a.id} value={a.id} disabled={disabled}>
                    {isMixed ? '🚺 ' : ''}{a.sslc_name} ({a.usn})
                    {inOtherRelay ? ` — (Already in ${is100 ? '4x400m' : '4x100m'} Relay)` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Leg 4 */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor={`${team.id}-leg4`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{isMixed ? 'Leg 4 (Anchor Leg — 🚹 Man) *' : 'Leg 4 (Anchor Leg)'}</span>
              {isMixed && <span style={{ fontSize: '0.7rem', color: '#60a5fa', fontWeight: 700 }}>MAN</span>}
            </label>
            <select
              id={`${team.id}-leg4`}
              className="input-field"
              value={leg4}
              onChange={(e) => handleLegChange(4, e.target.value)}
            >
              <option value="">Select Athlete</option>
              {(isMixed ? menAthletes : divisionalAthletes).map((a) => {
                const inThisRelay = thisRelaySelected.includes(a.id) && leg4 !== a.id;
                const inOtherRelay = !isMixed && otherDivisionalSelected.includes(a.id);
                const disabled = inThisRelay || inOtherRelay;
                return (
                  <option key={a.id} value={a.id} disabled={disabled}>
                    {isMixed ? '🚹 ' : ''}{a.sslc_name} ({a.usn})
                    {inOtherRelay ? ` — (Already in ${is100 ? '4x400m' : '4x100m'} Relay)` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Reserves */}
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Reserve Runners (Up to 2)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {/* Reserve 1 */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor={`${team.id}-res1`}>
                  {isMixed ? 'Reserve 1 (🚺 Woman)' : 'Reserve 1'}
                </label>
                <select
                  id={`${team.id}-res1`}
                  className="input-field"
                  value={reserve1}
                  onChange={(e) => handleLegChange(5, e.target.value)}
                >
                  <option value="">None</option>
                  {(isMixed ? womenAthletes : divisionalAthletes).map((a) => {
                    const inThisRelay = thisRelaySelected.includes(a.id) && reserve1 !== a.id;
                    const inOtherRelay = !isMixed && otherDivisionalSelected.includes(a.id);
                    const disabled = inThisRelay || inOtherRelay;
                    return (
                      <option key={a.id} value={a.id} disabled={disabled}>
                        {isMixed ? '🚺 ' : ''}{a.sslc_name} ({a.usn})
                        {inOtherRelay ? ` — (Already in ${is100 ? '4x400m' : '4x100m'} Relay)` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Reserve 2 */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor={`${team.id}-res2`}>
                  {isMixed ? 'Reserve 2 (🚹 Man)' : 'Reserve 2'}
                </label>
                <select
                  id={`${team.id}-res2`}
                  className="input-field"
                  value={reserve2}
                  onChange={(e) => handleLegChange(6, e.target.value)}
                >
                  <option value="">None</option>
                  {(isMixed ? menAthletes : divisionalAthletes).map((a) => {
                    const inThisRelay = thisRelaySelected.includes(a.id) && reserve2 !== a.id;
                    const inOtherRelay = !isMixed && otherDivisionalSelected.includes(a.id);
                    const disabled = inThisRelay || inOtherRelay;
                    return (
                      <option key={a.id} value={a.id} disabled={disabled}>
                        {isMixed ? '🚹 ' : ''}{a.sslc_name} ({a.usn})
                        {inOtherRelay ? ` — (Already in ${is100 ? '4x400m' : '4x100m'} Relay)` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={saving} className="btn btn-primary" id={`btn-save-relay-${team.event_code}`}>
            {saving ? 'Saving...' : 'Save Relay Roster →'}
          </button>
        </div>
      </form>
    </div>
  );
}
