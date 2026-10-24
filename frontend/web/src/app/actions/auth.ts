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
 * Institution / Squad Manager Login:
 * Authenticates with 3 prompts:
 * 1. College Code (e.g. BMSCE, RVCE, MITM)
 * 2. Division / Gender (Male or Female)
 * 3. Secret Passphrase
 */
export async function loginSquad(formData: FormData): Promise<AuthResponse> {
  let collegeCode = (formData.get('collegeCode') as string || formData.get('squadCode') as string || '').trim().toUpperCase();
  let rawGender = (formData.get('gender') as string || '').trim().toLowerCase();
  const passphrase = (formData.get('passphrase') as string || '').trim();

  let gender = rawGender === 'male' || rawGender === 'men' ? 'men' : (rawGender === 'female' || rawGender === 'women' ? 'women' : '');

  // If gender wasn't passed directly, check if squadCode has -M or -G/-W suffix
  if (!gender) {
    if (collegeCode.endsWith('-M')) {
      gender = 'men';
      collegeCode = collegeCode.slice(0, -2);
    } else if (collegeCode.endsWith('-W') || collegeCode.endsWith('-G')) {
      gender = 'women';
      collegeCode = collegeCode.slice(0, -2);
    }
  }

  if (!collegeCode || !passphrase) {
    return { success: false, error: 'Please enter College Code and Passphrase.' };
  }

  if (!gender) {
    gender = 'men';
  }

  // 1. Try finding college first by code
  const { data: college } = await supabaseAdmin
    .from('colleges')
    .select('id, name, code, district')
    .ilike('code', collegeCode)
    .maybeSingle();

  let squad = null;
  if (college) {
    const { data: matchedSquad } = await supabaseAdmin
      .from('squads')
      .select('id, college_id, gender, squad_code, passphrase_hash')
      .eq('college_id', college.id)
      .eq('gender', gender)
      .maybeSingle();
    squad = matchedSquad;
  }

  // 2. Fallback: match by direct squad_code (e.g. BMSCE-M or BMSCE-G)
  if (!squad) {
    const codeVariant = `${collegeCode}-${gender === 'men' ? 'M' : 'G'}`;
    const codeVariantW = `${collegeCode}-W`;
    const { data: matchedSquad } = await supabaseAdmin
      .from('squads')
      .select('id, college_id, gender, squad_code, passphrase_hash, colleges(id, name, code, district)')
      .or(`squad_code.eq.${collegeCode},squad_code.eq.${codeVariant},squad_code.eq.${codeVariantW}`)
      .maybeSingle();
    squad = matchedSquad;
  }

  if (!squad) {
    return { success: false, error: 'Invalid college code, division, or passphrase.' };
  }

  const isValid = await verifyPassphrase(passphrase, squad.passphrase_hash);
  if (!isValid) {
    return { success: false, error: 'Invalid college code, division, or passphrase.' };
  }

  let fullCollege = college;
  if (!fullCollege && squad.college_id) {
    const { data: col } = await supabaseAdmin
      .from('colleges')
      .select('id, name, code, district')
      .eq('id', squad.college_id)
      .maybeSingle();
    fullCollege = col;
  }

  const collegeName = fullCollege?.name || squad.squad_code;
  const colCode = fullCollege?.code || collegeCode;

  // Establish session
  const session = await getSession();
  session.isLoggedIn = true;
  session.role = 'squad_manager';
  session.entityId = squad.id;
  session.squadId = squad.id;
  session.collegeId = squad.college_id;
  session.collegeName = collegeName;
  session.collegeCode = colCode;
  session.gender = squad.gender as 'men' | 'women';
  session.squadCode = squad.squad_code;
  session.displayName = `${collegeName} (${squad.gender === 'men' ? 'Men' : 'Women'})`;

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
    return { success: true, redirectTo: '/admin/payments' };
  }

  return { success: true, redirectTo: '/admin' };
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
