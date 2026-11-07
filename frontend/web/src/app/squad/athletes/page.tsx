import { requireSquad } from '@/lib/auth-guard';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizePaymentStatus } from '@/lib/payment-status';
import { listSquadAthletesAction, getAvailableEventsAction, getSquadRelayCountAction } from '@/app/actions/athletes';
import AthletesManager from './AthletesManager';
import { canEditRoster, isLateEntryWindow } from '@/lib/roster-window';
import { calculateSquadFees, MIXED_RELAY_CODE } from '@/lib/payments';

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
  // Total dues come from the same calculation as the payment page, so both always agree
  const fees = await calculateSquadFees(session.squadId);

  // The 4x400m Mixed Relay team is shared with the other division of this college:
  // count their nominations too, so the "₹100 / free reserve" hint on the form is right.
  let siblingMixedCount = 0;
  if (squad?.college_id) {
    const [{ data: mixedEvent }, { data: siblingSquads }] = await Promise.all([
      supabaseAdmin.from('events').select('id').eq('code', MIXED_RELAY_CODE).maybeSingle(),
      supabaseAdmin.from('squads').select('id').eq('college_id', squad.college_id).neq('id', session.squadId),
    ]);
    const siblingIds = (siblingSquads || []).map((s: any) => s.id);
    if (mixedEvent?.id && siblingIds.length > 0) {
      const { data: siblingProfiles } = await supabaseAdmin.from('profiles').select('id').in('squad_id', siblingIds);
      const ids = (siblingProfiles || []).map((p: any) => p.id);
      if (ids.length > 0) {
        const { count } = await supabaseAdmin
          .from('registrations')
          .select('id', { count: 'exact', head: true })
          .eq('kind', 'relay')
          .eq('event_id', mixedEvent.id)
          .in('profile_id', ids);
        siblingMixedCount = count || 0;
      }
    }
  }

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
        totalDues={fees.totalAmount}
        siblingMixedCount={siblingMixedCount}
      />
    </div>
  );
}
