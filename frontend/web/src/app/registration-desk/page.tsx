import { listCollegesForDeskAction } from '@/app/actions/attendance';
import RegistrationDeskClient from './RegistrationDeskClient';

export const dynamic = 'force-dynamic';

export default async function RegistrationDeskPage() {
  const { colleges, migrationApplied } = await listCollegesForDeskAction();
  return <RegistrationDeskClient initialColleges={colleges} migrationApplied={migrationApplied} />;
}
