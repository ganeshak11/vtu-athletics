import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth-guard';
import HeatsClient from './HeatsClient';

export const dynamic = 'force-dynamic';

export default async function AdminHeatsPage() {
  await requireAdmin();

  const { data: heats } = await supabaseAdmin
    .from('heats')
    .select(`
      id,
      heat_number,
      stage,
      status,
      events (
        id,
        name,
        code,
        gender,
        category
      ),
      heat_athletes (
        id,
        lane_number,
        profiles (
          id,
          sslc_name,
          usn,
          bid_number,
          squads (
            squad_code,
            colleges (
              name,
              code
            )
          )
        )
      )
    `)
    .order('created_at', { ascending: true });

  return <HeatsClient heats={heats || []} />;
}
