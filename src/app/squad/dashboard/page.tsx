import { requireSquad } from '@/lib/auth-guard';
import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';

export const metadata = {
  title: 'Squad Roster Dashboard — VTU SportsOS',
};

export default async function SquadDashboardPage() {
  const session = await requireSquad();

  // Fetch squad details from DB
  const { data: squad } = await supabaseAdmin
    .from('squads')
    .select('id, gender, squad_code, ped_name, ped_phone, ped_email, roster_locked, payment_status, bid_block_start, bid_block_end, colleges(name, code, district)')
    .eq('id', session.squadId)
    .single();

  const college = Array.isArray(squad?.colleges) ? squad.colleges[0] : squad?.colleges;
  const isMen = squad?.gender === 'men';

  return (
    <div className="container" id="squad-dashboard-container">
      {/* Top Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '2rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '1.8rem' }}>{isMen ? '🚹' : '🚺'}</span>
            <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>
              {college?.name || session.collegeName}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            <span>
              Squad Code: <strong style={{ color: '#fff' }}>{squad?.squad_code}</strong>
            </span>
            <span>•</span>
            <span>
              Division: <strong style={{ color: isMen ? 'var(--accent-cyan)' : 'var(--accent-rose)' }}>{squad?.gender?.toUpperCase()}</strong>
            </span>
            <span>•</span>
            <span>
              District: <strong>{college?.district || 'Karnataka'}</strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className={`badge badge-${squad?.payment_status?.toLowerCase() || 'draft'}`}>
            Payment: {squad?.payment_status}
          </span>
          <span
            style={{
              padding: '0.35rem 0.8rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: squad?.roster_locked ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: squad?.roster_locked ? '#f43f5e' : '#34d399',
              border: `1px solid ${squad?.roster_locked ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
              textTransform: 'uppercase',
            }}
          >
            {squad?.roster_locked ? '🔒 Roster Locked' : '🔓 Roster Open'}
          </span>
        </div>
      </div>

      {/* Roster & Registration Action Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass-card" id="card-athletes-roster">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 700, textTransform: 'uppercase' }}>
                Stage 1 — Athlete Roster
              </div>
              <h2 style={{ fontSize: '1.3rem', marginTop: '0.25rem' }}>Individual Athletes</h2>
            </div>
            <div style={{ fontSize: '1.8rem' }}>👟</div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            Register student athletes with USN, SSLC name, blood group, and select up to 2 regular events + 1 reserve event.
          </p>
          <Link href="/squad/athletes" className="btn btn-primary" style={{ width: '100%' }} id="btn-manage-athletes">
            Manage Athletes & Events →
          </Link>
        </div>

        <div className="glass-card" id="card-relay-team">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 700, textTransform: 'uppercase' }}>
                Stage 2 — Team Relay
              </div>
              <h2 style={{ fontSize: '1.3rem', marginTop: '0.25rem' }}>4x100m &amp; 4x400m Teams</h2>
            </div>
            <div style={{ fontSize: '1.8rem' }}>🤝</div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            Assign 4 running members and up to 2 reserve runners for your squad&apos;s relay entries.
          </p>
          <Link href="/squad/relay" className="btn btn-secondary" style={{ width: '100%' }} id="btn-manage-relay">
            Compose Relay Squads →
          </Link>
        </div>

        <div className="glass-card" id="card-payment-fee">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 700, textTransform: 'uppercase' }}>
                Stage 3 — Settlement
              </div>
              <h2 style={{ fontSize: '1.3rem', marginTop: '0.25rem' }}>Entry Fee Payment</h2>
            </div>
            <div style={{ fontSize: '1.8rem' }}>💳</div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            View computed fee breakdown (₹100/event), scan host UPI QR code, and submit UTR with transaction receipt.
          </p>
          <Link href="/squad/payment" className="btn btn-secondary" style={{ width: '100%' }} id="btn-view-payment">
            Settle Entry Fees →
          </Link>
        </div>
      </div>

      {/* Roster Guidelines Alert */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem 2rem',
          borderLeft: '4px solid var(--accent-gold)',
        }}
      >
        <h3 style={{ fontSize: '1.05rem', color: '#fff', marginBottom: '0.5rem' }}>
          📋 VTU Athletics Rules & Quotas for this Squad:
        </h3>
        <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', paddingLeft: '1.25rem', lineHeight: '1.7' }}>
          <li>Maximum <strong>2 regular individual events</strong> per athlete.</li>
          <li>Maximum <strong>1 reserve event</strong> per athlete (free of charge).</li>
          <li>Relay runners and Half Marathon entries do not consume individual event quotas.</li>
          <li>Once fee payment is submitted, roster is automatically locked. Any changes require Meet Director approval.</li>
          <li>Bib/Chest numbers will be generated automatically after the registration deadline closes.</li>
        </ul>
      </div>
    </div>
  );
}
