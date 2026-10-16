import { requireAdmin } from '@/lib/auth-guard';
import { getBidOverviewAction } from '@/app/actions/bids';
import BidOverviewManager from './BidOverviewManager';

export const metadata = {
  title: 'Contiguous Bid Numbers Overview — VTU SportsOS Admin',
};

export default async function AdminBidsPage() {
  await requireAdmin();
  const squads = await getBidOverviewAction();

  return (
    <div className="container" id="admin-bids-page">
      <BidOverviewManager initialSquads={squads} />
    </div>
  );
}
