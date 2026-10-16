'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/session';
import { verifyPassphrase, verifyPin } from '@/lib/passphrase';
import bcrypt from 'bcryptjs';

export interface AuthResponse {
  success: boolean;
  error?: string;
  redirectTo?: string;
}

/**
 * Squad Manager Login: Authenticates a squad via Squad Code + Passphrase.
 * Squad codes are formatted as COLLEGE-M or COLLEGE-G (e.g. MITM-M).
 */
export async function loginSquad(formData: FormData): Promise<AuthResponse> {
  const squadCode = (formData.get('squadCode') as string || '').trim().toUpperCase();
  const passphrase = (formData.get('passphrase') as string || '').trim();

  if (!squadCode || !passphrase) {
    return { success: false, error: 'Please enter both squad code and passphrase.' };
  }

  // Fetch squad and associated college
  const { data: squad, error: squadErr } = await supabaseAdmin
    .from('squads')
    .select('id, college_id, gender, squad_code, passphrase_hash, colleges(id, name, code, district)')
    .eq('squad_code', squadCode)
    .single();

  if (squadErr || !squad) {
    return { success: false, error: 'Invalid squad code or passphrase.' };
  }

  const isValid = await verifyPassphrase(passphrase, squad.passphrase_hash);
  if (!isValid) {
    return { success: false, error: 'Invalid squad code or passphrase.' };
  }

  const college = Array.isArray(squad.colleges) ? squad.colleges[0] : squad.colleges;
  const collegeName = college?.name || squad.squad_code;
  const collegeCode = college?.code || '';

  // Establish session
  const session = await getSession();
  session.isLoggedIn = true;
  session.role = 'squad_manager';
  session.entityId = squad.id;
  session.squadId = squad.id;
  session.collegeId = squad.college_id;
  session.collegeName = collegeName;
  session.collegeCode = collegeCode;
  session.gender = squad.gender as 'men' | 'women';
  session.squadCode = squad.squad_code;
  session.displayName = `${collegeName} (${squad.gender.toUpperCase()})`;

  await session.save();

  return { success: true, redirectTo: '/squad/dashboard' };
}

/**
 * Admin Login: Authenticates technical meet administrators and finance staff.
 */
export async function loginAdmin(formData: FormData): Promise<AuthResponse> {
  const username = (formData.get('username') as string || '').trim();
  const password = (formData.get('password') as string || '').trim();

  if (!username || !password) {
    return { success: false, error: 'Username and password are required.' };
  }

  const { data: staffMember, error } = await supabaseAdmin
    .from('staff')
    .select('id, username, password_hash, display_name, role, is_active')
    .eq('username', username)
    .single();

  if (error || !staffMember) {
    return { success: false, error: 'Invalid credentials.' };
  }

  if (!staffMember.is_active) {
    return { success: false, error: 'This account has been deactivated.' };
  }

  if (!staffMember.password_hash) {
    return { success: false, error: 'This account must log in using a PIN.' };
  }

  const isValid = await bcrypt.compare(password, staffMember.password_hash);
  if (!isValid) {
    return { success: false, error: 'Invalid credentials.' };
  }

  const session = await getSession();
  session.isLoggedIn = true;
  session.role = staffMember.role;
  session.entityId = staffMember.id;
  session.displayName = staffMember.display_name;

  await session.save();

  if (staffMember.role === 'finance_desk') {
    return { success: true, redirectTo: '/finance' };
  }

  return { success: true, redirectTo: '/admin/colleges' };
}

/**
 * Staff PIN Login: For accreditation volunteers, wardens, call room marshals, and referees.
 */
export async function loginStaffPin(formData: FormData): Promise<AuthResponse> {
  const role = (formData.get('role') as string || '').trim();
  const pin = (formData.get('pin') as string || '').trim();

  if (!pin) {
    return { success: false, error: 'Please enter your access PIN.' };
  }

  // Fetch active staff with matching role and a pin_hash
  const query = supabaseAdmin
    .from('staff')
    .select('id, pin_hash, display_name, role, scope_event_ids, is_active')
    .eq('is_active', true)
    .not('pin_hash', 'is', null);

  if (role) {
    query.eq('role', role);
  }

  const { data: candidates, error } = await query;

  if (error || !candidates || candidates.length === 0) {
    return { success: false, error: 'Invalid PIN or unauthorized role.' };
  }

  // Verify PIN against candidates
  let matchedStaff = null;
  for (const candidate of candidates) {
    if (candidate.pin_hash && (await verifyPin(pin, candidate.pin_hash))) {
      matchedStaff = candidate;
      break;
    }
  }

  if (!matchedStaff) {
    return { success: false, error: 'Invalid access PIN.' };
  }

  const session = await getSession();
  session.isLoggedIn = true;
  session.role = matchedStaff.role;
  session.entityId = matchedStaff.id;
  session.displayName = matchedStaff.display_name;
  session.scopeEventIds = matchedStaff.scope_event_ids || [];

  await session.save();

  // Role-specific redirect
  let redirectTo = '/';
  if (matchedStaff.role === 'accreditation_volunteer') redirectTo = '/accreditation';
  else if (matchedStaff.role === 'warden') redirectTo = '/warden';
  else if (matchedStaff.role === 'call_room_official') redirectTo = '/call-room';
  else if (matchedStaff.role === 'referee') redirectTo = '/referee';
  else if (matchedStaff.role === 'meet_admin') redirectTo = '/admin/colleges';
  else if (matchedStaff.role === 'finance_desk') redirectTo = '/finance';

  return { success: true, redirectTo };
}

/**
 * Destroys session and returns redirect to home.
 */
export async function logoutAction(): Promise<void> {
  const session = await getSession();
  session.destroy();
}
