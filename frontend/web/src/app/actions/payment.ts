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
  totalPaid: number;
  balanceDue: number;
  hostUpiId: string;
  hostAccountName: string;
  squadPaymentStatus: 'DrAFT' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
  rosterLocked: boolean;
  collegeName?: string;
  collegeCode?: string;
  district?: string;
  gender?: string;
  pedName?: string;
  pedPhone?: string;
  pedEmail?: string;
  athletesCount?: number;
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

/**
 * Calculates current squad fee breakdown and fetches meet host UPI details.
 */
export async function getSquadFeeBreakdownAction(): Promise<{
  breakdown: FeeBreakdown;
  payments: PaymentRecord[];
}> {
  const session = await requireSquad();

  // Fetch fees
  const feeCalc = await calculateSquadFees(session.squadId);

  // Fetch meet settings
  const { data: settings } = await supabaseAdmin
    .from('meet_settings')
    .select('host_upi_id, host_account_name')
    .limit(1)
    .maybeSingle();

  // Fetch squad status and college details for invoice
  const { data: squad } = await supabaseAdmin
    .from('squads')
    .select(`
      payment_status,
      roster_locked,
      gender,
      ped_name,
      ped_phone,
      ped_email,
      squad_code,
      colleges (
        id,
        name,
        code,
        district
      )
    `)
    .eq('id', session.squadId)
    .single();

  const { count: athletesCount } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('squad_id', session.squadId);

  // Fetch payment history
  const { data: payments } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('squad_id', session.squadId)
    .order('created_at', { ascending: false });

  const totalPaid = (payments || [])
    .filter((p: any) => p.status === 'VERIFIED')
    .reduce((sum: number, p: any) => sum + (p.amount_submitted || 0), 0);

  const totalAmount = feeCalc.totalAmount;
  const balanceDue = Math.max(0, totalAmount - totalPaid);

  const college = squad?.colleges as any;

  return {
    breakdown: {
      regularEventsCount: feeCalc.regularEventsCount,
      regularFeeRate: feeCalc.regularFeeRate,
      reserveEventsCount: feeCalc.reserveEventsCount,
      hmCount: feeCalc.hmCount,
      hmFeeRate: feeCalc.hmFeeRate,
      relayTeamsCount: feeCalc.relayTeamsCount,
      relayFeeRate: feeCalc.relayFeeRate,
      totalAmount,
      totalPaid,
      balanceDue,
      hostUpiId: settings?.host_upi_id || 'vtuathletics@upi',
      hostAccountName: settings?.host_account_name || 'VTU Sports Board',
      squadPaymentStatus: squad?.payment_status || 'DrAFT',
      rosterLocked: squad?.roster_locked || false,
      collegeName: college?.name || 'VTU Affiliated Institution',
      collegeCode: college?.code || '',
      district: college?.district || '',
      gender: squad?.gender || '',
      pedName: squad?.ped_name || '',
      pedPhone: squad?.ped_phone || '',
      pedEmail: squad?.ped_email || '',
      athletesCount: athletesCount || 0,
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

    const rawUtr = (formData.get('utrNumber') as string || '').trim();
    const utrClean = rawUtr.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const amountSubmitted = parseInt(formData.get('amountSubmitted') as string, 10);
    const screenshotData = formData.get('screenshotData') as string;

    if (!utrClean || utrClean.length < 8 || utrClean.length > 30) {
      return { success: false, error: 'Please enter a valid 8 to 30 character alphanumeric UTR / Bank reference number.' };
    }

    if (isNaN(amountSubmitted) || amountSubmitted <= 0) {
      return { success: false, error: 'Amount submitted must be greater than zero.' };
    }

    if (!screenshotData && !formData.get('screenshot')) {
      return { success: false, error: 'Please upload the payment transaction screenshot or receipt.' };
    }

    // Upload screenshot to Supabase Storage Bucket ('payment-proofs') with validation
    let screenshotUrl = screenshotData || '';
    const screenshotFile = formData.get('screenshot') as File | null;

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    const ALLOWED_MIME_TYPES: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
    };

    try {
      await supabaseAdmin.storage.createBucket('payment-proofs', { public: true }).catch(() => { });

      if (screenshotFile && screenshotFile.size > 0 && typeof screenshotFile.arrayBuffer === 'function') {
        if (screenshotFile.size > MAX_FILE_SIZE) {
          return { success: false, error: 'Payment proof file exceeds the maximum limit of 5MB.' };
        }

        const rawMime = (screenshotFile.type || 'image/png').toLowerCase();
        const safeExt = ALLOWED_MIME_TYPES[rawMime];
        if (!safeExt) {
          return { success: false, error: 'Invalid file format. Only JPG, PNG, WebP, and PDF receipts are accepted.' };
        }

        const bytes = await screenshotFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const storagePath = `${session.squadId}/${Date.now()}_utr_${utrClean}.${safeExt}`;

        const { data: uploadResult, error: uploadErr } = await supabaseAdmin.storage
          .from('payment-proofs')
          .upload(storagePath, buffer, {
            contentType: rawMime,
            upsert: true,
          });

        if (!uploadErr && uploadResult) {
          const { data: pubData } = supabaseAdmin.storage
            .from('payment-proofs')
            .getPublicUrl(uploadResult.path);
          screenshotUrl = pubData.publicUrl;
        }
      } else if (screenshotData && screenshotData.startsWith('data:')) {
        const match = screenshotData.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          const rawMime = match[1].toLowerCase();
          const safeExt = ALLOWED_MIME_TYPES[rawMime];
          if (!safeExt) {
            return { success: false, error: 'Invalid file format. Only JPG, PNG, WebP, and PDF receipts are accepted.' };
          }

          const buffer = Buffer.from(match[2], 'base64');
          if (buffer.length > MAX_FILE_SIZE) {
            return { success: false, error: 'Payment proof exceeds the maximum limit of 5MB.' };
          }

          const storagePath = `${session.squadId}/${Date.now()}_utr_${utrClean}.${safeExt}`;

          const { data: uploadResult, error: uploadErr } = await supabaseAdmin.storage
            .from('payment-proofs')
            .upload(storagePath, buffer, {
              contentType: rawMime,
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

    // Get expected total fee calculated accurately with flat ₹400 per relay team
    const feeCalc = await calculateSquadFees(session.squadId);
    const totalAmount = feeCalc.totalAmount;
    if (totalAmount <= 0) {
      return {
        success: false,
        error: 'Cannot submit payment for an empty squad roster. Please register athletes before settling fees.',
      };
    }

    // Check prior verified payments to prevent duplicate payments on settled rosters
    const { data: pastPayments } = await supabaseAdmin
      .from('payments')
      .select('amount_submitted')
      .eq('squad_id', session.squadId)
      .eq('status', 'VERIFIED');

    const priorVerified = (pastPayments || []).reduce((acc: number, p: any) => acc + (p.amount_submitted || 0), 0);
    const balanceDue = Math.max(0, totalAmount - priorVerified);

    if (balanceDue === 0 && priorVerified > 0) {
      return {
        success: false,
        error: 'All entry fees for your current roster have already been fully verified and settled.',
      };
    }

    const { error } = await supabaseAdmin.from('payments').insert({
      squad_id: session.squadId,
      amount_submitted: amountSubmitted,
      amount_expected: totalAmount,
      utr_number: utrClean,
      screenshot_url: screenshotUrl,
      status: 'SUBMITTED',
    });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: `UTR Reference '${utrClean}' has already been submitted by another squad.` };
      }
      return { success: false, error: error.message };
    }

    // Update status to SUBMITTED without locking roster (colleges can add students & pay differential balance)
    await supabaseAdmin
      .from('squads')
      .update({
        payment_status: 'SUBMITTED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.squadId);

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

  // Update payment record and fetch squad details
  const { data: updatedPayment, error } = await supabaseAdmin
    .from('payments')
    .update({
      status: newStatus,
      rejection_reason: newStatus === 'REJECTED' ? reason?.trim() : null,
      verified_by: staffSession.entityId,
      verified_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .select('squad_id, amount_expected')
    .maybeSingle();

  if (error) return { success: false, error: error.message };

  // Explicitly synchronize squad payment_status and roster_locked
  if (updatedPayment?.squad_id) {
    if (newStatus === 'VERIFIED') {
      const { data: verifiedList } = await supabaseAdmin
        .from('payments')
        .select('amount_submitted')
        .eq('squad_id', updatedPayment.squad_id)
        .eq('status', 'VERIFIED');

      const verifiedSum = (verifiedList || []).reduce((sum: number, p: any) => sum + (p.amount_submitted || 0), 0);
      const expectedAmount = updatedPayment.amount_expected || 0;

      if (verifiedSum >= expectedAmount) {
        await supabaseAdmin
          .from('squads')
          .update({
            payment_status: 'VERIFIED',
            updated_at: new Date().toISOString(),
          })
          .eq('id', updatedPayment.squad_id);
      } else {
        await supabaseAdmin
          .from('squads')
          .update({
            payment_status: 'SUBMITTED',
            updated_at: new Date().toISOString(),
          })
          .eq('id', updatedPayment.squad_id);
      }
    } else {
      // Check if any other payment is still SUBMITTED
      const { count: pendingCount } = await supabaseAdmin
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('squad_id', updatedPayment.squad_id)
        .eq('status', 'SUBMITTED');

      if ((pendingCount || 0) === 0) {
        await supabaseAdmin
          .from('squads')
          .update({
            payment_status: 'REJECTED',
            updated_at: new Date().toISOString(),
          })
          .eq('id', updatedPayment.squad_id);
      }
    }
  }

  revalidatePath('/finance');
  revalidatePath('/squad/payment');
  revalidatePath('/squad/dashboard');
  return { success: true };
}
