'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth-guard';
import { revalidatePath } from 'next/cache';

export interface AdminDashboardStats {
  registrationOpen: boolean;
  registrationClosedAt: string | null;
  totalAthletes: number;
  totalColleges: number;
  totalSquads: number;
  verifiedSquadsCount: number;
  pendingSquadsCount: number;
  rejectedSquadsCount: number;
  draftSquadsCount: number;
  totalBibsGenerated: number;
}

/**
 * Logs an administrative event to the audit log.
 */
async function logAudit(action: string, details: Record<string, any> = {}, performedBy = 'Administrator') {
  try {
    // Ensure audit table exists
    await supabaseAdmin.from('admin_audit_logs').insert({
      action,
      details,
      performed_by: performedBy,
    });
  } catch (err) {
    console.warn('Audit logging notice (non-fatal):', err);
  }
}

/**
 * 1. Fetches real-time operational metrics for the Admin Dashboard.
 */
export async function getAdminDashboardStatsAction(): Promise<AdminDashboardStats> {
  await requireAdmin();

  // Meet Settings
  const { data: settings } = await supabaseAdmin
    .from('meet_settings')
    .select('registration_open, registration_closed_at')
    .maybeSingle();

  // Total Athletes
  const { count: totalAthletes } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true });

  // Total Colleges
  const { count: totalColleges } = await supabaseAdmin
    .from('colleges')
    .select('id', { count: 'exact', head: true });

  // Squads breakdown
  const { data: squads } = await supabaseAdmin
    .from('squads')
    .select('id, payment_status, roster_locked');

  const totalSquads = squads?.length || 0;
  const verifiedSquadsCount = squads?.filter((s) => s.payment_status === 'VERIFIED').length || 0;
  const pendingSquadsCount = squads?.filter((s) => s.payment_status === 'SUBMITTED').length || 0;
  const rejectedSquadsCount = squads?.filter((s) => s.payment_status === 'REJECTED').length || 0;
  const draftSquadsCount = squads?.filter((s) => s.payment_status === 'DRAFT').length || 0;

  // Bibs Generated Count
  const { count: totalBibsGenerated } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .not('bid_number', 'is', null);

  return {
    registrationOpen: settings?.registration_open ?? true,
    registrationClosedAt: settings?.registration_closed_at || null,
    totalAthletes: totalAthletes || 0,
    totalColleges: totalColleges || 0,
    totalSquads,
    verifiedSquadsCount,
    pendingSquadsCount,
    rejectedSquadsCount,
    draftSquadsCount,
    totalBibsGenerated: totalBibsGenerated || 0,
  };
}

/**
 * 2. Toggles registration status between OPEN and CLOSED (single toggle button).
 */
export async function toggleRegistrationStatusAction(): Promise<{
  success: boolean;
  isOpen: boolean;
  error?: string;
}> {
  await requireAdmin();

  const { data: currentSettings } = await supabaseAdmin
    .from('meet_settings')
    .select('id, registration_open')
    .maybeSingle();

  const currentOpen = currentSettings?.registration_open ?? true;
  const newStatus = !currentOpen;

  const updatePayload: any = {
    registration_open: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (!newStatus) {
    updatePayload.registration_closed_at = new Date().toISOString();
  } else {
    updatePayload.registration_closed_at = null;
  }

  const { error } = await supabaseAdmin
    .from('meet_settings')
    .update(updatePayload)
    .match({ id: currentSettings?.id });

  if (error) {
    return { success: false, isOpen: currentOpen, error: error.message };
  }

  // If closing registration, also lock all squad rosters
  if (!newStatus) {
    await supabaseAdmin
      .from('squads')
      .update({ roster_locked: true, updated_at: new Date().toISOString() })
      .neq('id', '00000000-0000-0000-0000-000000000000');
  }

  await logAudit(
    newStatus ? 'OPENED_REGISTRATION' : 'CLOSED_REGISTRATION',
    { previousStatus: currentOpen ? 'OPEN' : 'CLOSED', newStatus: newStatus ? 'OPEN' : 'CLOSED' }
  );

  revalidatePath('/admin');
  revalidatePath('/squad/dashboard');
  revalidatePath('/squad/athletes');
  revalidatePath('/');

  return { success: true, isOpen: newStatus };
}

/**
 * 3. Generates serialized bib numbers and QR codes with strict preconditions:
 * - Rule 1: Registration MUST be closed.
 * - Rule 2: Every college squad with registered athletes MUST be either VERIFIED or REJECTED (no unverified pending payments).
 */
export async function generateBibNumbersAction(): Promise<{
  success: boolean;
  assignedCount?: number;
  error?: string;
  unverifiedSquads?: string[];
}> {
  await requireAdmin();

  // Check Rule 1: Registration must be closed
  const { data: settings } = await supabaseAdmin
    .from('meet_settings')
    .select('registration_open')
    .maybeSingle();

  if (settings?.registration_open) {
    return {
      success: false,
      error: 'Registration is currently OPEN. You must CLOSE registration before generating bib numbers.',
    };
  }

  // Check Rule 2: Every squad with registered athletes must be verified (VERIFIED or REJECTED)
  const { data: squadsWithAthletes } = await supabaseAdmin
    .from('squads')
    .select(`
      id,
      squad_code,
      payment_status,
      colleges (
        name,
        code
      ),
      profiles (
        id
      )
    `);

  const unverifiedList: string[] = [];
  (squadsWithAthletes || []).forEach((sq: any) => {
    const athleteCount = sq.profiles?.length || 0;
    // Only check squads that actually registered athletes
    if (athleteCount > 0) {
      if (sq.payment_status !== 'VERIFIED' && sq.payment_status !== 'REJECTED') {
        const colName = sq.colleges?.name || sq.squad_code;
        unverifiedList.push(`${colName} (${sq.squad_code}) — Status: ${sq.payment_status}`);
      }
    }
  });

  if (unverifiedList.length > 0) {
    return {
      success: false,
      error: `Cannot generate bib numbers: ${unverifiedList.length} college squad(s) have unverified payments. Every participating college must be either Approved or Rejected by the admin first.`,
      unverifiedSquads: unverifiedList,
    };
  }

  // Fetch verified athletes to allocate serialized numbers
  const { data: verifiedAthletes, error: fetchErr } = await supabaseAdmin
    .from('profiles')
    .select(`
      id,
      sslc_name,
      usn,
      squad_id,
      squads!inner (
        id,
        gender,
        squad_code,
        payment_status,
        colleges (
          name,
          code
        )
      )
    `)
    .eq('squads.payment_status', 'VERIFIED');

  if (fetchErr || !verifiedAthletes || verifiedAthletes.length === 0) {
    return {
      success: false,
      error: 'No athletes found in verified college squads to assign bib numbers.',
    };
  }

  // Separate boys and girls
  const boys = verifiedAthletes.filter((a: any) => a.squads?.gender === 'men');
  const girls = verifiedAthletes.filter((a: any) => a.squads?.gender === 'women');

  // Helper to group by college and sort alphabetically
  const sortAndGroup = (list: any[]) => {
    return list.sort((a, b) => {
      const colA = a.squads?.colleges?.name || a.squads?.squad_code || '';
      const colB = b.squads?.colleges?.name || b.squads?.squad_code || '';
      if (colA !== colB) return colA.localeCompare(colB);
      return (a.sslc_name || '').localeCompare(b.sslc_name || '');
    });
  };

  const sortedBoys = sortAndGroup(boys);
  const sortedGirls = sortAndGroup(girls);

  let boyBibCounter = 100; // Boys start from 100 upwards
  let girlBibCounter = 2001; // Girls start from 2001 upwards
  let totalAssigned = 0;

  // Batch update boys
  for (const athlete of sortedBoys) {
    await supabaseAdmin
      .from('profiles')
      .update({ bid_number: boyBibCounter })
      .eq('id', athlete.id);
    boyBibCounter++;
    totalAssigned++;
  }

  // Batch update girls
  for (const athlete of sortedGirls) {
    await supabaseAdmin
      .from('profiles')
      .update({ bid_number: girlBibCounter })
      .eq('id', athlete.id);
    girlBibCounter++;
    totalAssigned++;
  }

  await logAudit('GENERATED_BIB_NUMBERS', {
    totalAssigned,
    boysCount: sortedBoys.length,
    girlsCount: sortedGirls.length,
    boysRange: sortedBoys.length > 0 ? `100 - ${boyBibCounter - 1}` : 'None',
    girlsRange: sortedGirls.length > 0 ? `2001 - ${girlBibCounter - 1}` : 'None',
  });

  revalidatePath('/admin');
  revalidatePath('/admin/athletes');
  revalidatePath('/admin/id-cards');
  revalidatePath('/admin/bids');

  return { success: true, assignedCount: totalAssigned };
}

/**
 * 4. Lists all athletes with full profile and event details for Athletes Management.
 */
export async function listAllAthletesAction() {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(`
      id,
      sslc_name,
      usn,
      semester,
      blood_group,
      college_joining_date,
      sem_start_date,
      aadhaar_number,
      photo_url,
      bid_number,
      accreditation_status,
      created_at,
      squads (
        id,
        gender,
        squad_code,
        payment_status,
        colleges (
          name,
          code,
          district
        )
      ),
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
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * 5. Lists all college squads and their payment submissions for Payment Verification.
 */
export async function listPaymentsForAdminAction() {
  await requireAdmin();

  // Fetch squads with colleges and athlete counts
  const { data: squads, error: sqErr } = await supabaseAdmin
    .from('squads')
    .select(`
      id,
      gender,
      squad_code,
      ped_name,
      ped_phone,
      ped_email,
      roster_locked,
      payment_status,
      colleges (
        id,
        name,
        code,
        district
      ),
      profiles (
        id,
        sslc_name,
        usn,
        semester,
        blood_group,
        bid_number,
        registrations (
          id,
          kind,
          events (
            name,
            code
          )
        )
      ),
      payments (
        id,
        amount_submitted,
        amount_expected,
        utr_number,
        screenshot_url,
        status,
        rejection_reason,
        created_at,
        verified_at
      )
    `)
    .order('squad_code', { ascending: true });

  if (sqErr) throw new Error(sqErr.message);

  // Compute expected fee for each squad
  const enrichedSquads = await Promise.all(
    (squads || []).map(async (sq: any) => {
      let expectedFee = 0;
      try {
        const { data: feeData } = await supabaseAdmin.rpc('compute_squad_fee', {
          p_squad_id: sq.id,
        });
        expectedFee = feeData?.total_amount || 0;
      } catch {
        // Fallback: ₹100 per billable event
        const billable = sq.profiles?.reduce((acc: number, p: any) => {
          return acc + (p.registrations?.filter((r: any) => r.kind !== 'reserve').length || 0);
        }, 0);
        expectedFee = (billable || 0) * 100;
      }

      // Latest payment submission
      const latestPayment = sq.payments?.[0] || null;

      return {
        ...sq,
        expectedFee,
        latestPayment,
      };
    })
  );

  return enrichedSquads;
}

/**
 * 6. Approves or Rejects a college squad payment transaction.
 */
export async function verifySquadPaymentAction(
  squadId: string,
  status: 'VERIFIED' | 'REJECTED',
  rejectionReason?: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  // Update squad status
  const squadUpdate: any = {
    payment_status: status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'VERIFIED') {
    squadUpdate.roster_locked = true;
  }

  const { error: sqError } = await supabaseAdmin
    .from('squads')
    .update(squadUpdate)
    .eq('id', squadId);

  if (sqError) return { success: false, error: sqError.message };

  // Update latest payment record
  const { data: latestPayment } = await supabaseAdmin
    .from('payments')
    .select('id')
    .eq('squad_id', squadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestPayment) {
    await supabaseAdmin
      .from('payments')
      .update({
        status,
        rejection_reason: rejectionReason || null,
        verified_at: new Date().toISOString(),
      })
      .eq('id', latestPayment.id);
  }

  await logAudit(
    status === 'VERIFIED' ? 'PAYMENT_APPROVED' : 'PAYMENT_REJECTED',
    { squadId, status, rejectionReason: rejectionReason || 'None' }
  );

  revalidatePath('/admin/payments');
  revalidatePath('/admin');
  revalidatePath('/squad/payment');
  revalidatePath('/squad/dashboard');

  return { success: true };
}

/**
 * 7. Automatically seeds verified athletes into track preliminary heats and lane assignments.
 */
export async function generateTrackHeatsAction(): Promise<{
  success: boolean;
  totalHeatsCreated?: number;
  totalAthletesSeeded?: number;
  error?: string;
}> {
  await requireAdmin();

  // Fetch track sprint and hurdle events that have lanes
  const { data: trackEvents, error: evErr } = await supabaseAdmin
    .from('events')
    .select('id, name, code, gender, category, max_lanes, start_type')
    .in('category', ['track_sprint', 'track_hurdles', 'relay'])
    .order('code', { ascending: true });

  if (evErr || !trackEvents || trackEvents.length === 0) {
    return { success: false, error: 'No lane-based track events found.' };
  }

  let totalHeatsCreated = 0;
  let totalAthletesSeeded = 0;

  for (const event of trackEvents) {
    // Find verified athletes registered for this event with valid bib numbers
    const { data: regs } = await supabaseAdmin
      .from('registrations')
      .select(`
        id,
        profile_id,
        profiles!inner (
          id,
          sslc_name,
          bid_number,
          squads!inner (
            payment_status
          )
        )
      `)
      .eq('event_id', event.id)
      .eq('profiles.squads.payment_status', 'VERIFIED')
      .not('profiles.bid_number', 'is', null);

    const eligible = regs?.map((r: any) => r.profiles).filter((p: any) => Boolean(p.bid_number)) || [];
    if (eligible.length === 0) continue;

    // Shuffle athletes for random heat & lane draw
    const shuffled = [...eligible].sort(() => Math.random() - 0.5);
    const lanesPerHeat = event.max_lanes || 8;
    const numHeats = Math.ceil(shuffled.length / lanesPerHeat);

    // Delete existing heats for this event if re-generating
    const { data: existingHeats } = await supabaseAdmin
      .from('heats')
      .select('id')
      .eq('event_id', event.id);

    if (existingHeats && existingHeats.length > 0) {
      const heatIds = existingHeats.map((h: any) => h.id);
      await supabaseAdmin.from('heat_athletes').delete().in('heat_id', heatIds);
      await supabaseAdmin.from('heats').delete().in('id', heatIds);
    }

    // Standard preferred lanes: 4, 5, 3, 6, 2, 7, 1, 8
    const preferredLanes = [4, 5, 3, 6, 2, 7, 1, 8];

    for (let h = 0; h < numHeats; h++) {
      const { data: newHeat, error: heatErr } = await supabaseAdmin
        .from('heats')
        .insert({
          event_id: event.id,
          heat_number: h + 1,
          stage: numHeats > 1 ? 'Heats' : 'Final',
          status: 'SCHEDULED',
        })
        .select('id')
        .single();

      if (heatErr || !newHeat) continue;
      totalHeatsCreated++;

      const heatAthletesBatch = shuffled.slice(h * lanesPerHeat, (h + 1) * lanesPerHeat);
      const heatAthleteInserts = heatAthletesBatch.map((athlete: any, idx: number) => ({
        heat_id: newHeat.id,
        athlete_id: athlete.id,
        lane_number: preferredLanes[idx % preferredLanes.length] || (idx + 1),
      }));

      await supabaseAdmin.from('heat_athletes').insert(heatAthleteInserts);
      totalAthletesSeeded += heatAthletesBatch.length;
    }
  }

  await logAudit('GENERATED_TRACK_HEATS', {
    totalHeatsCreated,
    totalAthletesSeeded,
  });

  revalidatePath('/admin/heats');

  return { success: true, totalHeatsCreated, totalAthletesSeeded };
}

/**
 * 8. Fetches the administrative audit log.
 */
export async function listAuditLogsAction() {
  await requireAdmin();

  // Try fetching from admin_audit_logs, fallback to empty array
  const { data, error } = await supabaseAdmin
    .from('admin_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return [];
  }
  return data || [];
}
