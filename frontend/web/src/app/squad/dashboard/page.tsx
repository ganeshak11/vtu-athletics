import { requireSquad } from '@/lib/auth-guard';
import { supabaseAdmin } from '@/lib/supabase';
import { listSquadAthletesAction, getAvailableEventsAction, getSquadRelayCountAction } from '@/app/actions/athletes';
import AthletesManager from '../athletes/AthletesManager';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

export const metadata = {
  title: 'Institution Contingent Portal — VTU SportsOS',
};

export default async function SquadDashboardPage() {
  const session = await requireSquad();

  // Fetch squad details from DB
  const { data: squad } = await supabaseAdmin
    .from('squads')
    .select('id, gender, squad_code, ped_name, ped_phone, ped_email, roster_locked, payment_status, colleges(name, code, district)')
    .eq('id', session.squadId)
    .single();

  const college = Array.isArray(squad?.colleges) ? squad.colleges[0] : squad?.colleges;
  const isMen = squad?.gender === 'men';

  // Fetch athletes, events catalogue, and relay quota
  const athletes = await listSquadAthletesAction();
  const events = await getAvailableEventsAction();
  const relayCount = await getSquadRelayCountAction();

  const formattedAthletes = athletes.map((a: any) => ({
    ...a,
    registrations: a.registrations.map((r: any) => ({
      id: r.id,
      kind: r.kind,
      event_id: r.event_id,
      events: Array.isArray(r.events) ? r.events[0] : r.events,
    })),
  }));

  return (
    <div id="squad-dashboard-container" style={{ width: '100%', maxWidth: '100%' }}>
      {/* Top Banner: Institution Info */}
      <Card style={{ marginBottom: '2rem' }}>
        <CardContent style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '2.25rem' }}>{isMen ? '🚹' : '🚺'}</span>
              <div>
                <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {college?.name || session.collegeName}
                </h1>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  VTU Affiliated Institution &bull; {isMen ? "Men's Division" : "Women's Division"}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <span>
                College Code: <strong style={{ color: 'var(--text-primary)' }}>{college?.code || session.collegeCode || squad?.squad_code}</strong>
              </span>
              <span>&bull;</span>
              <span>
                Squad Code: <strong style={{ color: 'var(--accent-primary)' }}>{squad?.squad_code}</strong>
              </span>
              <span>&bull;</span>
              <span>
                Host Campus: <strong>Dr. ACS College of Engineering, Bengaluru</strong>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Badge variant={squad?.payment_status === 'VERIFIED' ? 'success' : 'warning'}>
              Payment: {squad?.payment_status || 'DRAFT'}
            </Badge>
            <Badge variant={squad?.roster_locked ? 'danger' : 'success'}>
              {squad?.roster_locked ? '🔒 Roster Locked' : '🔓 Roster Open'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* ATHLETE ROSTER & REGISTRATION MANAGER */}
      <section style={{ marginBottom: '3rem' }}>
        <AthletesManager
          initialAthletes={formattedAthletes}
          availableEvents={events}
          rosterLocked={squad?.roster_locked || false}
          squadCode={squad?.squad_code || session.squadCode || ''}
          gender={session.gender as 'men' | 'women'}
          relayCount={relayCount}
          collegeName={college?.name || session.collegeName}
          paymentStatus={squad?.payment_status}
        />
      </section>

      {/* QUICK PORTAL OPERATIONS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <Card className="hover-lift">
          <CardContent style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>💳 Entry Fee Settlement</h3>
                <span style={{ fontSize: '1.4rem' }}>UPI</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
                Scan the college host UPI QR code, settle participation fees (₹100/event, reserve free), and submit transaction UTR proof.
              </p>
            </div>
            <Link href="/squad/payment">
              <button
                type="button"
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--accent-primary)',
                  padding: '0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                View Payment &amp; QR Code &rarr;
              </button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>🤝 4x100m Relay Board</h3>
                <span style={{ fontSize: '1.4rem' }}>🏃</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
                Review assigned 4 running baton members and reserve runners for your squad&apos;s relay team.
              </p>
            </div>
            <Link href="/squad/relay">
              <button
                type="button"
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--accent-primary)',
                  padding: '0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Review Relay Team &rarr;
              </button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>🪪 Athlete Badges</h3>
                <span style={{ fontSize: '1.4rem' }}>🖨️</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
                Generate and print official printable athlete ID cards with QR codes and bib numbers for stadium gate &amp; call room.
              </p>
            </div>
            <Link href="/squad/cards">
              <button
                type="button"
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--accent-primary)',
                  padding: '0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Print Athlete Cards &rarr;
              </button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
