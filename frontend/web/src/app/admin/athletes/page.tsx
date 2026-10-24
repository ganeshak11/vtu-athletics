import { listAllAthletesAction } from '@/app/actions/admin-operations';
import AthletesClient from './AthletesClient';

export const dynamic = 'force-dynamic';

export default async function AdminAthletesPage() {
  const athletes = await listAllAthletesAction();
  return <AthletesClient athletes={athletes} />;
}
