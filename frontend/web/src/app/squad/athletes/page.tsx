import { requireSquad } from '@/lib/auth-guard';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizePaymentStatus } from '@/lib/payment-status';
import { listSquadAthletesAction, getAvailableEventsAction, getSquadRelayCountAction } from '@/app/actions/athletes';
import AthletesManager from './AthletesManager';
import { canEditRoster, isLateEntryWindow } from '@/lib/roster-window';

export const metadata = {
  title: 'Athlete Roster — VTU SportsOS Squad',
};

export default async function SquadAthletesPage() {
  const session = await requireSquad();

  // Fetch squad status
  const { data: squad } = await supabaseAdmin
    .from('squads')
    .select('*')
    .eq('id', session.squadId)
    .single();

  const { data: meetSettings } = await supabaseAdmin
    .from('meet_settings')
    .select('registration_open')
    .limit(1)
    .maybeSingle();
  const registrationOpen = meetSettings?.registration_open !== false;
  const lateEntryOpen = isLateEntryWindow(registrationOpen, squad);
  const registrationClosed = !registrationOpen && !lateEntryOpen;

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
        rosterLocked={!canEditRoster(registrationOpen, squad)}
        registrationClosed={registrationClosed}
        lateEntryOpen={lateEntryOpen}
        paymentStatus={normalizePaymentStatus(squad?.payment_status)}
        squadCode={squad?.squad_code || session.squadCode || ''}
        gender={session.gender as 'men' | 'women'}
        relayCount={relayCount}
      />
    </div>
  );
}
