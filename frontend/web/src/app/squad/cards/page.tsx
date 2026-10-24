import { requireSquad } from '@/lib/auth-guard';
import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';
import { CardsPrintView } from './cards-view';

export const metadata = {
  title: 'Print Accreditation Cards — VTU SportsOS',
};

export default async function SquadCardsPage() {
  const session = await requireSquad();

  // Fetch squad details
  const { data: squad } = await supabaseAdmin
    .from('squads')
    .select('id, gender, squad_code, ped_name, ped_phone, colleges(name, code, district)')
    .eq('id', session.squadId)
    .single();

  const college = Array.isArray(squad?.colleges) ? squad.colleges[0] : squad?.colleges;

  // Fetch registered athletes with events
  const { data: athletes } = await supabaseAdmin
    .from('profiles')
    .select(`
      id,
      sslc_name,
      usn,
      semester,
      blood_group,
      bid_number,
      accreditation_status,
      accommodation_checked_in,
      registrations(
        kind,
        events(name, code, category)
      )
    `)
    .eq('squad_id', session.squadId)
    .neq('accreditation_status', 'WITHDRAWN')
    .order('bid_number', { ascending: true, nullsFirst: false });

  return (
    <div id="cards-page-container" style={{ width: '100%', maxWidth: '100%' }}>
      {/* Navigation breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }} className="no-print">
        <div>
          <Link href="/squad/dashboard" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontSize: '0.9rem' }}>
            ← Back to Squad Dashboard
          </Link>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.4rem' }}>
            Official Athlete Accreditation Cards
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {college?.name} ({squad?.squad_code}) • Print ready badge cards for gate accreditation & hostel check-in
          </p>
        </div>
      </div>

      <CardsPrintView
        athletes={athletes || []}
        collegeName={college?.name || session.collegeName}
        squadCode={squad?.squad_code || ''}
        gender={squad?.gender || 'men'}
        pedName={squad?.ped_name || 'Physical Education Director'}
      />
    </div>
  );
}
