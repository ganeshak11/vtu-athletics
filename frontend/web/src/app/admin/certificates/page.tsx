import { requireAdmin } from '@/lib/auth-guard';
import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';
import { CertificatesView, type Placer, type Athlete } from './certificates-view';

export const metadata = {
  title: 'Official Certificates Generator — VTU SportsOS',
};

export default async function AdminCertificatesPage() {
  await requireAdmin();

  // Fetch all awarded points/placers (1st, 2nd, 3rd)
  const { data: placersRaw } = await supabaseAdmin
    .from('team_points')
    .select(`
      id,
      place,
      points,
      created_at,
      events(id, name, code, gender, category),
      colleges(id, name, code, district),
      profiles(id, sslc_name, usn, bid_number)
    `)
    .lte('place', 3)
    .order('created_at', { ascending: false });

  // Fetch all accredited athletes for Participation Certificates
  const { data: athletesRaw } = await supabaseAdmin
    .from('profiles')
    .select(`
      id,
      sslc_name,
      usn,
      bid_number,
      squads(colleges(name, code, district))
    `)
    .eq('accreditation_status', 'ACCREDITED')
    .order('sslc_name');

  const placers: Placer[] = ((placersRaw || []) as any[]).map((p) => ({
    id: p.id,
    place: p.place,
    points: p.points,
    created_at: p.created_at,
    events: Array.isArray(p.events) ? p.events[0] : p.events,
    colleges: Array.isArray(p.colleges) ? p.colleges[0] : p.colleges,
    profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
  }));

  const athletes: Athlete[] = ((athletesRaw || []) as any[]).map((a) => {
    const squad = Array.isArray(a.squads) ? a.squads[0] : a.squads;
    const college = squad && Array.isArray(squad.colleges) ? squad.colleges[0] : squad?.colleges;
    return {
      id: a.id,
      sslc_name: a.sslc_name,
      usn: a.usn,
      bid_number: a.bid_number,
      squads: {
        colleges: college,
      },
    };
  });

  return (
    <div className="container" id="admin-certificates-container">
      {/* Top Breadcrumb & Heading */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }} className="no-print">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <Link href="/admin/colleges" style={{ color: 'var(--accent-cyan)', textDecoration: 'none', fontSize: '0.9rem' }}>
              Colleges
            </Link>
            <span style={{ color: 'var(--text-secondary)' }}>•</span>
            <Link href="/admin/schedule" style={{ color: 'var(--accent-cyan)', textDecoration: 'none', fontSize: '0.9rem' }}>
              Schedule &amp; Heats
            </Link>
            <span style={{ color: 'var(--text-secondary)' }}>•</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>Official Certificates</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>
            Official Merit &amp; Participation Certificates
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            High-resolution printable landscape certificates with security QR verification and digital signature seals
          </p>
        </div>
      </div>

      <CertificatesView
        placers={placers}
        athletes={athletes}
      />
    </div>
  );
}
