'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireSquad } from '@/lib/auth-guard';
import { revalidatePath } from 'next/cache';
import { canEditRoster } from '@/lib/roster-window';

export interface RelayMemberDTO {
  profile_id: string;
  leg_order: number | null;
  is_reserve: boolean;
  athlete_name?: string;
  usn?: string;
  gender?: 'men' | 'women';
}

export interface RelayTeamDTO {
  id: string;
  event_id: string;
  event_name: string;
  event_code: string;
  is_mixed: boolean;
  members: RelayMemberDTO[];
  /** Athletes nominated for THIS relay event at registration — the only ones selectable */
  eligible_profile_ids: string[];
}

/**
 * Roster mutation guard for relay compositions. Blocks when championship registration is
 * closed or when ANY of the given squads has a frozen roster (payment submitted / verified /
 * admin lock). Mixed relays span both squads of a college, so both are checked.
 */
async function getRelayMutationBlock(squadIds: string[]): Promise<string | null> {
  const ids = Array.from(new Set(squadIds.filter(Boolean)));
  const [{ data: meetSettings }, { data: squads, error: squadErr }] = await Promise.all([
    supabaseAdmin.from('meet_settings').select('registration_open').limit(1).maybeSingle(),
    supabaseAdmin.from('squads').select('*').in('id', ids),
  ]);

  if (squadErr || !squads || squads.length !== ids.length) {
    return 'Unable to verify squad roster status. Please try again.';
  }
  const registrationOpen = meetSettings?.registration_open !== false;
  const blocked = squads.find((s: any) => !canEditRoster(registrationOpen, s));
  if (blocked) {
    const division = blocked.gender === 'men' ? "Men's" : "Women's";
    if (!registrationOpen && blocked.roster_locked !== true) {
      return `Registration is officially closed. The ${division} squad has no late-entry window open, so relay teams cannot be modified. Contact the VTU Directorate.`;
    }
    if (!registrationOpen) {
      return 'Registration is officially closed. Relay teams cannot be modified.';
    }
    return `Roster Locked & Payment Submitted: The ${division} squad roster is frozen, so relay teams cannot be modified. Contact the VTU Directorate for an emergency unlock.`;
  }
  return null;
}

/**
 * Fetches or initializes the 4x100m, 4x400m, and 4x400m Mixed relay teams for the college.
 */
export async function getSquadRelayTeamsAction(): Promise<RelayTeamDTO[]> {
  const session = await requireSquad();

  // Get current squad and college_id
  const { data: currentSquad } = await supabaseAdmin
    .from('squads')
    .select('id, college_id, gender')
    .eq('id', session.squadId)
    .single();

  if (!currentSquad) return [];

  // Find all squads belonging to this college (both Men and Women squads)
  const { data: collegeSquads } = await supabaseAdmin
    .from('squads')
    .select('id, gender')
    .eq('college_id', currentSquad.college_id);

  const collegeSquadIds = (collegeSquads || []).map((s: any) => s.id);

  // Find relay events for this squad's gender + mixed
  const { data: relayEvents } = await supabaseAdmin
    .from('events')
    .select('id, name, code, gender')
    .in('gender', [session.gender, 'mixed'])
    .eq('category', 'relay')
    .order('code');

  if (!relayEvents || relayEvents.length === 0) return [];

  const teams: RelayTeamDTO[] = [];

  for (const ev of relayEvents) {
    const isMixed = ev.code === '4X400M-MIX' || ev.gender === 'mixed';
    let team: any = null;

    if (isMixed) {
      // 4x400m Mixed Relay is shared by the entire college.
      // Reuse existing team if already created by either Men's or Women's squad.
      const { data: existingMixedTeam } = await supabaseAdmin
        .from('relay_teams')
        .select('id, squad_id')
        .in('squad_id', collegeSquadIds)
        .eq('event_id', ev.id)
        .maybeSingle();

      if (existingMixedTeam) {
        team = existingMixedTeam;
      } else {
        const { data: newMixedTeam } = await supabaseAdmin
          .from('relay_teams')
          .insert({
            squad_id: session.squadId,
            event_id: ev.id,
          })
          .select('id, squad_id')
          .single();
        team = newMixedTeam;
      }
    } else {
      // Divisional relay (4x100m or 4x400m for this specific gender squad)
      const { data: existingDivisionalTeam } = await supabaseAdmin
        .from('relay_teams')
        .select('id, squad_id')
        .eq('squad_id', session.squadId)
        .eq('event_id', ev.id)
        .maybeSingle();

      if (existingDivisionalTeam) {
        team = existingDivisionalTeam;
      } else {
        const { data: newDivisionalTeam } = await supabaseAdmin
          .from('relay_teams')
          .insert({
            squad_id: session.squadId,
            event_id: ev.id,
          })
          .select('id, squad_id')
          .single();
        team = newDivisionalTeam;
      }
    }

    if (!team) continue;

    // Nomination pool: athletes who chose this relay event on the athlete registration form.
    // Divisional relay → own squad only; mixed relay → both squads of the college.
    const poolSquadIds = isMixed ? collegeSquadIds : [session.squadId];
    const { data: poolProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .in('squad_id', poolSquadIds);
    const poolProfileIds = (poolProfiles || []).map((p: any) => p.id);
    let eligibleIds: string[] = [];
    if (poolProfileIds.length > 0) {
      const { data: nominations } = await supabaseAdmin
        .from('registrations')
        .select('profile_id')
        .eq('event_id', ev.id)
        .eq('kind', 'relay')
        .in('profile_id', poolProfileIds);
      eligibleIds = (nominations || []).map((n: any) => n.profile_id);
    }

    // Fetch members with profiles and their squad's gender
    const { data: members } = await supabaseAdmin
      .from('relay_members')
      .select(`
        profile_id,
        leg_order,
        is_reserve,
        profiles (
          sslc_name,
          usn,
          squads (
            gender
          )
        )
      `)
      .eq('relay_team_id', team.id)
      .order('leg_order', { ascending: true });

    const formattedMembers: RelayMemberDTO[] = (members || []).map((m: any) => {
      const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      const s = p?.squads ? (Array.isArray(p.squads) ? p.squads[0] : p.squads) : null;
      return {
        profile_id: m.profile_id,
        leg_order: m.leg_order,
        is_reserve: m.is_reserve,
        athlete_name: p?.sslc_name || 'Athlete',
        usn: p?.usn || '',
        gender: s?.gender as 'men' | 'women' | undefined,
      };
    });

    teams.push({
      id: team.id,
      event_id: ev.id,
      event_name: ev.name,
      event_code: ev.code,
      is_mixed: isMixed,
      members: formattedMembers,
      eligible_profile_ids: eligibleIds,
    });
  }

  return teams;
}

/**
 * Updates a relay team's 4 legs and up to 2 reserve athletes.
 * Strictly enforces:
 *  - Rule 24: Mutual exclusivity between 4x100m and 4x400m divisional relays.
 *  - Rule 27: 4x400m Mixed Relay running order: Leg 1: Woman, Leg 2: Man, Leg 3: Woman, Leg 4: Man.
 */
export async function saveRelayTeamAction(
  relayTeamId: string,
  leg1: string,
  leg2: string,
  leg3: string,
  leg4: string,
  reserve1?: string,
  reserve2?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await requireSquad();

  // Fast-fail on the session squad's own lock / closed registration
  const ownLockError = await getRelayMutationBlock([session.squadId]);
  if (ownLockError) {
    return { success: false, error: ownLockError };
  }

  // Fetch current squad details
  const { data: currentSquad } = await supabaseAdmin
    .from('squads')
    .select('id, college_id, gender')
    .eq('id', session.squadId)
    .single();

  if (!currentSquad) {
    return { success: false, error: 'Unauthorized: Session squad not found.' };
  }

  // Fetch the relay team being updated with event details
  const { data: verifiedTeam } = await supabaseAdmin
    .from('relay_teams')
    .select(`
      id,
      squad_id,
      event_id,
      events (
        id,
        code,
        name,
        gender
      ),
      squads (
        college_id,
        gender
      )
    `)
    .eq('id', relayTeamId)
    .maybeSingle();

  if (!verifiedTeam) {
    return { success: false, error: 'Relay team not found.' };
  }

  const teamEvent: any = Array.isArray(verifiedTeam.events) ? verifiedTeam.events[0] : verifiedTeam.events;
  const teamSquad: any = Array.isArray(verifiedTeam.squads) ? verifiedTeam.squads[0] : verifiedTeam.squads;
  const isMixed = teamEvent?.code === '4X400M-MIX' || teamEvent?.gender === 'mixed';

  // IDOR Protection: Team must belong to current squad, or belong to same college for mixed relay
  if (!isMixed && verifiedTeam.squad_id !== session.squadId) {
    return { success: false, error: 'Unauthorized: This divisional relay team does not belong to your squad.' };
  }
  if (isMixed && teamSquad?.college_id !== currentSquad.college_id) {
    return { success: false, error: 'Unauthorized: This mixed relay team does not belong to your institution.' };
  }

  // Normalise empty strings / undefined
  const norm = (v?: string) => (typeof v === 'string' && v.trim().length > 0 ? v.trim() : '');
  leg1 = norm(leg1);
  leg2 = norm(leg2);
  leg3 = norm(leg3);
  leg4 = norm(leg4);
  reserve1 = norm(reserve1);
  reserve2 = norm(reserve2);

  const allSelected: string[] = [leg1, leg2, leg3, leg4, reserve1, reserve2].filter(Boolean);

  // Mixed relays involve both college squads; divisional relays only the owning squad.
  // The team-owning squad must also be unlocked.
  let involvedSquadIds = [session.squadId, verifiedTeam.squad_id];
  if (isMixed) {
    const { data: collegeSquads } = await supabaseAdmin
      .from('squads')
      .select('id')
      .eq('college_id', currentSquad.college_id);
    involvedSquadIds = involvedSquadIds.concat((collegeSquads || []).map((s: any) => s.id));
  }
  const lockError = await getRelayMutationBlock(involvedSquadIds);
  if (lockError) {
    return { success: false, error: lockError };
  }

  // Team size: exactly 4 runners (all legs filled) + at most 2 reserves = max 6 members
  if (allSelected.length > 0) {
    if (!leg1 || !leg2 || !leg3 || !leg4) {
      return { success: false, error: 'A relay team must have exactly 4 runners: please assign all four legs (Leg 1–4) before saving.' };
    }
    if (allSelected.length > 6) {
      return { success: false, error: 'A relay team may have at most 6 members (4 runners + 2 reserves).' };
    }
  }

  // Check internal duplicates within this team
  const uniqueSelected = new Set(allSelected);
  if (allSelected.length !== uniqueSelected.size) {
    return { success: false, error: 'An athlete cannot be assigned to multiple positions in the same relay.' };
  }

  // If clearing the team entirely (all empty), wipe and return success
  if (allSelected.length === 0) {
    await supabaseAdmin.from('relay_members').delete().eq('relay_team_id', relayTeamId);
    revalidatePath('/squad/relay');
    revalidatePath('/squad/dashboard');
    return { success: true };
  }

  // Fetch all selected profiles with their squad's college and gender
  const { data: selectedAthletes } = await supabaseAdmin
    .from('profiles')
    .select(`
      id,
      sslc_name,
      usn,
      squad_id,
      squads (
        college_id,
        gender
      )
    `)
    .in('id', allSelected);

  if (!selectedAthletes || selectedAthletes.length !== allSelected.length) {
    return { success: false, error: 'One or more selected athletes could not be found.' };
  }

  // Build lookup map: profile_id -> { sslc_name, gender, college_id, squad_id }
  const athleteMap = new Map<string, { sslc_name: string; gender: 'men' | 'women'; college_id: string; squad_id: string }>();
  for (const a of selectedAthletes) {
    const s: any = Array.isArray(a.squads) ? a.squads[0] : a.squads;
    if (s?.college_id !== currentSquad.college_id) {
      return { success: false, error: `Unauthorized: Athlete "${a.sslc_name}" belongs to a different institution.` };
    }
    athleteMap.set(a.id, {
      sslc_name: a.sslc_name,
      gender: s?.gender as 'men' | 'women',
      college_id: s?.college_id,
      squad_id: a.squad_id,
    });
  }

  // -------------------------------------------------------------
  // NOMINATION ENFORCEMENT: only athletes who chose this relay on the athlete
  // registration form may be placed in the team (e.g. 6 nominated for 4x100m →
  // 4 run + up to 2 reserves; no one else can be added).
  // -------------------------------------------------------------
  const { data: nominations } = await supabaseAdmin
    .from('registrations')
    .select('profile_id')
    .eq('event_id', verifiedTeam.event_id)
    .eq('kind', 'relay')
    .in('profile_id', allSelected);

  const nominatedIds = new Set((nominations || []).map((n: any) => n.profile_id));
  const notNominated = allSelected.filter((id) => !nominatedIds.has(id));
  if (notNominated.length > 0) {
    const names = notNominated.map((id) => athleteMap.get(id)?.sslc_name || 'Athlete').join(', ');
    return {
      success: false,
      error: `Not nominated for ${teamEvent?.name || 'this relay'}: ${names}. Only athletes who selected this relay when they were registered can be placed in the team.`,
    };
  }

  if (isMixed) {
    // -------------------------------------------------------------
    // RULE 27 ENFORCEMENT FOR 4x400m MIXED RELAY
    // Running Order: Leg 1: Woman, Leg 2: Man, Leg 3: Woman, Leg 4: Man
    // -------------------------------------------------------------
    if (leg1) {
      const a = athleteMap.get(leg1);
      if (a && a.gender !== 'women') {
        return {
          success: false,
          error: `Rule 27 Violation: Leg 1 must strictly be a Female athlete (Leg 1: Woman). "${a.sslc_name}" is in the Men's squad.`,
        };
      }
    }

    if (leg2) {
      const a = athleteMap.get(leg2);
      if (a && a.gender !== 'men') {
        return {
          success: false,
          error: `Rule 27 Violation: Leg 2 must strictly be a Male athlete (Leg 2: Man). "${a.sslc_name}" is in the Women's squad.`,
        };
      }
    }

    if (leg3) {
      const a = athleteMap.get(leg3);
      if (a && a.gender !== 'women') {
        return {
          success: false,
          error: `Rule 27 Violation: Leg 3 must strictly be a Female athlete (Leg 3: Woman). "${a.sslc_name}" is in the Men's squad.`,
        };
      }
    }

    if (leg4) {
      const a = athleteMap.get(leg4);
      if (a && a.gender !== 'men') {
        return {
          success: false,
          error: `Rule 27 Violation: Leg 4 must strictly be a Male athlete (Leg 4: Man). "${a.sslc_name}" is in the Women's squad.`,
        };
      }
    }

    // Verify 2 distinct women and 2 distinct men when all 4 legs are filled
    const activeWomen = [leg1, leg3].filter(Boolean);
    const activeMen = [leg2, leg4].filter(Boolean);
    if (new Set(activeWomen).size !== activeWomen.length) {
      return { success: false, error: 'Rule 27 Violation: Leg 1 and Leg 3 must be two different female athletes.' };
    }
    if (new Set(activeMen).size !== activeMen.length) {
      return { success: false, error: 'Rule 27 Violation: Leg 2 and Leg 4 must be two different male athletes.' };
    }
  } else {
    // -------------------------------------------------------------
    // RULE 24 ENFORCEMENT FOR DIVISIONAL RELAYS (4x100m vs 4x400m)
    // An athlete can participate in at most one divisional relay.
    // -------------------------------------------------------------
    // 1. Verify all athletes belong to current squad
    for (const id of allSelected) {
      const a = athleteMap.get(id);
      if (a && a.squad_id !== session.squadId) {
        return {
          success: false,
          error: `Selected athlete "${a.sslc_name}" must be registered in your ${session.gender === 'men' ? 'Boys' : 'Girls'} squad.`,
        };
      }
    }

    // 2. Mutual exclusivity check with the other divisional relay of this squad
    const is100 = teamEvent?.code?.includes('4X100');
    const otherCode = is100
      ? (session.gender === 'men' ? '4X400M-M' : '4X400M-W')
      : (session.gender === 'men' ? '4X100M-M' : '4X100M-W');
    const otherRelayTitle = is100 ? '4x400m Relay' : '4x100m Relay';

    // Find other divisional relay team for this squad
    const { data: otherTeam } = await supabaseAdmin
      .from('relay_teams')
      .select('id, events!inner(code)')
      .eq('squad_id', session.squadId)
      .eq('events.code', otherCode)
      .maybeSingle();

    // 2a. Exclusivity against relay nominations recorded at athlete registration time
    const { data: otherEvent } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('code', otherCode)
      .maybeSingle();

    if (otherEvent) {
      const { data: otherRegs } = await supabaseAdmin
        .from('registrations')
        .select('profile_id')
        .eq('event_id', otherEvent.id)
        .in('profile_id', allSelected);

      if (otherRegs && otherRegs.length > 0) {
        const name = athleteMap.get(otherRegs[0].profile_id)?.sslc_name || 'Athlete';
        return {
          success: false,
          error: `Rule 24 Violation: Athlete "${name}" is nominated for the ${otherRelayTitle}. An athlete can participate in at most one divisional relay (either 4x100m or 4x400m).`,
        };
      }
    }

    if (otherTeam) {
      const { data: otherMembers } = await supabaseAdmin
        .from('relay_members')
        .select(`
          profile_id,
          profiles (
            sslc_name
          )
        `)
        .eq('relay_team_id', otherTeam.id);

      if (otherMembers && otherMembers.length > 0) {
        const otherMemberNames = new Map<string, string>();
        for (const m of otherMembers) {
          const p: any = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
          otherMemberNames.set(m.profile_id, p?.sslc_name || 'Athlete');
        }

        for (const selectedId of allSelected) {
          if (otherMemberNames.has(selectedId)) {
            const athleteName = otherMemberNames.get(selectedId);
            return {
              success: false,
              error: `Rule 24 Violation: Athlete "${athleteName}" is already registered in ${otherRelayTitle}. An athlete can participate in at most one divisional relay (either 4x100m or 4x400m).`,
            };
          }
        }
      }
    }
  }

  // Clear existing members for this verified team
  await supabaseAdmin.from('relay_members').delete().eq('relay_team_id', relayTeamId);

  // Insert legs
  const inserts = [];
  if (leg1) inserts.push({ relay_team_id: relayTeamId, profile_id: leg1, leg_order: 1, is_reserve: false });
  if (leg2) inserts.push({ relay_team_id: relayTeamId, profile_id: leg2, leg_order: 2, is_reserve: false });
  if (leg3) inserts.push({ relay_team_id: relayTeamId, profile_id: leg3, leg_order: 3, is_reserve: false });
  if (leg4) inserts.push({ relay_team_id: relayTeamId, profile_id: leg4, leg_order: 4, is_reserve: false });

  if (reserve1) inserts.push({ relay_team_id: relayTeamId, profile_id: reserve1, leg_order: null, is_reserve: true });
  if (reserve2) inserts.push({ relay_team_id: relayTeamId, profile_id: reserve2, leg_order: null, is_reserve: true });

  if (inserts.length > 0) {
    const { error } = await supabaseAdmin.from('relay_members').insert(inserts);
    if (error) return { success: false, error: error.message };
  }

  revalidatePath('/squad/relay');
  revalidatePath('/squad/dashboard');
  revalidatePath('/squad/payment');
  return { success: true };
}
