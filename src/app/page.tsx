import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="container" id="landing-page-container">
      <section className="hero-banner" id="hero-section">
        <div style={{ display: 'inline-block', padding: '0.4rem 1rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '9999px', color: 'var(--accent-gold)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Official VTU Athletics Meet Engine
        </div>
        <h1 className="hero-title" id="main-heading">
          Precision Meet Operations & Real-Time Scoring
        </h1>
        <p className="hero-subtitle">
          From decentralized collegiate squad registration and automated heat seeding to offline accreditation scanning and live championship leaderboards.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/login/squad" className="btn btn-primary" id="btn-hero-squad" style={{ padding: '0.9rem 2rem', fontSize: '1.05rem' }}>
            College Squad Portal →
          </Link>
          <Link href="/live" className="btn btn-secondary" id="btn-hero-live" style={{ padding: '0.9rem 2rem', fontSize: '1.05rem' }}>
            🔴 Live Results & Heats
          </Link>
          <Link href="/login/admin" className="btn btn-secondary" id="btn-hero-staff" style={{ padding: '0.9rem 1.75rem', fontSize: '1.05rem' }}>
            Meet Officials Portal
          </Link>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
        {/* Squad Portal Card */}
        <div className="glass-card" id="card-squad-portal">
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🏫</div>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: '#f8fafc' }}>
            Collegiate Squads
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1.25rem' }}>
            Principals and Physical Education Directors (PEDs) log in with their secure squad passphrase to register athletes, enforce quotas, and settle entry fees via UPI QR code.
          </p>
          <Link href="/login/squad" className="btn btn-primary" style={{ width: '100%' }} id="btn-portal-squad">
            Login as Squad (Men / Women)
          </Link>
        </div>

        {/* Live Arena Card */}
        <div className="glass-card" id="card-live-arena">
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚡</div>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: '#f8fafc' }}>
            Live Championship Arena
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1.25rem' }}>
            Live heat rosters, lane assignments, track times, field attempts, and real-time team championship standings computed automatically with tie-breakers.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link href="/live" className="btn btn-secondary" style={{ flex: 1 }} id="btn-card-live">
              Live Results
            </Link>
            <Link href="/leaderboard" className="btn btn-secondary" style={{ flex: 1 }} id="btn-card-standings">
              Leaderboard
            </Link>
          </div>
        </div>

        {/* Operations Portal Card */}
        <div className="glass-card" id="card-operations-portal">
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🛡️</div>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: '#f8fafc' }}>
            Operations & Officials
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '1.25rem' }}>
            Dedicated portals for Meet Directors, Finance Verification, Gate Accreditation, Hostel Wardens, Call Room Marshals, and Field/Track Referees.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link href="/login/admin" className="btn btn-secondary" style={{ flex: 1 }} id="btn-portal-admin">
              Admin Login
            </Link>
            <Link href="/login/staff" className="btn btn-secondary" style={{ flex: 1 }} id="btn-portal-pin">
              Staff PIN Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
