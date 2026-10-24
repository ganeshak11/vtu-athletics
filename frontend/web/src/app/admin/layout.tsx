import Link from 'next/link';
import { requireAdmin } from '@/lib/auth-guard';
import { logoutAction } from '@/app/actions/auth';
import { OfficialBanner } from '@/components/layout/OfficialBanner';
import '@/components/layout/Navbar.css';
import './admin.css';

export const metadata = {
  title: 'VTU Athletics — Administrative Suite',
  description: 'Directorate Meet Administration, Roster Management, Payments & Accreditations',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  return (
    <div className="admin-shell">
      {/* 1 & 2. OFFICIAL TOP BANNER WITH DR. ACSCE & VTU EMBLEMS */}
      <OfficialBanner portalBadge="DIRECTORATE ADMINISTRATIVE SUITE &bull; CENTRAL COMMAND" />

      {/* 3. SOLID DEEP NAVY ADMINISTRATIVE NAV BAR */}
      <nav className="univ-main-nav">
        <div className="univ-nav-inner">
          <div className="univ-nav-menu">
            <Link href="/admin" className="univ-nav-link">
              <span>📊 Dashboard</span>
            </Link>
            <Link href="/admin/athletes" className="univ-nav-link">
              <span>🏃 Athletes Management</span>
            </Link>
            <Link href="/admin/payments" className="univ-nav-link">
              <span>💳 Payment Verification</span>
            </Link>
            <Link href="/admin/id-cards" className="univ-nav-link">
              <span>🪪 ID Cards Studio</span>
            </Link>
            <Link href="/admin/heats" className="univ-nav-link">
              <span>⏱️ Track Heats</span>
            </Link>
            <Link href="/admin/delegations" className="univ-nav-link">
              <span>📋 Delegations</span>
            </Link>
            <Link href="/admin/audit" className="univ-nav-link">
              <span>📜 Audit Log</span>
            </Link>
          </div>

          <div className="univ-nav-auth">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 700, padding: '0.35rem 0.75rem', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
              <span>🛡️ {session.displayName || 'Meet Director'}</span>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="univ-btn-portal univ-btn-admin"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* Main Administrative Container - Fluid Full Width */}
      <main className="admin-container">
        {children}
      </main>
    </div>
  );
}
