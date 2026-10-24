import { getAdminDashboardStatsAction } from '@/app/actions/admin-operations';
import AdminDashboardClient from './AdminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStatsAction();
  return <AdminDashboardClient initialStats={stats} />;
}
