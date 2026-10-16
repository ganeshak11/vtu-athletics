'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth-guard';
import { generateSquadPassphrase, hashPassphrase, hashPin } from '@/lib/passphrase';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';

export interface CreateCollegeResult {
  success: boolean;
  error?: string;
  college?: {
    id: string;
    name: string;
    code: string;
    district?: string;
  };
  menSquad?: {
    id: string;
    squad_code: string;
    passphrase_plain: string;
  };
  womenSquad?: {
    id: string;
    squad_code: string;
    passphrase_plain: string;
  };
}

/**
 * Creates a new College and automatically provisions its Men (-M) and Women (-G) squads
 * with generated secure passphrases. Returns plaintext passphrases so the Meet Director
 * can provide credentials directly to the College Physical Education Director (PED).
 */
export async function createCollegeAction(formData: FormData): Promise<CreateCollegeResult> {
  await requireAdmin();

  const name = (formData.get('name') as string || '').trim();
  const code = (formData.get('code') as string || '').trim().toUpperCase();
  const district = (formData.get('district') as string || '').trim();
  const pedName = (formData.get('pedName') as string || '').trim();
  const pedPhone = (formData.get('pedPhone') as string || '').trim();
  const pedEmail = (formData.get('pedEmail') as string || '').trim() || null;

  if (!name || !code) {
    return { success: false, error: 'College Name and Code (e.g. MITM) are required.' };
  }

  // Generate plain passphrases for both squads
  const menPassphrasePlain = generateSquadPassphrase();
  const womenPassphrasePlain = generateSquadPassphrase();

  const menPassHash = await hashPassphrase(menPassphrasePlain);
  const womenPassHash = await hashPassphrase(womenPassphrasePlain);

  // Call database atomic RPC function
  const { data, error } = await supabaseAdmin.rpc('create_college_with_squads', {
    p_name: name,
    p_code: code,
    p_district: district || 'Karnataka',
    p_men_passphrase_hash: menPassHash,
    p_women_passphrase_hash: womenPassHash,
    p_ped_name: pedName,
    p_ped_phone: pedPhone,
    p_ped_email: pedEmail,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/colleges');

  return {
    success: true,
    college: {
      id: data.college_id,
      name,
      code: data.college_code,
      district,
    },
    menSquad: {
      id: data.men_squad_id,
      squad_code: data.men_squad_code,
      passphrase_plain: menPassphrasePlain,
    },
    womenSquad: {
      id: data.women_squad_id,
      squad_code: data.women_squad_code,
      passphrase_plain: womenPassphrasePlain,
    },
  };
}

/**
 * Resets a squad's passphrase and returns the newly generated plain passphrase.
 */
export async function resetSquadPassphraseAction(squadId: string): Promise<{ success: boolean; newPassphrase?: string; error?: string }> {
  await requireAdmin();

  const newPassphrasePlain = generateSquadPassphrase();
  const newHash = await hashPassphrase(newPassphrasePlain);

  const { error } = await supabaseAdmin
    .from('squads')
    .update({ passphrase_hash: newHash })
    .eq('id', squadId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/colleges');
  return { success: true, newPassphrase: newPassphrasePlain };
}

/**
 * Toggles roster lock for a squad.
 */
export async function toggleSquadRosterLockAction(squadId: string, locked: boolean): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from('squads')
    .update({ roster_locked: locked })
    .eq('id', squadId);

  if (error) return { success: false, error: error.message };
  revalidatePath('/admin/colleges');
  return { success: true };
}

/**
 * Lists all colleges with their squads.
 */
export async function listCollegesAction() {
  await requireAdmin();

  const { data: colleges, error } = await supabaseAdmin
    .from('colleges')
    .select(`
      id,
      name,
      code,
      district,
      created_at,
      squads (
        id,
        gender,
        squad_code,
        ped_name,
        ped_phone,
        ped_email,
        roster_locked,
        payment_status,
        bid_block_start,
        bid_block_end
      )
    `)
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return colleges || [];
}

/**
 * Creates a new staff member (e.g., accreditation volunteer, warden, referee).
 */
export async function createStaffAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const displayName = (formData.get('displayName') as string || '').trim();
  const role = (formData.get('role') as string || '').trim();
  const username = (formData.get('username') as string || '').trim() || null;
  const password = (formData.get('password') as string || '').trim() || null;
  const pin = (formData.get('pin') as string || '').trim() || null;

  if (!displayName || !role) {
    return { success: false, error: 'Display Name and Role are required.' };
  }

  let passwordHash = null;
  let pinHash = null;

  if (username && password) {
    const salt = await bcrypt.genSalt(10);
    passwordHash = await bcrypt.hash(password, salt);
  }

  if (pin) {
    pinHash = await hashPin(pin);
  }

  if (!passwordHash && !pinHash) {
    return { success: false, error: 'Either a username/password or a 4-digit PIN is required.' };
  }

  const { error } = await supabaseAdmin.from('staff').insert({
    display_name: displayName,
    role,
    username,
    password_hash: passwordHash,
    pin_hash: pinHash,
    is_active: true,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/staff');
  return { success: true };
}

/**
 * Lists all registered staff members.
 */
export async function listStaffAction() {
  await requireAdmin();

  const { data: staff, error } = await supabaseAdmin
    .from('staff')
    .select('id, display_name, role, username, is_active, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return staff || [];
}
