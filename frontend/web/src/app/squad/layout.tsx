import Link from 'next/link';
import { requireSquad } from '@/lib/auth-guard';
import { logoutAction } from '@/app/actions/auth';
import { OfficialBanner } from '@/components/layout/OfficialBanner';
import '@/components/layout/Navbar.css';

export const metadata = {
  title: 'VTU Athletics — Institution Delegation Portal',
  description: 'Affiliated Institution Squad Registration, Athletes Roster, Relay Teams & Fee Settlement',
};

export default async function SquadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSquad();
  const isMen = session.gender === 'men';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* 1. Official Top Banner with Bilingual Crest & Dual Emblems (ACSCE left, VTU right) */}
      <OfficialBanner portalBadge="INSTITUTION DELEGATION PORTAL &bull; 26TH ATHLETICS CHAMPIONSHIP" />

      {/* 2. Solid Deep Navy Navigation Bar */}
      <nav className="univ-main-nav">
        <div className="univ-nav-inner">
          <div className="univ-nav-menu">
            <Link href="/squad/dashboard" className="univ-nav-link">
              <span>📊 Contingent Overview</span>
            </Link>
            <Link href="/squad/athletes" className="univ-nav-link">
              <span>🏃 Athlete Roster &amp; Events</span>
            </Link>
            <Link href="/squad/relay" className="univ-nav-link">
              <span>🔄 4x100m Relay</span>
            </Link>
            <Link href="/squad/payment" className="univ-nav-link">
              <span>💳 Fee Settlement</span>
            </Link>
            <Link href="/squad/cards" className="univ-nav-link">
              <span>🪪 ID Cards &amp; Badges</span>
            </Link>
          </div>

          <div className="univ-nav-auth">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: '#f8fafc',
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '0.35rem 0.75rem',
                background: 'rgba(255, 255, 255, 0.12)',
                borderRadius: '4px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <span>🏛️ {session.collegeName || session.collegeCode}</span>
              <span style={{ color: '#fbbf24', marginLeft: '0.25rem' }}>
                ({isMen ? "Men's Section" : "Women's Section"})
              </span>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="univ-btn-portal univ-btn-admin"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* Main Institution Content - Fluid Full-Screen Width */}
      <main style={{ flex: 1, width: '100%', maxWidth: '100%', padding: '1.75rem 2.5rem' }}>
        {children}
      </main>
    </div>
  );
}
