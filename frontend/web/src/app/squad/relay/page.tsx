import { requireSquad } from '@/lib/auth-guard';
import { supabaseAdmin } from '@/lib/supabase';
import { getSquadRelayTeamsAction } from '@/app/actions/relay';
import RelayManager from './RelayManager';

export const metadata = {
  title: 'Relay Teams — VTU SportsOS Squad',
};

export default async function SquadRelayPage() {
  const session = await requireSquad();

  const { data: squad } = await supabaseAdmin
    .from('squads')
    .select('roster_locked, squad_code, college_id, gender')
    .eq('id', session.squadId)
    .single();

  // Fetch all squads for this college (Men and Women squads)
  const { data: collegeSquads } = await supabaseAdmin
    .from('squads')
    .select('id, squad_code, gender')
    .eq('college_id', squad?.college_id);

  const menSquad = (collegeSquads || []).find((s: any) => s.gender === 'men');
  const womenSquad = (collegeSquads || []).find((s: any) => s.gender === 'women');

  // Fetch Men athletes
  let menAthletes: { id: string; sslc_name: string; usn: string }[] = [];
  if (menSquad) {
    const { data: mData } = await supabaseAdmin
      .from('profiles')
      .select('id, sslc_name, usn')
      .eq('squad_id', menSquad.id)
      .order('sslc_name', { ascending: true });
    menAthletes = mData || [];
  }

  // Fetch Women athletes
  let womenAthletes: { id: string; sslc_name: string; usn: string }[] = [];
  if (womenSquad) {
    const { data: wData } = await supabaseAdmin
      .from('profiles')
      .select('id, sslc_name, usn')
      .eq('squad_id', womenSquad.id)
      .order('sslc_name', { ascending: true });
    womenAthletes = wData || [];
  }

  const relayTeams = await getSquadRelayTeamsAction();

  return (
    <div id="squad-relay-page" style={{ width: '100%', maxWidth: '100%' }}>
      <RelayManager
        relayTeams={relayTeams}
        menAthletes={menAthletes}
        womenAthletes={womenAthletes}
        squadGender={session.gender as 'men' | 'women'}
        rosterLocked={squad?.roster_locked || false}
        squadCode={squad?.squad_code || session.squadCode || ''}
      />
    </div>
  );
}
