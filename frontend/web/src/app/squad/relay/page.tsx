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
    .select('roster_locked, squad_code')
    .eq('id', session.squadId)
    .single();

  // Fetch athletes in this squad
  const { data: athletes } = await supabaseAdmin
    .from('profiles')
    .select('id, sslc_name, usn')
    .eq('squad_id', session.squadId)
    .order('sslc_name', { ascending: true });

  const relayTeams = await getSquadRelayTeamsAction();

  return (
    <div id="squad-relay-page" style={{ width: '100%', maxWidth: '100%' }}>
      <RelayManager
        relayTeams={relayTeams}
        athletes={athletes || []}
        rosterLocked={squad?.roster_locked || false}
        squadCode={squad?.squad_code || session.squadCode || ''}
      />
    </div>
  );
}
