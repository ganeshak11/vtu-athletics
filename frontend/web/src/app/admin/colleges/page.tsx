import { requireAdmin } from '@/lib/auth-guard';
import { listCollegesAction } from '@/app/actions/admin';
import Link from 'next/link';
import CollegesManager from './CollegesManager';

export const metadata = {
  title: 'Colleges & Squads Management — VTU SportsOS Admin',
};

export default async function AdminCollegesPage() {
  await requireAdmin();
  const colleges = await listCollegesAction();

  return (
    <div className="container" id="admin-colleges-page">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <Link href="/admin/colleges" style={{ color: 'var(--accent-cyan)', fontWeight: 800, textDecoration: 'none', fontSize: '0.95rem' }}>
          Colleges &amp; Squads
        </Link>
        <span style={{ color: 'var(--text-secondary)' }}>•</span>
        <Link href="/admin/staff" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.95rem' }}>
          Officials &amp; Staff
        </Link>
        <span style={{ color: 'var(--text-secondary)' }}>•</span>
        <Link href="/admin/bids" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.95rem' }}>
          Bid Numbers
        </Link>
        <span style={{ color: 'var(--text-secondary)' }}>•</span>
        <Link href="/admin/amendments" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.95rem' }}>
          Roster Amendments
        </Link>
        <span style={{ color: 'var(--text-secondary)' }}>•</span>
        <Link href="/admin/schedule" style={{ color: 'var(--accent-gold)', fontWeight: 700, textDecoration: 'none', fontSize: '0.95rem' }}>
          Schedule &amp; Heats ⚡
        </Link>
      </div>

      <CollegesManager initialColleges={colleges} />
    </div>
  );
}
