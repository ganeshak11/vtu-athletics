import { requireAdmin } from '@/lib/auth-guard';
import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';
import { ScheduleManagerView } from './schedule-view';

export const metadata = {
  title: 'Meet Schedule & Heat Seeding Engine — VTU SportsOS',
};

export default async function AdminSchedulePage() {
  await requireAdmin();

  // Fetch all sessions with schedule items and events
  const { data: sessions } = await supabaseAdmin
    .from('schedule_sessions')
    .select(`
      id,
      session_name,
      session_date,
      start_time,
      end_time,
      schedule_items(
        id,
        stage,
        scheduled_time,
        estimated_duration_min,
        call_room_time,
        status,
        events(id, name, code, gender, category, start_type)
      )
    `)
    .order('session_date', { ascending: true })
    .order('start_time', { ascending: true });

  // Fetch all events for the heat draw generator modal
  const { data: events } = await supabaseAdmin
    .from('events')
    .select('id, name, code, gender, category, start_type')
    .order('name');

  const normalizedSessions = (sessions || []).map((s: any) => ({
    ...s,
    schedule_items: (s.schedule_items || []).map((item: any) => ({
      ...item,
      events: Array.isArray(item.events) ? item.events[0] : item.events,
    })),
  }));

  return (
    <div className="container" id="admin-schedule-container">
      {/* Top Breadcrumb & Heading */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }} className="no-print">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <Link href="/admin/colleges" style={{ color: 'var(--accent-cyan)', textDecoration: 'none', fontSize: '0.9rem' }}>
              Colleges
            </Link>
            <span style={{ color: 'var(--text-secondary)' }}>•</span>
            <Link href="/admin/bids" style={{ color: 'var(--accent-cyan)', textDecoration: 'none', fontSize: '0.9rem' }}>
              Bid Numbers
            </Link>
            <span style={{ color: 'var(--text-secondary)' }}>•</span>
            <Link href="/admin/amendments" style={{ color: 'var(--accent-cyan)', textDecoration: 'none', fontSize: '0.9rem' }}>
              Amendments
            </Link>
            <span style={{ color: 'var(--text-secondary)' }}>•</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>Schedule &amp; Heats</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>
            Meet Schedule &amp; Heat Draw Engine
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            World Athletics Rule 166.4 Serpentine Seeding &amp; Preferred Lane Allocation (Lanes 4, 5, 3, 6, 2, 7, 1, 8)
          </p>
        </div>
      </div>

      <ScheduleManagerView
        initialSessions={normalizedSessions}
        events={events || []}
      />
    </div>
  );
}
