import { requireSquad } from '@/lib/auth-guard';
import { OfficialBanner } from '@/components/layout/OfficialBanner';
import { SquadNav } from './SquadNav';
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

      {/* 2. Responsive Sticky Navigation Bar with Active Tabs */}
      <SquadNav
        collegeName={session.collegeName}
        collegeCode={session.collegeCode}
        gender={session.gender as 'men' | 'women'}
      />

      {/* Main Institution Content - Fluid Full-Screen Width */}
      <main style={{ flex: 1, width: '100%', maxWidth: '100%', padding: '1.75rem 2.5rem' }}>
        {children}
      </main>
    </div>
  );
}
