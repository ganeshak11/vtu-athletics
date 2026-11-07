'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth-guard';
import { revalidatePath } from 'next/cache';
import { calculateSquadFees, reviewPayment } from '@/lib/payments';
import { normalizePaymentStatus, totalCredited } from '@/lib/payment-status';
import { OFFICIAL_UPI_ID, OFFICIAL_ACCOUNT_NAME } from '@/lib/payment-config';

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
    .limit(1)
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
  const draftSquadsCount = squads?.filter((s) => normalizePaymentStatus(s.payment_status) === 'DRAFT').length || 0;

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
    .limit(1)
    .maybeSingle();

  const currentOpen = currentSettings ? currentSettings.registration_open : true;
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

  // Guaranteed WHERE filter for meet_settings update
  let updateError = null;
  if (currentSettings?.id) {
    const { error } = await supabaseAdmin
      .from('meet_settings')
      .update(updatePayload)
      .eq('id', currentSettings.id);
    updateError = error;
  } else {
    // If no row returned from maybeSingle, check if any row exists or insert default
    const { data: existingRows } = await supabaseAdmin
      .from('meet_settings')
      .select('id')
      .limit(1);

    if (existingRows && existingRows.length > 0) {
      const { error } = await supabaseAdmin
        .from('meet_settings')
        .update(updatePayload)
        .eq('id', existingRows[0].id);
      updateError = error;
    } else {
      const { error } = await supabaseAdmin
        .from('meet_settings')
        .insert({
          ...updatePayload,
          meet_name: 'VTU Inter-Collegiate Athletics Meet 2026',
          venue: 'VTU Campus Stadium',
          host_upi_id: OFFICIAL_UPI_ID,
          host_account_name: OFFICIAL_ACCOUNT_NAME,
        });
      updateError = error;
    }
  }

  if (updateError) {
    return { success: false, isOpen: currentOpen, error: updateError.message };
  }

  // If closing registration, also lock all squad rosters
  if (!newStatus) {
    const lockAll = await supabaseAdmin
      .from('squads')
      .update({ roster_locked: true, late_entry_open: false, updated_at: new Date().toISOString() })
      .not('id', 'is', null);
    // Before migration 0017 the late_entry_open column does not exist yet
    if (lockAll.error) {
      await supabaseAdmin
        .from('squads')
        .update({ roster_locked: true, updated_at: new Date().toISOString() })
        .not('id', 'is', null);
    }
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
 * 3. Assigns bib numbers via the single database path (close_registration_and_generate_bids,
 * migration 0017). Append-only: athletes that already have a number keep it; only athletes of
 * VERIFIED + locked squads without a number get the next free one (Men 100+, Women 2001+).
 * Safe to run repeatedly — e.g. after late payment verification or a late entry.
 */
export async function generateBibNumbersAction(): Promise<{
  success: boolean;
  assignedCount?: number;
  lateEntries?: number;
  error?: string;
  unverifiedSquads?: string[];
}> {
  await requireAdmin();

  const { data: settings } = await supabaseAdmin
    .from('meet_settings')
    .select('registration_open')
    .limit(1)
    .maybeSingle();

  if (settings?.registration_open) {
    return {
      success: false,
      error: 'Registration is currently OPEN. You must CLOSE registration before generating bib numbers.',
    };
  }

  const { data, error } = await supabaseAdmin.rpc('close_registration_and_generate_bids');
  if (error) return { success: false, error: error.message };

  const result: any = data || {};
  const assignedCount = (result.total_men_bids_assigned || 0) + (result.total_women_bids_assigned || 0);
  const pending: string[] = (Array.isArray(result.pending_squads) ? result.pending_squads : []).map((p: any) => {
    const why =
      p.payment_status === 'VERIFIED' && !p.roster_locked
        ? 'roster unlocked (late-entry window open)'
        : `payment ${normalizePaymentStatus(p.payment_status)}`;
    return `${p.college} (${p.squad_code}) — ${p.waiting} athlete(s) waiting: ${why}`;
  });

  await logAudit('GENERATED_BIB_NUMBERS', {
    assignedCount,
    menAssigned: result.total_men_bids_assigned || 0,
    womenAssigned: result.total_women_bids_assigned || 0,
    lateEntries: result.late_entries_numbered || 0,
    pendingSquads: pending.length,
  });

  revalidatePath('/admin');
  revalidatePath('/admin/athletes');
  revalidatePath('/admin/id-cards');
  revalidatePath('/admin/bids');
  revalidatePath('/admin/amendments');
  revalidatePath('/squad/cards');

  return {
    success: true,
    assignedCount,
    lateEntries: result.late_entries_numbered || 0,
    unverifiedSquads: pending,
  };
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
        ped_name,
        ped_phone,
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
      payments (*)
    `)
    .order('squad_code', { ascending: true });

  if (sqErr) throw new Error(sqErr.message);

  // Compute expected fee for each squad
  const enrichedSquads = await Promise.all(
    (squads || []).map(async (sq: any) => {
      // Same fee engine as the squad's Fee Settlement page (flat ₹400 per relay team,
      // reserves free, mixed relay billed once per college) so Finance and PED see one number.
      const fees = await calculateSquadFees(sq.id);
      const expectedFee = fees.totalAmount;

      // Latest payment submission (embedded rows are unordered, so sort explicitly)
      const sortedPayments = [...(sq.payments || [])].sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const latestPayment = sortedPayments[0] || null;
      const pendingPayment = sortedPayments.find((p: any) => p.status === 'SUBMITTED') || null;
      const totalVerified = totalCredited(sortedPayments);

      return {
        ...sq,
        payments: sortedPayments,
        expectedFee,
        feeBreakdown: fees,
        totalVerified,
        balanceDue: Math.max(0, expectedFee - totalVerified),
        latestPayment,
        pendingPayment,
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
  rejectionReason?: string,
  amountReceived?: number
): Promise<{ success: boolean; error?: string }> {
  const adminSession = await requireAdmin();

  // Only a payment that is still awaiting verification can be decided. At most one can be
  // pending per squad (enforced at submission), so pick it explicitly — never "the latest row",
  // which could already be VERIFIED/REJECTED and would be re-processed.
  const { data: pendingPayment, error: findErr } = await supabaseAdmin
    .from('payments')
    .select('id, amount_submitted, utr_number')
    .eq('squad_id', squadId)
    .eq('status', 'SUBMITTED')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (findErr) return { success: false, error: findErr.message };
  if (!pendingPayment) {
    return { success: false, error: 'This squad has no payment awaiting verification. It may already have been processed.' };
  }

  const result = await reviewPayment(pendingPayment.id, status, rejectionReason, adminSession.entityId, amountReceived);
  if (!result.success) return result;

  await logAudit(
    status === 'VERIFIED' ? 'PAYMENT_APPROVED' : 'PAYMENT_REJECTED',
    {
      squadId,
      paymentId: pendingPayment.id,
      utr: pendingPayment.utr_number,
      status,
      amountClaimed: pendingPayment.amount_submitted,
      amountReceived: status === 'VERIFIED' ? amountReceived : null,
      mismatch: status === 'VERIFIED' && amountReceived !== pendingPayment.amount_submitted,
      rejectionReason: rejectionReason || 'None',
    }
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
