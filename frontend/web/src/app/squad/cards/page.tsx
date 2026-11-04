import { requireSquad } from '@/lib/auth-guard';
import { listSquadAthletesAction } from '@/app/actions/athletes';
import IdCardsClient from '@/app/admin/id-cards/IdCardsClient';
import '@/app/admin/admin.css';

export const metadata = {
  title: 'Accreditation ID Cards — VTU SportsOS Squad',
  description: 'Printable 6x4 inch student-athlete identification and accreditation cards',
};

export const dynamic = 'force-dynamic';

export default async function SquadCardsPage() {
  await requireSquad();
  const athletes = await listSquadAthletesAction();

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '0 0.5rem' }}>
      <IdCardsClient athletes={athletes} />
    </div>
  );
}
