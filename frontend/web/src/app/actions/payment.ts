'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireSquad, requireStaff } from '@/lib/auth-guard';
import { revalidatePath } from 'next/cache';

export interface FeeBreakdown {
  regularEventsCount: number;
  regularFeeRate: number;
  reserveEventsCount: number;
  hmCount: number;
  hmFeeRate: number;
  relayTeamsCount: number;
  relayFeeRate: number;
  totalAmount: number;
  hostUpiId: string;
  hostAccountName: string;
  squadPaymentStatus: 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
  rosterLocked: boolean;
}

export interface PaymentRecord {
  id: string;
  amount_submitted: number;
  amount_expected: number;
  utr_number: string;
  screenshot_url: string;
  status: 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
  rejection_reason?: string;
  created_at: string;
  verified_at?: string;
}

/**
 * Calculates current squad fee breakdown and fetches meet host UPI details.
 */
export async function getSquadFeeBreakdownAction(): Promise<{
  breakdown: FeeBreakdown;
  payments: PaymentRecord[];
}> {
  const session = await requireSquad();

  // Call database fee calculation RPC
  const { data: feeData, error: feeErr } = await supabaseAdmin.rpc('compute_squad_fee', {
    p_squad_id: session.squadId,
  });

  if (feeErr) throw new Error(feeErr.message);

  // Fetch meet settings
  const { data: settings } = await supabaseAdmin
    .from('meet_settings')
    .select('host_upi_id, host_account_name')
    .single();

  // Fetch squad status
  const { data: squad } = await supabaseAdmin
    .from('squads')
    .select('payment_status, roster_locked')
    .eq('id', session.squadId)
    .single();

  // Fetch payment history
  const { data: payments } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('squad_id', session.squadId)
    .order('created_at', { ascending: false });

  return {
    breakdown: {
      regularEventsCount: feeData.regular_events_count,
      regularFeeRate: feeData.regular_fee_rate,
      reserveEventsCount: feeData.reserve_events_count,
      hmCount: feeData.hm_count,
      hmFeeRate: feeData.hm_fee_rate,
      relayTeamsCount: feeData.relay_teams_count,
      relayFeeRate: feeData.relay_fee_rate,
      totalAmount: feeData.total_amount,
      hostUpiId: settings?.host_upi_id || 'vtuathletics@upi',
      hostAccountName: settings?.host_account_name || 'VTU Sports Board',
      squadPaymentStatus: squad?.payment_status || 'DRAFT',
      rosterLocked: squad?.roster_locked || false,
    },
    payments: payments || [],
  };
}

/**
 * Submits an offline UPI payment transaction for verification by the host college finance desk.
 */
export async function submitPaymentAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSquad();

    const utrNumber = (formData.get('utrNumber') as string || '').trim();
  const amountSubmitted = parseInt(formData.get('amountSubmitted') as string, 10);
  const screenshotData = formData.get('screenshotData') as string;

  if (!utrNumber || utrNumber.length < 8) {
    return { success: false, error: 'Please enter a valid 12-digit UPI / Bank Transaction UTR reference.' };
  }

  if (isNaN(amountSubmitted) || amountSubmitted <= 0) {
    return { success: false, error: 'Amount submitted must be greater than zero.' };
  }

  if (!screenshotData && !formData.get('screenshot')) {
    return { success: false, error: 'Please upload the payment transaction screenshot.' };
  }

  // Upload screenshot to Supabase Storage Bucket ('payment-proofs')
  let screenshotUrl = screenshotData || '';
  const screenshotFile = formData.get('screenshot') as File | null;

  try {
    await supabaseAdmin.storage.createBucket('payment-proofs', { public: true }).catch(() => {});

    if (screenshotFile && screenshotFile.size > 0 && typeof screenshotFile.arrayBuffer === 'function') {
      const bytes = await screenshotFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = screenshotFile.name.split('.').pop() || 'png';
      const storagePath = `${session.squadId}/${Date.now()}_utr_${utrNumber}.${ext}`;

      const { data: uploadResult, error: uploadErr } = await supabaseAdmin.storage
        .from('payment-proofs')
        .upload(storagePath, buffer, {
          contentType: screenshotFile.type || 'image/png',
          upsert: true,
        });

      if (!uploadErr && uploadResult) {
        const { data: pubData } = supabaseAdmin.storage
          .from('payment-proofs')
          .getPublicUrl(uploadResult.path);
        screenshotUrl = pubData.publicUrl;
      }
    } else if (screenshotData && screenshotData.startsWith('data:image')) {
      const match = screenshotData.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mime = match[1];
        const buffer = Buffer.from(match[2], 'base64');
        const ext = mime.split('/')[1] || 'png';
        const storagePath = `${session.squadId}/${Date.now()}_utr_${utrNumber}.${ext}`;

        const { data: uploadResult, error: uploadErr } = await supabaseAdmin.storage
          .from('payment-proofs')
          .upload(storagePath, buffer, {
            contentType: mime,
            upsert: true,
          });

        if (!uploadErr && uploadResult) {
          const { data: pubData } = supabaseAdmin.storage
            .from('payment-proofs')
            .getPublicUrl(uploadResult.path);
          screenshotUrl = pubData.publicUrl;
        }
      }
    }
  } catch (storageErr) {
    console.error('Payment screenshot storage upload warning:', storageErr);
  }

  // Get expected fee
  const { data: feeData } = await supabaseAdmin.rpc('compute_squad_fee', {
    p_squad_id: session.squadId,
  });

  const amountExpected = feeData?.total_amount || 0;
  if (amountExpected <= 0) {
    return {
      success: false,
      error: 'Cannot submit payment for an empty squad roster. Please register athletes before settling fees.',
    };
  }

  const { error } = await supabaseAdmin.from('payments').insert({
    squad_id: session.squadId,
    amount_submitted: amountSubmitted,
    amount_expected: amountExpected,
    utr_number: utrNumber,
    screenshot_url: screenshotUrl,
    status: 'SUBMITTED',
  });

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: `UTR Reference '${utrNumber}' has already been submitted by another squad.` };
    }
    return { success: false, error: error.message };
  }

    revalidatePath('/squad/payment');
    revalidatePath('/squad/dashboard');
    revalidatePath('/finance');

    return { success: true };
  } catch (err: any) {
    console.error('submitPaymentAction error:', err);
    return { success: false, error: err?.message || 'Failed to submit payment.' };
  }
}

/**
 * Lists all payment submissions for the Finance Verification Desk.
 */
export async function listPaymentsForFinanceAction() {
  await requireStaff(['meet_admin', 'finance_desk']);

  const { data: payments, error } = await supabaseAdmin
    .from('payments')
    .select(`
      id,
      amount_submitted,
      amount_expected,
      utr_number,
      screenshot_url,
      status,
      rejection_reason,
      created_at,
      verified_at,
      squads (
        id,
        squad_code,
        gender,
        ped_name,
        ped_phone,
        colleges (
          name,
          code
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return payments || [];
}

/**
 * Approves or rejects a payment submission at the Finance Desk.
 */
export async function verifyPaymentAction(
  paymentId: string,
  newStatus: 'VERIFIED' | 'REJECTED',
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const staffSession = await requireStaff(['meet_admin', 'finance_desk']);

  if (newStatus === 'REJECTED' && !reason?.trim()) {
    return { success: false, error: 'A rejection reason is mandatory when rejecting payments.' };
  }

  const { error } = await supabaseAdmin
    .from('payments')
    .update({
      status: newStatus,
      rejection_reason: newStatus === 'REJECTED' ? reason?.trim() : null,
      verified_by: staffSession.entityId,
      verified_at: new Date().toISOString(),
    })
    .eq('id', paymentId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/finance');
  revalidatePath('/squad/payment');
  revalidatePath('/squad/dashboard');
  return { success: true };
}
