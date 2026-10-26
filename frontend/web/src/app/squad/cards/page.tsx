import { redirect } from 'next/navigation';
import { requireSquad } from '@/lib/auth-guard';

export const metadata = {
  title: 'Accreditation Restricted — VTU SportsOS',
};

/**
 * Access Restricted: Athlete QR code accreditation badges and bib cards
 * are generated and printed exclusively by the Directorate Admin Desk (/admin/id-cards).
 */
export default async function SquadCardsPage() {
  await requireSquad();
  redirect('/squad/dashboard');
}
