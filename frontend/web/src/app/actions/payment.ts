'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireSquad, requireStaff } from '@/lib/auth-guard';
import { revalidatePath } from 'next/cache';
import { calculateSquadFees, reviewPayment, getRelayReadinessIssues } from '@/lib/payments';
import { resolveHostUpiId, resolveHostAccountName } from '@/lib/payment-config';

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
  squadPaymentStatus: SquadPaymentStatus;
  hasPendingPayment: boolean;
  /** Relay lineups that must be completed before payment (roster freezes on payment) */
  relayIssues: string[];
  registrationOpen: boolean;
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

/**
 * Squad payment lifecycle. The DB constraint currently stores the draft state as 'DrAFT'
 * (legacy spelling); 'DRAFT' is accepted too so either schema revision works.
 */
export type SquadPaymentStatus = 'DrAFT' | 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';

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

  // Fetch fees + relay readiness
  const [feeCalc, relayIssues] = await Promise.all([
    calculateSquadFees(session.squadId),
    getRelayReadinessIssues(session.squadId),
  ]);

  // Fetch meet settings
  const { data: settings } = await supabaseAdmin
    .from('meet_settings')
    .select('host_upi_id, host_account_name, registration_open')
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
      hostUpiId: resolveHostUpiId(settings?.host_upi_id),
      hostAccountName: resolveHostAccountName(settings?.host_account_name),
      squadPaymentStatus: (squad?.payment_status || 'DrAFT') as SquadPaymentStatus,
      hasPendingPayment: (payments || []).some((p: any) => p.status === 'SUBMITTED'),
      relayIssues: squad?.roster_locked === true ? [] : relayIssues,
      registrationOpen: settings?.registration_open !== false,
      rosterLocked: squad?.roster_locked === true,
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

    // UTR must be 8–30 alphanumeric characters (spaces/dashes are stripped, other symbols rejected)
    if (!/^[A-Za-z0-9\s-]+$/.test(rawUtr) || utrClean.length < 8 || utrClean.length > 30) {
      return { success: false, error: 'Please enter a valid 8 to 30 character alphanumeric UTR / Bank reference number.' };
    }

    if (!/^\d+$/.test(String(formData.get('amountSubmitted') || '').trim()) || isNaN(amountSubmitted) || amountSubmitted <= 0) {
      return { success: false, error: 'Amount must be a whole number of rupees greater than zero.' };
    }

    if (!screenshotData && !formData.get('screenshot')) {
      return { success: false, error: 'Please upload the payment transaction screenshot or receipt.' };
    }

    // Relay readiness: payment freezes the roster, so every nominated relay must have a full lineup
    // (Skipped when already locked — e.g. re-upload after rejection — since the PED cannot edit then.)
    const { data: lockRow } = await supabaseAdmin
      .from('squads')
      .select('roster_locked')
      .eq('id', session.squadId)
      .maybeSingle();
    const relayIssues = lockRow?.roster_locked === true ? [] : await getRelayReadinessIssues(session.squadId);
    if (relayIssues.length > 0) {
      return {
        success: false,
        error: `Complete your relay teams before paying (the roster locks on payment): ${relayIssues.join(' ')}`,
      };
    }

    // Lifecycle guard: only one payment may be awaiting verification at a time.
    // DRAFT and REJECTED squads may submit; a VERIFIED squad may submit only if an admin
    // emergency-unlocked the roster and a differential balance is now due (checked below).
    const { count: pendingCount } = await supabaseAdmin
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('squad_id', session.squadId)
      .eq('status', 'SUBMITTED');

    if ((pendingCount || 0) > 0) {
      return {
        success: false,
        error: 'Roster Locked & Payment Submitted: A payment is already awaiting Finance Desk verification. You can re-submit only if it is rejected.',
      };
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

    // Freeze the roster: once payment is submitted, athletes and relay teams can no longer change
    const { error: lockErr } = await supabaseAdmin
      .from('squads')
      .update({
        roster_locked: true,
        payment_status: 'SUBMITTED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.squadId);

    if (lockErr) {
      console.error('submitPaymentAction roster lock error:', lockErr);
      return { success: false, error: `Payment recorded, but the roster could not be locked: ${lockErr.message}` };
    }

    revalidatePath('/squad/payment');
    revalidatePath('/squad/dashboard');
    revalidatePath('/squad/athletes');
    revalidatePath('/squad/relay');
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

  const result = await reviewPayment(paymentId, newStatus, reason, staffSession.entityId);
  if (!result.success) return result;

  revalidatePath('/finance');
  revalidatePath('/squad/payment');
  revalidatePath('/squad/dashboard');
  return { success: true };
}
