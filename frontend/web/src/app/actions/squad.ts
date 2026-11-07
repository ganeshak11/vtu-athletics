'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireSquad } from '@/lib/auth-guard';
import { revalidatePath } from 'next/cache';

export interface PedContact {
  pedName: string;
  pedPhone: string;
  pedEmail: string;
}

/**
 * Lets the college PED record / correct their contact details for this squad.
 * Contact details do not affect entries or fees, so this is allowed even when the
 * roster is locked (e.g. a PED changes phone number after payment).
 */
export async function updatePedContactAction(
  formData: FormData
): Promise<{ success: boolean; error?: string; contact?: PedContact }> {
  const session = await requireSquad();

  const pedName = (formData.get('pedName') as string || '').trim().replace(/\s+/g, ' ');
  const rawPhone = (formData.get('pedPhone') as string || '').trim();
  const pedEmail = (formData.get('pedEmail') as string || '').trim().toLowerCase();

  // Accept +91 / 0 prefixes and spaces/dashes; store the bare 10-digit mobile number
  let pedPhone = rawPhone.replace(/[\s()-]/g, '');
  if (pedPhone.startsWith('+91')) pedPhone = pedPhone.slice(3);
  else if (pedPhone.length === 12 && pedPhone.startsWith('91')) pedPhone = pedPhone.slice(2);
  else if (pedPhone.length === 11 && pedPhone.startsWith('0')) pedPhone = pedPhone.slice(1);

  if (pedName.length < 3 || pedName.length > 100) {
    return { success: false, error: 'Please enter the PED / Sports Director full name (3–100 characters).' };
  }
  if (!/^[6-9]\d{9}$/.test(pedPhone)) {
    return { success: false, error: 'Please enter a valid 10-digit Indian mobile number.' };
  }
  if (pedEmail && (pedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pedEmail))) {
    return { success: false, error: 'Please enter a valid email address, or leave it blank.' };
  }

  const { error } = await supabaseAdmin
    .from('squads')
    .update({
      ped_name: pedName,
      ped_phone: pedPhone,
      ped_email: pedEmail || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.squadId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/squad/dashboard');
  revalidatePath('/squad/payment');
  revalidatePath('/squad/athletes');
  return { success: true, contact: { pedName, pedPhone, pedEmail } };
}
