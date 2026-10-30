'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireSquad } from '@/lib/auth-guard';
import { revalidatePath } from 'next/cache';

export interface RelayMemberDTO {
  profile_id: string;
  leg_order: number | null;
  is_reserve: boolean;
  athlete_name?: string;
  usn?: string;
}

export interface RelayTeamDTO {
  id: string;
  event_id: string;
  event_name: string;
  event_code: string;
  members: RelayMemberDTO[];
}

/**
 * Fetches or initializes the 4x100m and 4x400m relay teams for the current squad.
 */
export async function getSquadRelayTeamsAction(): Promise<RelayTeamDTO[]> {
  const session = await requireSquad();

  // Find relay events for this squad's gender
  const { data: relayEvents } = await supabaseAdmin
    .from('events')
    .select('id, name, code')
    .in('gender', [session.gender, 'mixed'])
    .eq('category', 'relay')
    .order('code');

  if (!relayEvents || relayEvents.length === 0) return [];

  const teams: RelayTeamDTO[] = [];

  for (const ev of relayEvents) {
    // Check if team exists
    let { data: team } = await supabaseAdmin
      .from('relay_teams')
      .select('id')
      .eq('squad_id', session.squadId)
      .eq('event_id', ev.id)
      .maybeSingle();

    if (!team) {
      // Auto-create relay team entry for the squad
      const { data: newTeam } = await supabaseAdmin
        .from('relay_teams')
        .insert({
          squad_id: session.squadId,
          event_id: ev.id,
        })
        .select('id')
        .single();
      team = newTeam;
    }

    if (!team) continue;

    // Fetch members
    const { data: members } = await supabaseAdmin
      .from('relay_members')
      .select(`
        profile_id,
        leg_order,
        is_reserve,
        profiles (
          sslc_name,
          usn
        )
      `)
      .eq('relay_team_id', team.id)
      .order('leg_order', { ascending: true });

    const formattedMembers: RelayMemberDTO[] = (members || []).map((m: any) => {
      const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      return {
        profile_id: m.profile_id,
        leg_order: m.leg_order,
        is_reserve: m.is_reserve,
        athlete_name: p?.sslc_name || 'Athlete',
        usn: p?.usn || '',
      };
    });

    teams.push({
      id: team.id,
      event_id: ev.id,
      event_name: ev.name,
      event_code: ev.code,
      members: formattedMembers,
    });
  }

  return teams;
}

/**
 * Updates a relay team's 4 legs and up to 2 reserve athletes.
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

  // Check if registration is globally closed
  const { data: meetSettings } = await supabaseAdmin
    .from('meet_settings')
    .select('registration_open')
    .limit(1)
    .maybeSingle();

  if (meetSettings && meetSettings.registration_open === false) {
    return { success: false, error: 'Registration is officially closed. Relay teams cannot be modified.' };
  }

  const { data: squad } = await supabaseAdmin
    .from('squads')
    .select('roster_locked')
    .eq('id', session.squadId)
    .single();

  if (squad?.roster_locked) {
    return { success: false, error: 'Cannot modify relay team while roster is locked.' };
  }

  // IDOR Protection: Verify relayTeamId belongs to the current squad
  const { data: verifiedTeam } = await supabaseAdmin
    .from('relay_teams')
    .select('id')
    .eq('id', relayTeamId)
    .eq('squad_id', session.squadId)
    .maybeSingle();

  if (!verifiedTeam) {
    return { success: false, error: 'Unauthorized: This relay team does not belong to your institution squad.' };
  }

  const selectedRunners = [leg1, leg2, leg3, leg4].filter(Boolean);
  const selectedReserves = [reserve1, reserve2].filter(Boolean);

  // Check duplicates
  const allSelected = [...selectedRunners, ...selectedReserves];
  const uniqueSelected = new Set(allSelected);
  if (allSelected.length !== uniqueSelected.size) {
    return { success: false, error: 'An athlete cannot be assigned to multiple positions in the same relay.' };
  }

  // Tenant Isolation: Verify all selected athletes belong to this squad
  if (allSelected.length > 0) {
    const { data: squadAthletes } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('squad_id', session.squadId)
      .in('id', allSelected);

    const validIds = new Set((squadAthletes || []).map((p: any) => p.id));
    const hasForeign = allSelected.some((id) => !validIds.has(id));
    if (hasForeign) {
      return { success: false, error: 'Unauthorized: Selected athletes must be registered under your institution squad.' };
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
  return { success: true };
}
