import { listAllAthletesAction } from '@/app/actions/admin-operations';
import IdCardsClient from './IdCardsClient';

export const dynamic = 'force-dynamic';

export default async function AdminIdCardsPage() {
  const athletes = await listAllAthletesAction();
  return <IdCardsClient athletes={athletes} />;
}
