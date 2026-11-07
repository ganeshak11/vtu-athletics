/**
 * Squad payment lifecycle status.
 *
 * The draft state was historically stored as 'DrAFT' (a bulk "DR" → "Dr" replace mangled it).
 * Migration 0015 rewrites stored rows to 'DRAFT'; this helper keeps every reader tolerant of
 * either spelling so the app works before and after that migration is applied.
 */
export type SquadPaymentStatus = 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';

export function normalizePaymentStatus(value?: string | null): SquadPaymentStatus {
  const v = String(value || '').trim().toUpperCase();
  if (v === 'SUBMITTED' || v === 'VERIFIED' || v === 'REJECTED') return v;
  return 'DRAFT';
}

/**
 * Money actually credited for one payment row: only VERIFIED payments count, and only the
 * bank-confirmed amount_received (entered by Finance), never the amount the college typed.
 * Rows fetched before migration 0018 have no amount_received key at all; they fall back to
 * amount_submitted (old behaviour) so the app keeps working until the migration is applied.
 */
export function creditedAmount(p: { status?: string | null; amount_received?: number | null; amount_submitted?: number | null }): number {
  if (p.status !== 'VERIFIED') return 0;
  if (!('amount_received' in p)) return Number(p.amount_submitted || 0);
  return Number(p.amount_received || 0);
}

export function totalCredited(payments: Array<Parameters<typeof creditedAmount>[0]> | null | undefined): number {
  return (payments || []).reduce((sum, p) => sum + creditedAmount(p), 0);
}
