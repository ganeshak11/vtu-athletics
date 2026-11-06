/**
 * Server-only payment & fee logic shared by squad, finance and admin actions.
 *
 * Deliberately NOT a 'use server' module: exports here are plain server functions and
 * cannot be invoked from the browser as server actions (no auth bypass on arbitrary squads).
 */
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Accurately calculates squad fees:
 * - Regular events = ₹100
 * - Reserve events = Free (₹0)
 * - 21km Half Marathon = ₹100
 * - Relay teams = Flat ₹400 per relay team (regardless of having 4 active + 2 reserves = 6 members)
 */
export async function calculateSquadFees(squadId: string) {
  const { data: squadProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('squad_id', squadId);
  const profileIds = (squadProfiles || []).map((p: any) => p.id);

  let regularEventsCount = 0;
  let reserveEventsCount = 0;
  let hmCount = 0;
  const relayEventIds = new Set<string>();

  if (profileIds.length > 0) {
    const { data: regs } = await supabaseAdmin
      .from('registrations')
      .select('id, kind, event_id')
      .in('profile_id', profileIds);

    (regs || []).forEach((r: any) => {
      if (r.kind === 'regular') regularEventsCount++;
      else if (r.kind === 'reserve') reserveEventsCount++;
      else if (r.kind === 'half_marathon') hmCount++;
      else if (r.kind === 'relay' && r.event_id) relayEventIds.add(r.event_id);
    });
  }

  // Relay teams composed on the Relay page (relay_teams + relay_members) are billed to the
  // squad that owns the team row. A mixed relay team is shared by the college and owned by
  // ONE squad, so it is billed exactly once. Fee is flat per team, independent of 4 or 6 members.
  const { data: squadRow } = await supabaseAdmin
    .from('squads')
    .select('college_id')
    .eq('id', squadId)
    .maybeSingle();

  const { data: ownedTeams } = await supabaseAdmin
    .from('relay_teams')
    .select('id, event_id, relay_members(profile_id)')
    .eq('squad_id', squadId);

  (ownedTeams || []).forEach((t: any) => {
    if (Array.isArray(t.relay_members) && t.relay_members.length > 0 && t.event_id) {
      relayEventIds.add(t.event_id);
    }
  });

  // A relay nomination made at athlete registration for an event whose (mixed) team is owned
  // by the sibling squad of the same college is already billed there — don't double-charge.
  if (squadRow?.college_id && relayEventIds.size > 0) {
    const { data: siblingTeams } = await supabaseAdmin
      .from('relay_teams')
      .select('event_id, squad_id, relay_members(profile_id), squads!inner(college_id)')
      .eq('squads.college_id', squadRow.college_id)
      .neq('squad_id', squadId)
      .in('event_id', Array.from(relayEventIds));

    (siblingTeams || []).forEach((t: any) => {
      const ownedHere = (ownedTeams || []).some(
        (o: any) => o.event_id === t.event_id && Array.isArray(o.relay_members) && o.relay_members.length > 0
      );
      const siblingHasMembers = Array.isArray(t.relay_members) && t.relay_members.length > 0;
      if (!ownedHere && siblingHasMembers) relayEventIds.delete(t.event_id);
    });
  }

  const relayTeamsCount = relayEventIds.size;
  const regularFeeRate = 100;
  const hmFeeRate = 100;
  const relayFeeRate = 400; // Flat ₹400 per relay team
  const totalAmount =
    regularEventsCount * regularFeeRate +
    hmCount * hmFeeRate +
    relayTeamsCount * relayFeeRate;

  return {
    regularEventsCount,
    regularFeeRate,
    reserveEventsCount,
    hmCount,
    hmFeeRate,
    relayTeamsCount,
    relayFeeRate,
    totalAmount,
  };
}

export type PaymentDecision = 'VERIFIED' | 'REJECTED';

/**
 * Applies a Finance/Admin decision to ONE payment that is still awaiting verification,
 * then synchronises the parent squad's payment_status and roster lock.
 *
 * - Only payments in status 'SUBMITTED' can be processed: a payment that was already
 *   verified or rejected is refused (prevents double-verify / reject-after-verify).
 * - VERIFIED: squad becomes VERIFIED (roster locked) once verified payments cover the
 *   squad's CURRENT total fee; otherwise it stays SUBMITTED with a balance due.
 * - REJECTED: squad becomes REJECTED unless another payment is still pending. The roster
 *   stays locked; the squad may re-upload a corrected receipt / UTR.
 */
export async function reviewPayment(
  paymentId: string,
  decision: PaymentDecision,
  reason: string | undefined,
  staffId: string | null | undefined
): Promise<{ success: boolean; error?: string; squadId?: string }> {
  if (decision === 'REJECTED' && !reason?.trim()) {
    return { success: false, error: 'A rejection reason is mandatory when rejecting payments.' };
  }

  // Conditional update: matches only while the payment is still pending (atomic guard)
  const { data: updated, error } = await supabaseAdmin
    .from('payments')
    .update({
      status: decision,
      rejection_reason: decision === 'REJECTED' ? reason!.trim() : null,
      verified_by: staffId || null,
      verified_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .eq('status', 'SUBMITTED')
    .select('squad_id')
    .maybeSingle();

  if (error) return { success: false, error: error.message };

  if (!updated) {
    const { data: existing } = await supabaseAdmin
      .from('payments')
      .select('status')
      .eq('id', paymentId)
      .maybeSingle();
    if (!existing) return { success: false, error: 'Payment record not found.' };
    return {
      success: false,
      error: `This payment has already been ${String(existing.status).toLowerCase()} and cannot be processed again.`,
    };
  }

  const squadId: string = updated.squad_id;
  const now = new Date().toISOString();

  const [{ data: allPayments }, fees] = await Promise.all([
    supabaseAdmin.from('payments').select('status, amount_submitted').eq('squad_id', squadId),
    calculateSquadFees(squadId),
  ]);

  const verifiedSum = (allPayments || [])
    .filter((p: any) => p.status === 'VERIFIED')
    .reduce((sum: number, p: any) => sum + (p.amount_submitted || 0), 0);
  const pendingCount = (allPayments || []).filter((p: any) => p.status === 'SUBMITTED').length;

  let squadStatus: 'VERIFIED' | 'SUBMITTED' | 'REJECTED';
  if (verifiedSum > 0 && verifiedSum >= fees.totalAmount) {
    squadStatus = 'VERIFIED';
  } else if (pendingCount > 0) {
    // Another receipt is still awaiting verification
    squadStatus = 'SUBMITTED';
  } else if (decision === 'REJECTED') {
    // Let the squad see the rejection and re-upload a corrected receipt / UTR
    squadStatus = 'REJECTED';
  } else {
    // Verified but under-paid: remains locked in the submitted phase with a balance due
    squadStatus = 'SUBMITTED';
  }

  const { error: sqErr } = await supabaseAdmin
    .from('squads')
    .update({ payment_status: squadStatus, roster_locked: true, updated_at: now })
    .eq('id', squadId);

  if (sqErr) return { success: false, error: sqErr.message };
  return { success: true, squadId };
}

/**
 * Pre-payment readiness check for relays. Submitting payment FREEZES the roster, so any relay
 * with nominations must already have a complete lineup — otherwise it could never be completed.
 *
 * - Divisional (4x100m / 4x400m of this squad): if anyone is nominated, ≥ 4 must be nominated
 *   and the team must have all 4 legs assigned on the Relay page.
 * - 4x400m Mixed (shared by the college): if anyone in the college is nominated, ≥ 2 women and
 *   ≥ 2 men must be nominated and all 4 legs assigned (W, M, W, M).
 *
 * Returns human-readable blockers; an empty array means the squad may pay.
 */
export async function getRelayReadinessIssues(squadId: string): Promise<string[]> {
  const issues: string[] = [];

  const { data: squad } = await supabaseAdmin
    .from('squads')
    .select('id, college_id, gender')
    .eq('id', squadId)
    .maybeSingle();
  if (!squad) return ['Squad not found.'];

  const divisionalCodes = squad.gender === 'men' ? ['4X100M-M', '4X400M-M'] : ['4X100M-W', '4X400M-W'];
  const { data: relayEvents } = await supabaseAdmin
    .from('events')
    .select('id, name, code')
    .in('code', [...divisionalCodes, '4X400M-MIX']);
  if (!relayEvents || relayEvents.length === 0) return issues;

  const { data: collegeSquads } = await supabaseAdmin
    .from('squads')
    .select('id, gender')
    .eq('college_id', squad.college_id);
  const squadGender = new Map((collegeSquads || []).map((s: any) => [s.id, s.gender]));

  const { data: collegeProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id, squad_id')
    .in('squad_id', Array.from(squadGender.keys()));
  const profileSquad = new Map((collegeProfiles || []).map((p: any) => [p.id, p.squad_id]));
  if (profileSquad.size === 0) return issues;

  const { data: nominations } = await supabaseAdmin
    .from('registrations')
    .select('profile_id, event_id')
    .eq('kind', 'relay')
    .in('event_id', relayEvents.map((e: any) => e.id))
    .in('profile_id', Array.from(profileSquad.keys()));

  for (const ev of relayEvents as any[]) {
    const isMixed = ev.code === '4X400M-MIX';
    const evNoms = (nominations || []).filter(
      (n: any) => n.event_id === ev.id && (isMixed || profileSquad.get(n.profile_id) === squadId)
    );
    if (evNoms.length === 0) continue;

    // Find the team: own squad for divisional; any college squad for mixed
    const teamQuery = supabaseAdmin
      .from('relay_teams')
      .select('id, relay_members(leg_order, is_reserve)')
      .eq('event_id', ev.id);
    const { data: teams } = isMixed
      ? await teamQuery.in('squad_id', Array.from(squadGender.keys()))
      : await teamQuery.eq('squad_id', squadId);
    const members: any[] = (teams || []).flatMap((t: any) => t.relay_members || []);
    const legs = members.filter((m) => !m.is_reserve && m.leg_order).length;

    if (isMixed) {
      const women = evNoms.filter((n: any) => squadGender.get(profileSquad.get(n.profile_id)) === 'women').length;
      const men = evNoms.length - women;
      if (women < 2 || men < 2) {
        issues.push(
          `${ev.name}: needs at least 2 women and 2 men nominated across your college (currently ${women} women, ${men} men). Nominate more athletes, or remove the mixed relay nominations.`
        );
        continue;
      }
    } else if (evNoms.length < 4) {
      issues.push(
        `${ev.name}: only ${evNoms.length} athlete(s) nominated — a team needs at least 4. Nominate more athletes, or remove these nominations.`
      );
      continue;
    }

    if (legs < 4) {
      issues.push(`${ev.name}: lineup incomplete (${legs}/4 legs assigned). Assign all 4 legs on the Relay Teams page.`);
    }
  }

  return issues;
}
