'use client';

import { useState } from 'react';
import { closeRegistrationAction } from '@/app/actions/bids';

interface AthleteProfile {
  id: string;
  sslc_name: string;
  usn: string;
  bid_number?: number;
  accreditation_status: string;
}

interface SquadBidItem {
  id: string;
  squad_code: string;
  gender: string;
  bid_block_start?: number;
  bid_block_end?: number;
  payment_status: string;
  colleges?: {
    name: string;
    code: string;
    district?: string;
  };
  profiles: AthleteProfile[];
}

interface Props {
  initialSquads: any[];
}

export default function BidOverviewManager({ initialSquads }: Props) {
  const [squads, setSquads] = useState<SquadBidItem[]>(initialSquads);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [expandedSquadId, setExpandedSquadId] = useState<string | null>(null);

  async function handleCloseRegistration() {
    if (
      !confirm(
        'Are you sure you want to CLOSE registration?\n\nThis will lock all squads and sequentially generate contiguous bid/chest numbers:\n• Men: starting from 100\n• Women: starting from 2001'
      )
    ) {
      return;
    }

    setLoading(true);
    const res = await closeRegistrationAction();
    if (res.success) {
      setResult(res.result);
      window.location.reload();
    } else {
      alert(`Error closing registration: ${res.error}`);
    }
    setLoading(false);
  }

  const menSquads = squads.filter((s) => s.gender === 'men');
  const womenSquads = squads.filter((s) => s.gender === 'women');

  const totalAthletesWithBids = squads.reduce(
    (acc, s) => acc + (s.profiles?.filter((p) => p.bid_number) || []).length,
    0
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Contiguous Bid Number Allocation</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Automatic block generation: Men squads assigned from 100+, Women squads from 2001+.
          </p>
        </div>

        <div>
          <button
            onClick={handleCloseRegistration}
            disabled={loading}
            className="btn btn-primary"
            style={{ padding: '0.85rem 1.75rem', fontSize: '1rem' }}
            id="btn-close-registration"
          >
            {loading ? 'Generating Bids...' : '🔒 Close Registration & Generate Bids'}
          </button>
        </div>
      </div>

      {result && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.08)' }}>
          <h3 style={{ color: '#34d399', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
            ✓ Registration Closed &amp; Bids Generated!
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Assigned {result.total_men_bids_assigned} Men bids (up to {result.men_bid_range_end}) and {result.total_women_bids_assigned} Women bids (up to {result.women_bid_range_end}).
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass-card">
          <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
            Men&apos;s Division Allocation
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.5rem 0' }}>
            Chest 100 → {menSquads.find((s) => s.bid_block_end)?.bid_block_end || 'Pending'}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {menSquads.length} Men squads registered
          </div>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: '0.8rem', color: 'var(--accent-rose)', fontWeight: 700, textTransform: 'uppercase' }}>
            Women&apos;s Division Allocation
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.5rem 0' }}>
            Chest 2001 → {womenSquads.find((s) => s.bid_block_end)?.bid_block_end || 'Pending'}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {womenSquads.length} Women squads registered
          </div>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 700, textTransform: 'uppercase' }}>
            Total Bids Assigned
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.5rem 0' }}>
            {totalAthletesWithBids} Athletes
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Ready for heat seeding and printed rosters
          </div>
        </div>
      </div>

      {/* Squad Bid Table */}
      <div className="table-container">
        <table className="data-table" id="bid-overview-table">
          <thead>
            <tr>
              <th>College</th>
              <th>Squad Code</th>
              <th>Division</th>
              <th>Athletes Count</th>
              <th>Assigned Bid Block</th>
              <th>Payment Status</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {squads.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                  No squads registered.
                </td>
              </tr>
            ) : (
              squads.map((s) => {
                const college = Array.isArray(s.colleges) ? s.colleges[0] : s.colleges;
                const isExpanded = expandedSquadId === s.id;
                const hasBlock = s.bid_block_start && s.bid_block_end;

                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{college?.name || 'College'}</td>
                    <td>
                      <code style={{ color: '#fff', fontWeight: 700 }}>{s.squad_code}</code>
                    </td>
                    <td>
                      <span style={{ color: s.gender === 'men' ? 'var(--accent-cyan)' : 'var(--accent-rose)', fontWeight: 700 }}>
                        {s.gender.toUpperCase()}
                      </span>
                    </td>
                    <td>{s.profiles?.length || 0}</td>
                    <td>
                      {hasBlock ? (
                        <span
                          style={{
                            padding: '0.3rem 0.7rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: 'var(--accent-gold)',
                            fontWeight: 800,
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                          }}
                        >
                          {s.bid_block_start} — {s.bid_block_end}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${s.payment_status.toLowerCase()}`}>
                        {s.payment_status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => setExpandedSquadId(isExpanded ? null : s.id)}
                        className="btn btn-secondary"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        {isExpanded ? '▲ Hide Athletes' : '▼ View Athletes'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Expanded Athlete Detail Modal / Panel */}
      {expandedSquadId && (
        <div style={{ marginTop: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                Athlete Chest Numbers for {squads.find((s) => s.id === expandedSquadId)?.squad_code}
              </h2>
              <button
                onClick={() => setExpandedSquadId(null)}
                className="btn btn-secondary"
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
              >
                ✕ Close
              </button>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Bid #</th>
                    <th>Athlete Name</th>
                    <th>USN</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(squads.find((s) => s.id === expandedSquadId)?.profiles || []).map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 800, color: 'var(--accent-gold)', fontSize: '1.05rem' }}>
                        {p.bid_number || '—'}
                      </td>
                      <td style={{ fontWeight: 600 }}>{p.sslc_name}</td>
                      <td><code>{p.usn}</code></td>
                      <td>
                        <span className={`badge badge-${p.accreditation_status === 'ACCREDITED' ? 'verified' : 'draft'}`}>
                          {p.accreditation_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
