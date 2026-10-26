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
          </div>

          <div className="univ-nav-auth">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: '#1e3a8a',
                fontSize: '0.825rem',
                fontWeight: 700,
                padding: '0.35rem 0.85rem',
                background: '#eff6ff',
                borderRadius: '8px',
                border: '1px solid #bfdbfe',
              }}
            >
              <span>🏛️ {session.collegeName || session.collegeCode}</span>
              <span style={{ color: '#b45309', marginLeft: '0.25rem' }}>
                ({isMen ? "Men's Section" : "Women's Section"})
              </span>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="univ-btn-portal"
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  background: '#fef2f2',
                  color: '#b91c1c',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  fontWeight: 700,
                }}
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
