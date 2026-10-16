import Link from 'next/link';

export const metadata = {
  title: 'Live Arena & Track Heats — VTU SportsOS',
};

export default function LiveArenaPage() {
  return (
    <div className="container" id="live-arena-page">
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔴</div>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 900, marginBottom: '0.75rem' }}>
          Championship Live Results &amp; Heats
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 2rem', lineHeight: '1.6' }}>
          Meet events are currently in registration and seeding phase. Once registration closes and heats are drawn by the Technical Director, live heat lists, lane seeds, and photo-finish timings will stream here in real time.
        </p>

        <div className="glass-panel" style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem', textAlign: 'left' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--accent-gold)' }}>
            📅 Upcoming Competition Schedule:
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
              <span>Day 1 — 100m Heats, Shot Put Men &amp; Women, 5000m Final</span>
              <span style={{ color: 'var(--accent-cyan)' }}>Track &amp; Field</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
              <span>Day 2 — 200m Heats, 800m Heats, High Jump Men, Long Jump Women</span>
              <span style={{ color: 'var(--accent-cyan)' }}>Track &amp; Field</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
              <span>Day 3 — 4x100m Relays, 400m Finals, Discus Throw, Pole Vault</span>
              <span style={{ color: 'var(--accent-cyan)' }}>Finals</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
              <span>Day 4 — 21km Half Marathon, 4x400m Relays &amp; Valedictory Ceremony</span>
              <span style={{ color: 'var(--accent-gold)' }}>Grand Finale</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '2.5rem' }}>
          <Link href="/" className="btn btn-secondary">
            ← Return to Home Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
