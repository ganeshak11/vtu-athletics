import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { logoutAction } from '@/app/actions/auth';

export const metadata: Metadata = {
  title: 'VTU SportsOS — Central Inter-Collegiate Athletics Platform',
  description: 'Official athletic management, accreditation, heat seeding, and real-time live scoring system for VTU athletic meets.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <header className="app-header" id="main-header">
          <Link href="/" className="brand-badge" id="nav-brand-logo">
            <div className="brand-logo-glow">V</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
                VTU SportsOS
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Athletics 2026
              </div>
            </div>
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <Link href="/live" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} id="nav-link-live">
              🔴 Live Results
            </Link>
            <Link href="/leaderboard" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} id="nav-link-leaderboard">
              🏆 Standings
            </Link>

            {session.isLoggedIn ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {session.displayName}
                </span>
                <form action={logoutAction}>
                  <button type="submit" className="btn btn-danger" style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }} id="btn-logout">
                    Logout
                  </button>
                </form>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Link href="/login/squad" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} id="nav-link-squad-login">
                  Squad Login
                </Link>
                <Link href="/login/admin" className="btn btn-secondary" style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem' }} id="nav-link-admin-login">
                  Staff
                </Link>
              </div>
            )}
          </nav>
        </header>

        <main id="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
