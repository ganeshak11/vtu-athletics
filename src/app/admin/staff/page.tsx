import { requireAdmin } from '@/lib/auth-guard';
import { listStaffAction } from '@/app/actions/admin';
import StaffManager from './StaffManager';

export const metadata = {
  title: 'Staff & Officials Management — VTU SportsOS Admin',
};

export default async function AdminStaffPage() {
  await requireAdmin();
  const staff = await listStaffAction();

  return (
    <div className="container" id="admin-staff-page">
      <StaffManager initialStaff={staff} />
    </div>
  );
}
