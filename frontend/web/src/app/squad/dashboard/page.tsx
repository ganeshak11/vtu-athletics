import Link from 'next/link';
import { requireSquad } from '@/lib/auth-guard';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizePaymentStatus } from '@/lib/payment-status';
import { listSquadAthletesAction, getSquadRelayCountAction } from '@/app/actions/athletes';
import './dashboard.css';
import PedContactCard from './PedContactCard';
import { canEditRoster, isLateEntryWindow } from '@/lib/roster-window';

export const metadata = {
  title: 'Contingent Overview — VTU SportsOS',
  description: 'Executive overview, roster verification, and squad operations for VTU’s 28th Inter-Collegiate State Level Athletic Meet 2026',
};

export default async function SquadDashboardPage() {
  const session = await requireSquad();

  // Fetch squad details from DB
  const { data: squad } = await supabaseAdmin
    .from('squads')
    .select('*, colleges(name, code, district)')
    .eq('id', session.squadId)
    .single();

  const college = Array.isArray(squad?.colleges) ? squad.colleges[0] : squad?.colleges;
  const isMen = squad?.gender === 'men' || session.gender === 'men';
  const collegeName = college?.name || session.collegeName || 'Affiliated Institution';
  const collegeCode = college?.code || session.collegeCode || squad?.squad_code || 'VTU';
  const district = college?.district || 'Karnataka';
  const squadCode = squad?.squad_code || session.squadCode || '';
  const paymentStatus = normalizePaymentStatus(squad?.payment_status);
  const isPaymentVerified = paymentStatus === 'VERIFIED';
  const rosterLocked = squad?.roster_locked === true;
  const paymentStatusLabel =
    paymentStatus + (rosterLocked ? ' · 🔒 Roster Locked' : '');

  // Fetch championship registration status
  const { data: meetSettings } = await supabaseAdmin
    .from('meet_settings')
    .select('registration_open')
    .limit(1)
    .maybeSingle();
  const isRegistrationOpen = meetSettings ? meetSettings.registration_open !== false : true;
  const lateEntryOpen = isLateEntryWindow(isRegistrationOpen, squad);
  const canAddAthletes = canEditRoster(isRegistrationOpen, squad);

  // Fetch athletes and relay count
  const athletes = await listSquadAthletesAction();
  const relayCount = await getSquadRelayCountAction();

  const formattedAthletes = athletes.map((a: any) => ({
    ...a,
    registrations: (a.registrations || []).map((r: any) => ({
      id: r.id,
      kind: r.kind,
      event_id: r.event_id,
      events: Array.isArray(r.events) ? r.events[0] : r.events,
    })),
  }));

  // Calculations
  const totalAthletes = formattedAthletes.length;
  const maxQuota = 25;
  const quotaPercent = Math.min(100, Math.round((totalAthletes / maxQuota) * 100));

  const regularCount = formattedAthletes.reduce(
    (acc: number, a: any) => acc + a.registrations.filter((r: any) => r.kind === 'regular').length,
    0
  );
  const hmCount = formattedAthletes.reduce(
    (acc: number, a: any) => acc + a.registrations.filter((r: any) => r.kind === 'half_marathon').length,
    0
  );
  const relayEvents = new Set<string>();
  formattedAthletes.forEach((a: any) => {
    a.registrations
      .filter((r: any) => r.kind === 'relay')
      .forEach((r: any) => {
        if (r.event_id) relayEvents.add(r.event_id);
      });
  });
  // Flat ₹400 per relay team (regardless of up to 6 members: 4 runners + 2 reserves)
  const totalSquadFee = (regularCount * 100) + (hmCount * 100) + (relayEvents.size * 400);

  const billableEntries = formattedAthletes.reduce((acc: number, athlete: any) => {
    const billable = athlete.registrations.filter((r: any) => r.kind !== 'reserve').length;
    return acc + billable;
  }, 0);

  const totalEventEntries = formattedAthletes.reduce(
    (acc: number, athlete: any) => acc + athlete.registrations.length,
    0
  );

  const registeredRelayMembers = formattedAthletes.filter((a: any) =>
    a.registrations.some((r: any) => r.kind === 'relay' || r.events?.code?.includes('4X100'))
  ).length;

  return (
    <div id="squad-dashboard-container" className="squad-dashboard-root">

      {/* 1. EXECUTIVE INSTITUTION HERO BANNER */}
      <section className="squad-hero-card">
        <div className="squad-hero-accent-strip" />
        <div className="squad-hero-body">
          {/* Identity Left */}
          <div className="squad-hero-identity">
            <div className="squad-crest-emblem">
              <span className="squad-crest-icon">{isMen ? '🚹' : '🚺'}</span>
              <span className="squad-crest-code">{collegeCode.slice(0, 5)}</span>
            </div>
            <div className="squad-identity-info">
              <div className="squad-micro-eyebrow">
                <span>VTU's 28TH INTER-COLLEGIATE ATHLETIC MEET 2026</span>
                <span>&bull;</span>
                <span>OFFICIAL CONTINGENT DELEGATION</span>
              </div>
              <h1 className="squad-college-title">{collegeName}</h1>
              <div className="squad-meta-tags">
                <span className={`squad-pill-tag ${isMen ? 'squad-pill-division-men' : 'squad-pill-division-women'}`}>
                  {isMen ? "Men's Athletics Division" : "Women's Athletics Division"}
                </span>
                <span className="squad-pill-tag squad-pill-code">
                  College Code: <strong>{collegeCode}</strong>
                </span>
                <span className="squad-pill-tag squad-pill-code">
                  Squad Code: <strong>{squadCode}</strong>
                </span>
                <span className="squad-pill-tag squad-pill-code">
                  District: <strong>{district}</strong>
                </span>
                <span className="squad-pill-tag squad-pill-host">
                  Host: <strong>Dr. ACS College of Engineering, Bengaluru</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Status & Quick Action Buttons Right */}
          <div className="squad-hero-actions">
            <div className="squad-badges-row">
              <span
                className={`squad-status-badge ${isPaymentVerified ? 'squad-badge-verified' : 'squad-badge-pending'
                  }`}
              >
                {isPaymentVerified ? '✓ Payment: Verified' : `⚠️ Payment: ${paymentStatusLabel}`}
              </span>
              <span className={`squad-status-badge ${isRegistrationOpen ? 'squad-badge-open' : 'squad-badge-pending'}`}>
                {isRegistrationOpen ? '🔓 Registration: Open' : lateEntryOpen ? '⏱️ Late Entry Window Open' : '🔒 Registration: Closed'}
              </span>
            </div>

            <div className="squad-hero-buttons">
              <Link href="/squad/athletes" className="squad-cta-primary">
                <span>+</span> Nominate Athlete
              </Link>
              <Link href="/squad/athletes" className="squad-cta-secondary">
                Manage Full Roster &rarr;
              </Link>
              <Link href="/squad/payment" className="squad-cta-secondary">
                Fee Settlement &amp; Invoice &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PED / SPORTS DIRECTOR CONTACT (required before payment) */}
      <PedContactCard
        initialName={squad?.ped_name || ''}
        initialPhone={squad?.ped_phone || ''}
        initialEmail={squad?.ped_email || ''}
      />

      {/* 2b. Athletes missing date of birth (needed for AURA Athletes app login) */}
      {(() => {
        const missingDob = (athletes || []).filter((a: any) => !a.date_of_birth);
        if (missingDob.length === 0) return null;
        return (
          <section
            id="banner-dob-missing"
            style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '12px', padding: '1rem 1.25rem', color: '#92400e', fontSize: '0.9rem', lineHeight: 1.5 }}
          >
            ⚠️ <strong>{missingDob.length} athlete{missingDob.length === 1 ? '' : 's'} missing date of birth.</strong>{' '}
            Athletes log in to the <strong>AURA Athletes</strong> app with their bib number + date of birth.{' '}
            <Link href="/squad/athletes" style={{ fontWeight: 700, color: '#92400e', textDecoration: 'underline' }}>Add it on the Athlete Roster →</Link>
          </section>
        );
      })()}

      {/* 3. EXECUTIVE KPI METRICS GRID */}
      <section className="squad-kpi-grid">
        {/* Card 1: Total Athletes */}
        <div className="squad-kpi-card squad-kpi-card-blue">
          <div className="squad-kpi-top">
            <span className="squad-kpi-label">Delegation Strength</span>
            <div className="squad-kpi-icon-wrap squad-kpi-icon-blue">👥</div>
          </div>
          <div>
            <div className="squad-kpi-metric">
              <span className="squad-kpi-number">{totalAthletes}</span>
              <span className="squad-kpi-sub">/ {maxQuota} Max</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden', margin: '0.65rem 0' }}>
              <div
                style={{
                  width: `${Math.max(quotaPercent, 4)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #2563eb, #1d4ed8)',
                  borderRadius: '9999px',
                }}
              />
            </div>
            <div className="squad-kpi-footer">
              <span>{quotaPercent}% quota utilized</span>
              <span style={{ color: '#2563eb', fontWeight: 700 }}>{maxQuota - totalAthletes} slots open</span>
            </div>
            <div style={{ marginTop: '0.45rem', paddingTop: '0.35rem', borderTop: '1px dashed #e2e8f0', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: totalAthletes >= 8 ? '#16a34a' : '#d97706', fontWeight: 600 }}>
                {totalAthletes >= 8 ? '✓ Rule 23: Min 8 athletes met' : `⚠️ Rule 23: Min 8 required (${8 - totalAthletes} needed)`}
              </span>
              <span style={{ color: '#94a3b8' }}>Meet Entry Rule</span>
            </div>
          </div>
        </div>

        {/* Card 2: Events Contested */}
        <div className="squad-kpi-card squad-kpi-card-violet">
          <div className="squad-kpi-top">
            <span className="squad-kpi-label">Event Entries</span>
            <div className="squad-kpi-icon-wrap squad-kpi-icon-violet">🏅</div>
          </div>
          <div>
            <div className="squad-kpi-metric">
              <span className="squad-kpi-number">{totalEventEntries}</span>
              <span className="squad-kpi-sub">Total Entries</span>
            </div>
            <div style={{ height: '6px', margin: '0.65rem 0' }} />
            <div className="squad-kpi-footer">
              <span>{billableEntries} Billable &bull; {totalEventEntries - billableEntries} Free Reserve</span>
              <span style={{ color: '#7c3aed', fontWeight: 700 }}>Active</span>
            </div>
          </div>
        </div>

        {/* Card 3: 4x100m Baton Relay Squad */}
        <div className="squad-kpi-card squad-kpi-card-amber">
          <div className="squad-kpi-top">
            <span className="squad-kpi-label">4x100m Relay Lineup</span>
            <div className="squad-kpi-icon-wrap squad-kpi-icon-amber">🎽</div>
          </div>
          <div>
            <div className="squad-kpi-metric">
              <span className="squad-kpi-number">{registeredRelayMembers}</span>
              <span className="squad-kpi-sub">/ 4 Runners</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden', margin: '0.65rem 0' }}>
              <div
                style={{
                  width: `${(registeredRelayMembers / 4) * 100}%`,
                  height: '100%',
                  background: registeredRelayMembers === 4 ? '#10b981' : '#f59e0b',
                  borderRadius: '9999px',
                }}
              />
            </div>
            <div className="squad-kpi-footer">
              <span>
                {registeredRelayMembers === 4
                  ? '✅ Complete baton team'
                  : `${4 - registeredRelayMembers} slots remaining`}
              </span>
              <Link href="/squad/relay" style={{ color: '#b45309', fontWeight: 700 }}>
                Manage &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Card 4: Participation Fee */}
        <div className="squad-kpi-card squad-kpi-card-emerald">
          <div className="squad-kpi-top">
            <span className="squad-kpi-label">Participation Dues</span>
            <div className="squad-kpi-icon-wrap squad-kpi-icon-emerald">💳</div>
          </div>
          <div>
            <div className="squad-kpi-metric">
              <span className="squad-kpi-number">₹{totalSquadFee}</span>
              <span className="squad-kpi-sub">Total</span>
            </div>
            <div style={{ height: '6px', margin: '0.65rem 0' }} />
            <div className="squad-kpi-footer">
              <span style={{ color: isPaymentVerified ? '#059669' : '#b45309', fontWeight: 700 }}>
                {isPaymentVerified ? '✅ Fully Verified (Paid)' : `⚠️ Status: ${paymentStatusLabel}`}
              </span>
              <Link href="/squad/payment" style={{ color: '#059669', fontWeight: 700 }}>
                Details &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CONTINGENT ATHLETE ROSTER SNAPSHOT */}
      <section className="squad-roster-card">
        <div className="squad-roster-header">
          <div className="squad-roster-title-group">
            <h2 className="squad-roster-title">Contingent Athlete Roster</h2>
            <span className="squad-roster-count-badge">
              {totalAthletes} {totalAthletes === 1 ? 'Athlete' : 'Athletes'} Registered
            </span>
            <span style={{ fontSize: '0.825rem', color: '#64748b' }}>
              &bull; Total Participation Dues: <strong style={{ color: '#0f172a' }}>₹{totalSquadFee}</strong>
            </span>
          </div>

          <div className="squad-roster-actions">
            {canAddAthletes && (
              <Link href="/squad/athletes" className="squad-cta-primary" style={{ padding: '0.45rem 0.95rem', fontSize: '0.825rem' }}>
                <span>+</span> Nominate Athlete
              </Link>
            )}
            {totalAthletes > 0 && (
              <Link href="/squad/athletes" className="squad-cta-secondary" style={{ padding: '0.45rem 0.95rem', fontSize: '0.825rem', borderColor: '#94a3b8' }}>
                📋 Registration Report (PDF)
              </Link>
            )}
            <Link href="/squad/athletes" className="squad-cta-secondary" style={{ padding: '0.45rem 0.95rem', fontSize: '0.825rem' }}>
              View &amp; Edit Full Roster &rarr;
            </Link>
          </div>
        </div>

        {totalAthletes === 0 ? (
          <div className="squad-empty-roster">
            <div className="squad-empty-icon">🏃</div>
            <div className="squad-empty-title">No Athletes Registered Yet</div>
            <div className="squad-empty-desc">
              Your college delegation currently has 0 athletes nominated for VTU&rsquo;s 28th Inter-Collegiate State Level Athletic Meet 2026. Nominate students from your college to participate in track, field, and relay events.
            </div>
            {canAddAthletes && (
              <Link href="/squad/athletes" className="squad-cta-primary">
                + Register First Athlete
              </Link>
            )}
          </div>
        ) : (
          <div className="squad-table-container">
            <table className="squad-roster-table">
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>Bib / Status</th>
                  <th style={{ minWidth: '220px' }}>Athlete Name (SSLC)</th>
                  <th style={{ minWidth: '160px' }}>USN &amp; Sem</th>
                  <th style={{ minWidth: '130px' }}>Aadhaar</th>
                  <th style={{ width: '80px' }}>Blood</th>
                  <th style={{ minWidth: '320px' }}>Events Registered</th>
                  <th style={{ minWidth: '160px' }}>Reserve Event</th>
                </tr>
              </thead>
              <tbody>
                {formattedAthletes.map((athlete: any) => {
                  const regularEvents = athlete.registrations.filter((r: any) => r.kind !== 'reserve');
                  const reserveReg = athlete.registrations.find((r: any) => r.kind === 'reserve');
                  const maskedAadhaar = athlete.aadhaar_number
                    ? `•••• •••• ${athlete.aadhaar_number.slice(-4)}`
                    : '—';

                  return (
                    <tr key={athlete.id}>
                      {/* Bib & Status */}
                      <td>
                        {/* Bibs are generated only after registration closes — never show a placeholder number */}
                        <div
                          className="squad-bib-badge"
                          title={athlete.bid_number ? undefined : 'Bib numbers are allotted after registration closes'}
                        >
                          <span>{athlete.bid_number ? `#${athlete.bid_number}` : 'Bib pending'}</span>
                        </div>
                        <div>
                          <span className="squad-reg-status-pill">
                            {athlete.accreditation_status || 'REGISTERED'}
                          </span>
                        </div>
                      </td>

                      {/* Athlete Identity & Photo */}
                      <td>
                        <div className="squad-athlete-cell">
                          <div className="squad-athlete-avatar">
                            {athlete.photo_url ? (
                              <img
                                src={athlete.photo_url}
                                alt={athlete.sslc_name}
                                className="squad-athlete-avatar-img"
                              />
                            ) : (
                              <span>{athlete.sslc_name.slice(0, 1).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <div className="squad-athlete-name">{athlete.sslc_name}</div>
                            <div className="squad-athlete-date">
                              Joined: {athlete.college_joining_date ? new Date(athlete.college_joining_date).toLocaleDateString('en-GB') : '—'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* USN & Semester */}
                      <td>
                        <div className="squad-usn-text">{athlete.usn}</div>
                        <div className="squad-sem-badge">Semester {athlete.semester}</div>
                      </td>

                      {/* Aadhaar */}
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#475569' }}>
                          {maskedAadhaar}
                        </span>
                      </td>

                      {/* Blood Group */}
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: '#fef2f2',
                            color: '#b91c1c',
                            border: '1px solid #fecaca',
                            fontWeight: 750,
                            fontSize: '0.78rem',
                          }}
                        >
                          {athlete.blood_group}
                        </span>
                      </td>

                      {/* Events Registered */}
                      <td>
                        <div className="squad-event-tags">
                          {regularEvents.length === 0 ? (
                            <span style={{ color: '#94a3b8', fontSize: '0.825rem' }}>No events assigned</span>
                          ) : (
                            regularEvents.map((reg: any) => {
                              const ev = reg.events;
                              const evName = ev?.name || 'Event';
                              const evCat = (ev?.category || '').toLowerCase();
                              const isRelay = reg.kind === 'relay' || ev?.code?.includes('4X100') || evCat.includes('relay');
                              const isField = evCat.includes('field') || evCat.includes('jump') || evCat.includes('throw');
                              const isRoad = reg.kind === 'half_marathon' || evCat.includes('road') || ev?.code?.startsWith('HM');

                              let tagClass = 'squad-ev-track';
                              let icon = '⚡';
                              if (isRelay) {
                                tagClass = 'squad-ev-relay';
                                icon = '🎽';
                              } else if (isField) {
                                tagClass = 'squad-ev-field';
                                icon = '👟';
                              } else if (isRoad) {
                                tagClass = 'squad-ev-road';
                                icon = '🏃';
                              }

                              return (
                                <span key={reg.id} className={`squad-ev-tag ${tagClass}`}>
                                  <span>{icon}</span>
                                  <span>{evName}</span>
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>

                      {/* Reserve Event */}
                      <td>
                        {reserveReg?.events?.name ? (
                          <span
                            className="squad-ev-tag squad-ev-field"
                            style={{ background: '#f8fafc', color: '#475569', border: '1px dashed #cbd5e1' }}
                          >
                            🛡️ {reserveReg.events.name} (Reserve)
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.825rem' }}>None</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 5. QUICK PORTAL OPERATIONS CARDS */}
      <section className="squad-ops-grid">
        {/* Ops Card 1: Fee Settlement */}
        <div className="squad-op-card">
          <div>
            <div className="squad-op-header">
              <h3 className="squad-op-title">💳 Entry Fee Settlement</h3>
              <span className="squad-op-badge">UPI &bull; ₹100/event</span>
            </div>
            <p className="squad-op-desc">
              Scan host college UPI QR code, settle contingent nomination fees (₹100 per regular event, reserve free), and upload UTR transaction proof for Meet Directorate verification.
            </p>
          </div>
          <Link href="/squad/payment" className="squad-op-btn">
            {isPaymentVerified ? 'View Payment Receipt & QR &rarr;' : 'Settle Participation Dues &rarr;'}
          </Link>
        </div>

        {/* Ops Card 2: 4x100m Relay Board */}
        <div className="squad-op-card">
          <div>
            <div className="squad-op-header">
              <h3 className="squad-op-title">🎽 4x100m Baton Relay Desk</h3>
              <span className="squad-op-badge">{registeredRelayMembers}/4 Slots</span>
            </div>
            <p className="squad-op-desc">
              Review and configure your college division&apos;s 4 running baton team members and assigned reserve runner for the 4x100m championship heats.
            </p>
          </div>
          <Link href="/squad/relay" className="squad-op-btn">
            Configure Relay Baton Squad &rarr;
          </Link>
        </div>

        {/* Ops Card 3: Call Room Accreditation */}
        <div className="squad-op-card">
          <div>
            <div className="squad-op-header">
              <h3 className="squad-op-title">🪪 Official Accreditation &amp; Bibs</h3>
              <span className="squad-op-badge" style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}>
                Dr. ACSCE Desk
              </span>
            </div>
            <p className="squad-op-desc">
              Official serialized chest bibs and security QR-coded smart badges are issued exclusively at the Dr. ACSCE Registration Desk during reporting on 07 December 2026.
            </p>
          </div>
          <div
            style={{
              width: '100%',
              background: '#eff6ff',
              border: '1.5px solid #bfdbfe',
              color: '#1d4ed8',
              padding: '0.65rem',
              borderRadius: '8px',
              fontSize: '0.825rem',
              fontWeight: 750,
              textAlign: 'center',
            }}
          >
            Issued by Meet Directorate at Venue
          </div>
        </div>
      </section>

      {/* 6. TECHNICAL REGULATIONS & CALL ROOM ADVISORY */}
      <section className="squad-advisory-card">
        <div className="squad-advisory-icon">📋</div>
        <div className="squad-advisory-content">
          <div className="squad-advisory-title">
            VTU Technical Regulations, Scoring &amp; Championship Protocols
          </div>
          <div className="squad-advisory-grid">
            <div className="squad-advisory-item">
              <strong>📅 Championship Dates &amp; Arena</strong>
              December 7 &ndash; 10, 2026 at Dr. ACS College of Engineering, Mysore Road, Bengaluru.
            </div>
            <div className="squad-advisory-item">
              <strong>🏆 Points Scoring Matrix</strong>
              Team/Relays: <strong>10, 6, 2 pts</strong> (final 4 runners score points). Individual events: <strong>5, 3, 1 pts</strong>.
            </div>
            <div className="squad-advisory-item">
              <strong>🥇 5 Major Championship Trophies</strong>
              Best Male Athlete, Best Female Athlete, Best Men&rsquo;s College Team and Best Women&rsquo;s College Team (Champions &amp; Runners-up), Overall Championship.
            </div>
            <div className="squad-advisory-item">
              <strong>🏃 Jump &amp; Throw Pass Protocols</strong>
              Vertical Jumps (High Jump/PV): Pass for height. Horizontal Jumps/Throws: Pass for individual attempts.
            </div>
            <div className="squad-advisory-item">
              <strong>📊 Results &amp; Daily Attendance to PEDs</strong>
              Official verified result bulletins and daily attendance sheets are issued directly to College PEDs at the Control Desk.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
