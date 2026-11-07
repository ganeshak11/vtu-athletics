import Link from 'next/link';
import { requireRegistrationDesk } from '@/lib/auth-guard';
import { logoutAction } from '@/app/actions/auth';
import { OfficialBanner } from '@/components/layout/OfficialBanner';
import '@/components/layout/Navbar.css';
import '@/app/admin/admin.css';

export const metadata = {
  // Private portal: keep out of search results
  robots: { index: false, follow: false },
  title: 'Registration Desk — VTU SportsOS',
  description: 'Contingent reporting and attendance marking at the venue Registration Desk',
};

export default async function RegistrationDeskLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRegistrationDesk();
  const isAdmin = session.role === 'meet_admin';

  return (
    <div className="admin-shell">
      <OfficialBanner portalBadge="REGISTRATION DESK &bull; CONTINGENT REPORTING" />

      <nav className="univ-main-nav">
        <div className="univ-nav-inner">
          <div className="univ-nav-menu">
            <Link href="/registration-desk" className="univ-nav-link">
              <span>✅ Contingent Attendance</span>
            </Link>
            {isAdmin && (
              <Link href="/admin" className="univ-nav-link">
                <span>← Admin Suite</span>
              </Link>
            )}
          </div>

          <div className="univ-nav-auth">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0f172a', fontSize: '0.825rem', fontWeight: 700, padding: '0.35rem 0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <span>🗂️ {session.displayName || 'Registration Desk'}</span>
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

      <main className="admin-container">{children}</main>
    </div>
  );
}
