import Link from 'next/link';
import { OfficialBanner } from '@/components/layout/OfficialBanner';
import '@/components/layout/Navbar.css';

export const metadata = {
  title: 'VTU Athletics — Secure Authentication Desk',
  description: 'Official Secure Access Desk for Affiliated Institutions and Directorate Administration',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* 1. Official Top Banner with Bilingual Crest & Dual Emblems (ACSCE left, VTU right) */}
      <OfficialBanner portalBadge="SECURE AUTHENTICATION DESK &bull; 26TH ATHLETICS CHAMPIONSHIP" />

      {/* 2. Solid Deep Navy Sub-Navigation Bar */}
      <nav className="univ-main-nav">
        <div className="univ-nav-inner">
          <div className="univ-nav-menu">
            <Link href="/" className="univ-nav-link">
              <span>&larr; Back to Championship Information</span>
            </Link>
            <Link href="/#schedule" className="univ-nav-link">
              <span>📅 Event Schedule</span>
            </Link>
            <Link href="/#rules" className="univ-nav-link">
              <span>📜 Technical Rules</span>
            </Link>
            <Link href="/#venue" className="univ-nav-link">
              <span>📍 Host Venue &amp; Map</span>
            </Link>
          </div>

          <div className="univ-nav-auth">
            <Link
              href="/login/squad"
              className="univ-btn-portal univ-btn-institution"
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
            >
              🏛️ Institution Login
            </Link>
            <Link
              href="/login/admin"
              className="univ-btn-portal univ-btn-admin"
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
            >
              🛡️ Admin Login
            </Link>
          </div>
        </div>
      </nav>

      {/* 3. Main Login Content Area */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1.5rem', width: '100%' }}>
        {children}
      </main>

      {/* 4. Official Minimal Government Footer */}
      <footer style={{ background: '#0b2545', borderTop: '3px solid #b45309', padding: '1rem 2rem', color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center' }}>
        <p style={{ margin: 0 }}>
          &copy; 2026 Directorate of Physical Education &amp; Sports, Visvesvaraya Technological University (VTU), Belagavi. Hosted by Dr. ACS College of Engineering, Bengaluru.
        </p>
      </footer>
    </div>
  );
}
