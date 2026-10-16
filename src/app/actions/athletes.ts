'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireSquad } from '@/lib/auth-guard';
import { revalidatePath } from 'next/cache';

export interface AddAthleteResult {
  success: boolean;
  error?: string;
  athleteId?: string;
}

/**
 * Registers a new student-athlete for the current squad.
 * Validates individual event quotas and prevents registration if roster is locked.
 */
export async function addAthleteAction(formData: FormData): Promise<AddAthleteResult> {
  const session = await requireSquad();

  // Check if squad roster is locked
  const { data: squad } = await supabaseAdmin
    .from('squads')
    .select('roster_locked')
    .eq('id', session.squadId)
    .single();

  if (squad?.roster_locked) {
    return { success: false, error: 'Roster is locked. Contact the Meet Director to request changes.' };
  }

  const sslcName = (formData.get('sslcName') as string || '').trim();
  const usn = (formData.get('usn') as string || '').trim().toUpperCase();
  const semester = parseInt(formData.get('semester') as string, 10);
  const bloodGroup = (formData.get('bloodGroup') as string || '').trim();
  const collegeJoiningDate = formData.get('collegeJoiningDate') as string;
  const semStartDate = formData.get('semStartDate') as string;

  const event1Id = formData.get('event1Id') as string;
  const event2Id = formData.get('event2Id') as string;
  const reserveEventId = formData.get('reserveEventId') as string;
  const isRelay = formData.get('isRelay') === 'true' || formData.get('isRelay') === 'on';
  const isHalfMarathon = formData.get('isHalfMarathon') === 'true' || formData.get('isHalfMarathon') === 'on';

  if (!sslcName || !usn || !semester || !bloodGroup || !collegeJoiningDate || !semStartDate) {
    return { success: false, error: 'All athlete identification fields are mandatory.' };
  }

  if (!event1Id) {
    return { success: false, error: 'Every athlete must be entered into at least one primary event (Event 1).' };
  }

  if (event2Id && event1Id === event2Id) {
    return { success: false, error: 'Event 1 and Event 2 cannot be the same event.' };
  }

  if (reserveEventId && (reserveEventId === event1Id || reserveEventId === event2Id)) {
    return { success: false, error: 'Reserve event must be different from regular events.' };
  }

  // Insert athlete profile
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .insert({
      squad_id: session.squadId,
      sslc_name: sslcName,
      usn,
      semester,
      blood_group: bloodGroup,
      college_joining_date: collegeJoiningDate,
      sem_start_date: semStartDate,
      accreditation_status: 'REGISTERED',
    })
    .select('id')
    .single();

  if (profileErr || !profile) {
    if (profileErr?.code === '23505') {
      return { success: false, error: `An athlete with USN '${usn}' is already registered in this squad.` };
    }
    return { success: false, error: profileErr?.message || 'Failed to save athlete profile.' };
  }

  type RegKind = 'regular' | 'reserve' | 'relay' | 'half_marathon';
  const registrationInserts: { profile_id: string; event_id: string; kind: RegKind }[] = [
    { profile_id: profile.id, event_id: event1Id, kind: 'regular' },
  ];

  if (event2Id) {
    registrationInserts.push({ profile_id: profile.id, event_id: event2Id, kind: 'regular' });
  }

  if (reserveEventId) {
    registrationInserts.push({ profile_id: profile.id, event_id: reserveEventId, kind: 'reserve' });
  }

  // If half-marathon selected, register in the gender-appropriate HM event
  if (isHalfMarathon) {
    const { data: hmEvent } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('code', session.gender === 'men' ? 'HM-M' : 'HM-W')
      .single();

    if (hmEvent) {
      registrationInserts.push({ profile_id: profile.id, event_id: hmEvent.id, kind: 'half_marathon' });
    }
  }

  // Insert registrations
  const { error: regErr } = await supabaseAdmin
    .from('registrations')
    .insert(registrationInserts);

  if (regErr) {
    // Rollback profile on error
    await supabaseAdmin.from('profiles').delete().eq('id', profile.id);
    return { success: false, error: regErr.message };
  }

  revalidatePath('/squad/athletes');
  revalidatePath('/squad/dashboard');

  return { success: true, athleteId: profile.id };
}

/**
 * Removes an athlete from the squad roster (allowed only while roster is unlocked).
 */
export async function deleteAthleteAction(profileId: string): Promise<{ success: boolean; error?: string }> {
  const session = await requireSquad();

  const { data: squad } = await supabaseAdmin
    .from('squads')
    .select('roster_locked')
    .eq('id', session.squadId)
    .single();

  if (squad?.roster_locked) {
    return { success: false, error: 'Cannot remove athletes while roster is locked.' };
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', profileId)
    .eq('squad_id', session.squadId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/squad/athletes');
  revalidatePath('/squad/dashboard');
  return { success: true };
}

/**
 * Lists all athletes registered in the current squad with their event breakdown.
 */
export async function listSquadAthletesAction() {
  const session = await requireSquad();

  const { data: athletes, error } = await supabaseAdmin
    .from('profiles')
    .select(`
      id,
      sslc_name,
      usn,
      semester,
      blood_group,
      college_joining_date,
      sem_start_date,
      bid_number,
      accreditation_status,
      created_at,
      registrations (
        id,
        kind,
        event_id,
        events (
          id,
          name,
          code,
          category
        )
      )
    `)
    .eq('squad_id', session.squadId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return athletes || [];
}

/**
 * Fetches events available for the current squad's gender division.
 */
export async function getAvailableEventsAction() {
  const session = await requireSquad();

  const { data: events, error } = await supabaseAdmin
    .from('events')
    .select('id, name, code, category, start_type, has_rounds')
    .eq('gender', session.gender)
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return events || [];
}
