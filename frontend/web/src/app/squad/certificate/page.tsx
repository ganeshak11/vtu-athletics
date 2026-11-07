import Link from 'next/link';
import { requireSquad } from '@/lib/auth-guard';
import { supabaseAdmin } from '@/lib/supabase';
import AttendanceCertificate from './AttendanceCertificate';

export const metadata = {
  title: 'Attendance Certificate — VTU SportsOS Squad',
};

export const dynamic = 'force-dynamic';

export default async function SquadCertificatePage() {
  const session = await requireSquad();

  // colleges.* so this page still loads before migration 0022 adds the attendance columns
  const [{ data: college }, { data: squads }] = await Promise.all([
    supabaseAdmin.from('colleges').select('*').eq('id', session.collegeId).maybeSingle(),
    supabaseAdmin.from('squads').select('id, gender, ped_name').eq('college_id', session.collegeId),
  ]);

  const markedAt: string | null = college?.attendance_marked_at ?? null;

  // Locked until the Registration Desk marks this college as attended. Nothing of the
  // certificate is sent to the browser before that, so it cannot be viewed or printed.
  if (!college || !markedAt) {
    return (
      <div style={{ width: '100%', maxWidth: '720px', margin: '2rem auto', padding: '0 16px' }}>
        <div
          id="certificate-locked"
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #64748b',
            borderRadius: '12px',
            padding: 'clamp(1.25rem, 4vw, 2rem)',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }} aria-hidden="true">🔒</div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
            Attendance Certificate locked
          </h1>
          <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Your college&apos;s Attendance Certificate will be available here after your contingent reports at the{' '}
            <strong>Registration Desk</strong> at Dr. ACS College of Engineering during the meet (7 – 10 December 2026) and
            the desk marks your college as attended.
          </p>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.75rem' }}>
            Once unlocked it can be downloaded or printed from this page.
          </p>
          <Link
            href="/squad/dashboard"
            style={{ display: 'inline-block', marginTop: '1rem', color: '#1e3a8a', fontWeight: 700, textDecoration: 'none' }}
          >
            ← Back to Contingent Overview
          </Link>
        </div>
      </div>
    );
  }

  const own = (squads || []).find((s: any) => s.id === session.squadId);
  const other = (squads || []).find((s: any) => s.id !== session.squadId);
  const pedName = (own?.ped_name || other?.ped_name || '').trim();

  return (
    <AttendanceCertificate
      collegeName={college.name}
      district={college.district || ''}
      collegeCode={college.code}
      pedName={pedName}
      menCount={Number(college.attendance_men_count || 0)}
      womenCount={Number(college.attendance_women_count || 0)}
      markedAt={markedAt}
    />
  );
}
