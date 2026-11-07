import { requireSquad } from '@/lib/auth-guard';
import { getSquadFeeBreakdownAction } from '@/app/actions/payment';
import { listSquadAthletesAction } from '@/app/actions/athletes';
import type { InvoiceAthlete } from '@/components/invoice/FeeInvoiceModal';
import PaymentClient from './PaymentClient';

export const metadata = {
  title: 'Entry Fee Settlement — VTU SportsOS Squad',
};

export default async function SquadPaymentPage() {
  const session = await requireSquad();
  const [{ breakdown, payments }, athletesRaw] = await Promise.all([
    getSquadFeeBreakdownAction(),
    listSquadAthletesAction(),
  ]);

  // Minimal roster for the Registration Form / Fee Invoice (no Aadhaar or other personal data)
  const athletes: InvoiceAthlete[] = (athletesRaw || []).map((a: any) => ({
    id: a.id,
    sslc_name: a.sslc_name,
    usn: a.usn,
    registrations: (a.registrations || []).map((r: any) => {
      const ev = Array.isArray(r.events) ? r.events[0] : r.events;
      return { id: r.id, kind: r.kind, events: ev ? { code: ev.code, name: ev.name } : null };
    }),
  }));

  return (
    <div id="squad-payment-page" style={{ width: '100%', maxWidth: '100%' }}>
      <PaymentClient
        breakdown={breakdown}
        payments={payments}
        squadCode={session.squadCode || ''}
        athletes={athletes}
      />
    </div>
  );
}
