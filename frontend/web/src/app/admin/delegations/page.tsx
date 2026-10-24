import { listPaymentsForAdminAction } from '@/app/actions/admin-operations';
import DelegationsClient from './DelegationsClient';

export const dynamic = 'force-dynamic';

export default async function AdminDelegationsPage() {
  const squads = await listPaymentsForAdminAction();
  return <DelegationsClient squads={squads} />;
}
