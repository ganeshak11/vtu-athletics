import Link from 'next/link';
import { requireSquad } from '@/lib/auth-guard';
import { supabaseAdmin } from '@/lib/supabase';
import { listSquadAthletesAction, getSquadRelayCountAction } from '@/app/actions/athletes';
import './dashboard.css';

export const metadata = {
  title: 'Contingent Overview — VTU SportsOS',
  description: 'Executive overview, roster verification, and squad operations for VTU 26th Athletics Championship',
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
  const isMen = squad?.gender === 'men' || session.gender === 'men';
  const collegeName = college?.name || session.collegeName || 'Affiliated Institution';
  const collegeCode = college?.code || session.collegeCode || squad?.squad_code || 'VTU';
  const district = college?.district || 'Karnataka';
  const squadCode = squad?.squad_code || session.squadCode || '';
  const isLocked = Boolean(squad?.roster_locked);
  const paymentStatus = squad?.payment_status || 'DRAFT';
  const isPaymentVerified = paymentStatus === 'VERIFIED';

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

  const billableEntries = formattedAthletes.reduce((acc: number, athlete: any) => {
    const billable = athlete.registrations.filter((r: any) => r.kind !== 'reserve').length;
    return acc + billable;
  }, 0);
  const totalSquadFee = billableEntries * 100;

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
                <span>VTU 26TH ATHLETICS CHAMPIONSHIP 2026</span>
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
                className={`squad-status-badge ${
                  isPaymentVerified ? 'squad-badge-verified' : 'squad-badge-pending'
                }`}
              >
                {isPaymentVerified ? '✓ Payment: Verified' : `⚠️ Payment: ${paymentStatus}`}
              </span>
              <span
                className={`squad-status-badge ${
                  isLocked ? 'squad-badge-locked' : 'squad-badge-open'
                }`}
              >
                {isLocked ? '🔒 Roster: Certified & Locked' : '🔓 Roster: Open'}
              </span>
            </div>

            <div className="squad-hero-buttons">
              {!isLocked ? (
                <Link href="/squad/athletes" className="squad-cta-primary">
                  <span>+</span> Nominate Athlete
                </Link>
              ) : null}
              <Link href="/squad/athletes" className="squad-cta-secondary">
                Manage Full Roster &rarr;
              </Link>
              <Link href="/squad/payment" className="squad-cta-secondary">
                {isPaymentVerified ? 'View Fee Receipt' : 'Settle Dues'} &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. EMERGENCY / ROSTER LOCK GUIDANCE NOTICE */}
      {isLocked && (
        <section className="squad-lock-notice">
          <span className="squad-lock-icon">🔒</span>
          <div className="squad-lock-content">
            <div className="squad-lock-title">Contingent Roster is Certified &amp; Locked Post-Payment</div>
            <div className="squad-lock-desc">
              Your athlete roster has been frozen following verified payment settlement. This enables the VTU Meet Directorate to finalize event heat draws and print serialized chest bib badges.
            </div>
            <div className="squad-lock-help">
              <strong>Emergency late addition or medical substitution?</strong> Contact the <strong>VTU Meet Directorate / Helpdesk</strong> at the venue. An authorized administrator can unlock your delegation to register additional athletes and settle the differential entry dues.
            </div>
          </div>
        </section>
      )}

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
                {isPaymentVerified ? '✅ Fully Verified (Paid)' : `⚠️ Status: ${paymentStatus}`}
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
            {!isLocked && (
              <Link href="/squad/athletes" className="squad-cta-primary" style={{ padding: '0.45rem 0.95rem', fontSize: '0.825rem' }}>
                <span>+</span> Nominate Athlete
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
              Your college delegation currently has 0 athletes nominated for the VTU 26th Athletics Championship. Nominate students from your college to participate in track, field, and relay events.
            </div>
            {!isLocked && (
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
                        <div className="squad-bib-badge">
                          <span>#{athlete.bid_number || 100}</span>
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
              Official serialized chest bibs and security QR-coded smart badges are issued exclusively at the Dr. ACSCE Call Room Registration Desk on Dec 8, 2026 upon physical arrival.
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
            VTU Technical Regulations &amp; Call Room Reporting Protocols
          </div>
          <div className="squad-advisory-grid">
            <div className="squad-advisory-item">
              <strong>📅 Championship Schedule</strong>
              December 8 &ndash; 11, 2026 at Dr. ACS College of Engineering, Mysore Road, Bengaluru.
            </div>
            <div className="squad-advisory-item">
              <strong>⏱️ Call Room Reporting</strong>
              Athletes must report to Call Room 1 exactly 45 minutes before track heats and 60 minutes before field events.
            </div>
            <div className="squad-advisory-item">
              <strong>👟 Spike Specifications</strong>
              Only 6mm pyramid spikes permitted on the synthetic track (maximum 9mm for High Jump &amp; Javelin).
            </div>
            <div className="squad-advisory-item">
              <strong>🪪 Physical Verification</strong>
              College PED must produce original VTU Smart Identity Card and SSLC marks card for each nominated student.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
