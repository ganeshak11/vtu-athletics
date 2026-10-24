import { requireSquad } from '@/lib/auth-guard';
import { getSquadFeeBreakdownAction } from '@/app/actions/payment';
import PaymentClient from './PaymentClient';

export const metadata = {
  title: 'Entry Fee Settlement — VTU SportsOS Squad',
};

export default async function SquadPaymentPage() {
  const session = await requireSquad();
  const { breakdown, payments } = await getSquadFeeBreakdownAction();

  return (
    <div id="squad-payment-page" style={{ width: '100%', maxWidth: '100%' }}>
      <PaymentClient
        breakdown={breakdown}
        payments={payments}
        squadCode={session.squadCode || ''}
      />
    </div>
  );
}
