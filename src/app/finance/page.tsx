import { requireStaff } from '@/lib/auth-guard';
import { listPaymentsForFinanceAction } from '@/app/actions/payment';
import FinanceManager from './FinanceManager';

export const metadata = {
  title: 'Finance Verification Desk — VTU SportsOS',
};

export default async function FinancePage() {
  await requireStaff(['meet_admin', 'finance_desk']);
  const payments = await listPaymentsForFinanceAction();

  return (
    <div className="container" id="finance-desk-page">
      <FinanceManager initialPayments={payments} />
    </div>
  );
}
