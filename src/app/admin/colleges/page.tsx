import { requireAdmin } from '@/lib/auth-guard';
import { listCollegesAction } from '@/app/actions/admin';
import CollegesManager from './CollegesManager';

export const metadata = {
  title: 'Colleges & Squads Management — VTU SportsOS Admin',
};

export default async function AdminCollegesPage() {
  await requireAdmin();
  const colleges = await listCollegesAction();

  return (
    <div className="container" id="admin-colleges-page">
      <CollegesManager initialColleges={colleges} />
    </div>
  );
}
