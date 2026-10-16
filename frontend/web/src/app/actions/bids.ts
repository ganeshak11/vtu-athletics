'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth-guard';
import { revalidatePath } from 'next/cache';

/**
 * Executes the master registration lock and generates contiguous bid/chest numbers
 * across all colleges and squads.
 */
export async function closeRegistrationAction(): Promise<{ success: boolean; result?: any; error?: string }> {
  await requireAdmin();

  const { data, error } = await supabaseAdmin.rpc('close_registration_and_generate_bids');

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/bids');
  revalidatePath('/admin/amendments');
  revalidatePath('/admin/colleges');
  revalidatePath('/squad/dashboard');
  revalidatePath('/squad/athletes');

  return { success: true, result: data };
}

/**
 * Fetches the master bid block allocation overview across all squads.
 */
export async function getBidOverviewAction() {
  await requireAdmin();

  const { data: squads, error } = await supabaseAdmin
    .from('squads')
    .select(`
      id,
      squad_code,
      gender,
      bid_block_start,
      bid_block_end,
      payment_status,
      colleges (
        name,
        code,
        district
      ),
      profiles (
        id,
        sslc_name,
        usn,
        bid_number,
        accreditation_status
      )
    `)
    .order('squad_code', { ascending: true });

  if (error) throw new Error(error.message);
  return squads || [];
}

/**
 * Withdraws an athlete post-close and preserves their bid number gap.
 */
export async function withdrawAthleteAction(profileId: string, reason: string) {
  const admin = await requireAdmin();

  if (!reason?.trim()) {
    return { success: false, error: 'Reason for withdrawal is mandatory.' };
  }

  const { data, error } = await supabaseAdmin.rpc('withdraw_athlete', {
    p_profile_id: profileId,
    p_reason: reason.trim(),
    p_admin_id: admin.entityId,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/amendments');
  revalidatePath('/admin/bids');
  return { success: true, result: data };
}

/**
 * Substitutes a withdrawn athlete with a new athlete inheriting the same bid number.
 */
export async function substituteAthleteAction(formData: FormData) {
  const admin = await requireAdmin();

  const withdrawnProfileId = formData.get('withdrawnProfileId') as string;
  const newName = (formData.get('newName') as string || '').trim();
  const newUsn = (formData.get('newUsn') as string || '').trim().toUpperCase();
  const newSemester = parseInt(formData.get('newSemester') as string, 10);
  const newBloodGroup = (formData.get('newBloodGroup') as string || '').trim();
  const newJoiningDate = formData.get('newJoiningDate') as string;
  const newSemStartDate = formData.get('newSemStartDate') as string;
  const reason = (formData.get('reason') as string || '').trim();

  if (!withdrawnProfileId || !newName || !newUsn || !reason) {
    return { success: false, error: 'All substitution fields are required.' };
  }

  const { data, error } = await supabaseAdmin.rpc('substitute_athlete', {
    p_withdrawn_profile_id: withdrawnProfileId,
    p_new_sslc_name: newName,
    p_new_usn: newUsn,
    p_new_semester: newSemester,
    p_new_blood_group: newBloodGroup,
    p_new_joining_date: newJoiningDate,
    p_new_sem_start_date: newSemStartDate,
    p_reason: reason,
    p_admin_id: admin.entityId,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin/amendments');
  revalidatePath('/admin/bids');
  return { success: true, result: data };
}

/**
 * Lists all post-close amendments.
 */
export async function listAmendmentsAction() {
  await requireAdmin();

  const { data: amendments, error } = await supabaseAdmin
    .from('roster_amendments')
    .select(`
      id,
      amendment_type,
      bid_number,
      reason,
      created_at,
      squads (
        squad_code,
        colleges (name)
      ),
      staff (
        display_name
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return amendments || [];
}
