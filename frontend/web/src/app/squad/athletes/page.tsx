import { requireSquad } from '@/lib/auth-guard';
import { supabaseAdmin } from '@/lib/supabase';
import { listSquadAthletesAction, getAvailableEventsAction, getSquadRelayCountAction } from '@/app/actions/athletes';
import AthletesManager from './AthletesManager';

export const metadata = {
  title: 'Athlete Roster — VTU SportsOS Squad',
};

export default async function SquadAthletesPage() {
  const session = await requireSquad();

  // Fetch squad status
  const { data: squad } = await supabaseAdmin
    .from('squads')
    .select('roster_locked, squad_code, gender')
    .eq('id', session.squadId)
    .single();

  const athletes = await listSquadAthletesAction();
  const events = await getAvailableEventsAction();
  const relayCount = await getSquadRelayCountAction();

  // Transform registrations to match interface
  const formattedAthletes = athletes.map((a: any) => ({
    ...a,
    registrations: a.registrations.map((r: any) => ({
      id: r.id,
      kind: r.kind,
      event_id: r.event_id,
      events: Array.isArray(r.events) ? r.events[0] : r.events,
    })),
  }));

  return (
    <div id="squad-athletes-page" style={{ width: '100%', maxWidth: '100%' }}>
      <AthletesManager
        initialAthletes={formattedAthletes}
        availableEvents={events}
        rosterLocked={squad?.roster_locked || false}
        squadCode={squad?.squad_code || session.squadCode || ''}
        gender={session.gender as 'men' | 'women'}
        relayCount={relayCount}
      />
    </div>
  );
}
