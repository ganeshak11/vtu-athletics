import Link from 'next/link';
import { requireSquad } from '@/lib/auth-guard';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizePaymentStatus } from '@/lib/payment-status';
import { listSquadAthletesAction } from '@/app/actions/athletes';
import IdCardsClient from '@/app/admin/id-cards/IdCardsClient';
import '@/app/admin/admin.css';

export const metadata = {
  title: 'Accreditation ID Cards — VTU SportsOS Squad',
  description: 'Printable 6x4 inch student-athlete identification and accreditation cards',
};

export const dynamic = 'force-dynamic';

export default async function SquadCardsPage() {
  const session = await requireSquad();

  const { data: squad } = await supabaseAdmin
    .from('squads')
    .select('payment_status, roster_locked')
    .eq('id', session.squadId)
    .maybeSingle();

  const paymentStatus = normalizePaymentStatus(squad?.payment_status);
  // Cards are issued only for a paid, frozen roster. While an admin emergency-unlock is open
  // the roster may contain unpaid entries, so cards stay unavailable until it is re-locked.
  const cardsReady = paymentStatus === 'VERIFIED' && squad?.roster_locked === true;

  if (!cardsReady) {
    const reason =
      paymentStatus === 'VERIFIED'
        ? 'Your roster is temporarily unlocked for an emergency adjustment. ID badges will be available again once the roster is re-locked and any balance is verified.'
        : paymentStatus === 'SUBMITTED'
        ? 'Your payment is awaiting Finance Desk verification. ID badges will be available here as soon as it is verified.'
        : paymentStatus === 'REJECTED'
        ? 'Your last payment was rejected. Please re-submit a correct receipt / UTR on the Fee Settlement page.'
        : 'ID badges are issued after your entry fee payment is submitted and verified by the Finance Desk.';

    return (
      <div style={{ width: '100%', maxWidth: '720px', margin: '2rem auto', padding: '0 1rem' }}>
        <div
          id="cards-not-ready"
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #f59e0b',
            borderRadius: '12px',
            padding: 'clamp(1.25rem, 4vw, 2rem)',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>🪪 ID Badges Not Yet Available</h1>
          <p style={{ margin: '0.75rem 0 1.25rem', color: '#475569', lineHeight: 1.6 }}>{reason}</p>
          <Link
            href="/squad/payment"
            style={{
              display: 'inline-block',
              background: '#2563eb',
              color: '#fff',
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Go to Fee Settlement &rarr;
          </Link>
        </div>
      </div>
    );
  }

  const athletes = await listSquadAthletesAction();

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '0 0.5rem' }}>
      <IdCardsClient athletes={athletes} />
    </div>
  );
}
