'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { requireRegistrationDesk } from '@/lib/auth-guard';
import { normalizePaymentStatus, type SquadPaymentStatus } from '@/lib/payment-status';

export interface DeskSquad {
  id: string;
  gender: 'men' | 'women';
  squad_code: string;
  ped_name: string;
  ped_phone: string;
  payment_status: SquadPaymentStatus;
  athlete_count: number;
}

export interface DeskCollege {
  id: string;
  name: string;
  code: string;
  district: string | null;
  attendance_marked_at: string | null;
  attendance_marked_by: string | null;
  attendance_men_count: number | null;
  attendance_women_count: number | null;
  squads: DeskSquad[];
}

const MIGRATION_ERROR =
  'Attendance needs database migration 0022 (supabase/migrations/0022_college_attendance.sql). Apply it in Supabase, then try again.';

function isMissingAttendanceColumn(message: string | undefined) {
  return Boolean(message && /attendance_/.test(message) && /(column|schema cache)/i.test(message));
}

/**
 * All colleges with their two squads and registered athlete counts, for the Registration Desk.
 * `migrationApplied` is false until migration 0022 adds the attendance columns.
 */
export async function listCollegesForDeskAction(): Promise<{ colleges: DeskCollege[]; migrationApplied: boolean }> {
  await requireRegistrationDesk();

  // colleges.* so the desk still loads before migration 0022 adds the attendance columns
  const { data, error } = await supabaseAdmin
    .from('colleges')
    .select(`
      *,
      squads (
        id,
        gender,
        squad_code,
        ped_name,
        ped_phone,
        payment_status,
        profiles (count)
      )
    `)
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  const rows = data || [];
  const migrationApplied = rows.length === 0 || 'attendance_marked_at' in rows[0];

  const colleges: DeskCollege[] = rows.map((c: any) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    district: c.district ?? null,
    attendance_marked_at: c.attendance_marked_at ?? null,
    attendance_marked_by: c.attendance_marked_by ?? null,
    attendance_men_count: c.attendance_men_count ?? null,
    attendance_women_count: c.attendance_women_count ?? null,
    squads: (c.squads || []).map((s: any) => ({
      id: s.id,
      gender: s.gender,
      squad_code: s.squad_code,
      ped_name: s.ped_name || '',
      ped_phone: s.ped_phone || '',
      payment_status: normalizePaymentStatus(s.payment_status),
      athlete_count: Array.isArray(s.profiles) ? Number(s.profiles[0]?.count || 0) : 0,
    })),
  }));

  return { colleges, migrationApplied };
}

async function writeAudit(action: string, details: Record<string, unknown>, performedBy: string) {
  try {
    const { error } = await supabaseAdmin.from('admin_audit_logs').insert({ action, details, performed_by: performedBy });
    if (error) console.warn('Audit log not written:', error.message);
  } catch (err) {
    console.warn('Audit logging notice (non-fatal):', err);
  }
}

function revalidateAttendance() {
  revalidatePath('/registration-desk');
  revalidatePath('/squad/certificate');
  revalidatePath('/squad/dashboard');
}

/**
 * Marks a college's contingent as having reported at the venue. Unlocks the college's
 * Attendance Certificate in the contingent portal.
 */
export async function markCollegeAttendanceAction(
  collegeId: string,
  menCount: number,
  womenCount: number
): Promise<{ success: boolean; error?: string; markedAt?: string; markedBy?: string }> {
  const session = await requireRegistrationDesk();

  const men = Number(menCount);
  const women = Number(womenCount);
  if (!Number.isInteger(men) || !Number.isInteger(women) || men < 0 || women < 0 || men > 500 || women > 500) {
    return { success: false, error: 'Enter whole numbers (0–500) for men and women participants.' };
  }
  if (men + women === 0) {
    return { success: false, error: 'At least one participant must have reported to mark attendance.' };
  }

  const markedAt = new Date().toISOString();
  const markedBy = session.displayName || 'Registration Desk';
  const { data, error } = await supabaseAdmin
    .from('colleges')
    .update({
      attendance_marked_at: markedAt,
      attendance_marked_by: markedBy,
      attendance_men_count: men,
      attendance_women_count: women,
    })
    .eq('id', collegeId)
    .select('id, code')
    .maybeSingle();

  if (error) return { success: false, error: isMissingAttendanceColumn(error.message) ? MIGRATION_ERROR : error.message };
  if (!data) return { success: false, error: 'College not found.' };

  await writeAudit('COLLEGE_ATTENDANCE_MARKED', { collegeId, collegeCode: data.code, men, women }, markedBy);
  revalidateAttendance();
  return { success: true, markedAt, markedBy };
}

/**
 * Removes a college's attendance mark (e.g. marked by mistake). Locks the certificate again.
 */
export async function clearCollegeAttendanceAction(collegeId: string): Promise<{ success: boolean; error?: string }> {
  const session = await requireRegistrationDesk();
  const performedBy = session.displayName || 'Registration Desk';

  const { data, error } = await supabaseAdmin
    .from('colleges')
    .update({
      attendance_marked_at: null,
      attendance_marked_by: null,
      attendance_men_count: null,
      attendance_women_count: null,
    })
    .eq('id', collegeId)
    .select('id, code')
    .maybeSingle();

  if (error) return { success: false, error: isMissingAttendanceColumn(error.message) ? MIGRATION_ERROR : error.message };
  if (!data) return { success: false, error: 'College not found.' };

  await writeAudit('COLLEGE_ATTENDANCE_CLEARED', { collegeId, collegeCode: data.code }, performedBy);
  revalidateAttendance();
  return { success: true };
}
