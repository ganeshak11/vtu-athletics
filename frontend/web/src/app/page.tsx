import Link from 'next/link';
import ScheduleView from './ScheduleView';
import { Navbar } from '@/components/layout/Navbar';
import './home.css';

export default function HomePage() {
  return (
    <div className="landing-container" id="landing-page-root">
      {/* 1. OFFICIAL UNIVERSITY IDENTITY & NAVIGATION HEADER */}
      <Navbar />

      {/* 2. MAIN COMMAND SECTION: 65% OFFICIAL COMMUNIQUÉ / 35% DEDICATED LOGIN DESKS */}
      <section className="gov-main-grid-section">
        <div className="gov-main-grid">
          
          {/* LEFT: DIRECTORATE OFFICIAL COMMUNIQUÉ & MEET SPECIFICATIONS */}
          <div className="gov-notice-panel">
            <div className="gov-panel-header">
              <span className="gov-panel-title">OFFICIAL DIRECTORATE NOTIFICATION &bull; ACADEMIC YEAR 2025&ndash;2026</span>
              <span className="gov-panel-tag">MEET REF: VTU/DPE/ATH/2026/01</span>
            </div>

            <div className="gov-panel-body">
              <div className="gov-communique-head">
                <div className="gov-dept-title">
                  Directorate of Physical Education &amp; Sports &bull; VTU Belagavi
                </div>
                <h2 className="gov-meet-title">
                  26th Inter-Collegiate Athletics Championship 2026 &amp; All India Inter-University Selection Trials
                </h2>
                <div className="gov-venue-sub">
                  Host Institution: <strong>Dr. ACS College of Engineering</strong>, Kambipura, Mysore Road, Bengaluru
                </div>
              </div>

              <p className="gov-communique-text">
                Under the authority of the <strong>Visvesvaraya Technological University Sports Board</strong>, 
                all Principals and Physical Education Directors (PEDs) of affiliated, constituent, and autonomous engineering colleges 
                are hereby notified that online delegation registration for the <strong>26th VTU Inter-Collegiate Athletics Championship 2026</strong> is 
                now formally operational. This championship also serves as the official university selection trials for deputing 
                the VTU Athletics Contingent to the South Zone and All India Inter-University Athletic Meets.
              </p>

              {/* Technical Specifications Matrix */}
              <table className="gov-matrix-table">
                <thead>
                  <tr>
                    <th>Competition Parameter</th>
                    <th>Directorate Official Specification</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Competitive Divisions</strong></td>
                    <td>Men&apos;s Contingent (Boys) &amp; Women&apos;s Contingent (Girls)</td>
                  </tr>
                  <tr>
                    <td><strong>Stadium Infrastructure</strong></td>
                    <td>400-Meter 8-Lane Standard Track, Precision Long Jump &amp; Triple Jump Pits, Shot Put &amp; Discus Throwing Sectors</td>
                  </tr>
                  <tr>
                    <td><strong>Timing &amp; Measurement</strong></td>
                    <td>Lynx High-Speed Electronic Photo-Finish Timing &amp; Ultrasonic Wind Gauge Compliance</td>
                  </tr>
                  <tr>
                    <td><strong>Roster Eligibility</strong></td>
                    <td>Bonafide students of VTU affiliated colleges under 25 years of age with active USN and photo ID</td>
                  </tr>
                  <tr>
                    <td><strong>Entry Dues &amp; Billing</strong></td>
                    <td>₹100 per billable individual event entry; Free reserve nomination (₹0); Institutional RTGS/NEFT/UPI transfer</td>
                  </tr>
                  <tr>
                    <td><strong>Accreditation System</strong></td>
                    <td>Strict-Rule Serialized Bid Allocation (Boys #100+, Girls #2001+) with digital SVG verification barcodes</td>
                  </tr>
                </tbody>
              </table>

              {/* Official Circulars Box */}
              <div className="gov-downloads-box">
                <div className="gov-downloads-title">
                  <span>📥</span>
                  <span>Official Circulars, Rules &amp; Downloadable Proforma</span>
                </div>
                <div className="gov-download-items">
                  <a href="#rules" className="gov-download-link">
                    <span>📄 VTU Athletics Meet Official Regulations &amp; Competition Code 2026</span>
                    <span>View Guidelines &rarr;</span>
                  </a>
                  <a href="#schedule" className="gov-download-link">
                    <span>📄 4-Day Championship Order of Events &amp; Discipline Timetable</span>
                    <span>View Schedule &rarr;</span>
                  </a>
                  <a href="#venue" className="gov-download-link">
                    <span>📍 Campus Arrival Protocol, Transit Map &amp; Hostel Desk Contacts</span>
                    <span>Transit Details &rarr;</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: THE TWO DEDICATED OFFICIAL ENTRY DESKS (Institution vs Admin) */}
          <div className="gov-desks-column">
            
            {/* DESK 1: INSTITUTION SQUAD LOGIN */}
            <div className="gov-desk-card">
              <div className="gov-desk-header navy">
                <span>🏛️</span>
                <span>Institution Squad Portal</span>
              </div>
              <div className="gov-desk-body">
                <p className="gov-desk-desc">
                  Physical Education Directors (PEDs) and College Sports Officers sign in here to submit college contingent rosters.
                </p>
                <ul className="gov-desk-checklist">
                  <li><span>✓</span> Enter <strong>College Code</strong> (e.g. <code>ACSCE</code>, <code>MITM</code>, <code>BMSCE</code>)</li>
                  <li><span>✓</span> Select <strong>Division</strong> (Men&apos;s or Women&apos;s contingent)</li>
                  <li><span>✓</span> Enter <strong>Passphrase</strong> issued by the Directorate</li>
                  <li><span>✓</span> Register individual events, 4x100m relay &amp; upload payment UTR</li>
                </ul>
                <Link href="/login/squad" className="gov-desk-btn btn-navy" id="btn-portal-squad">
                  Sign In to Institution Portal &rarr;
                </Link>
              </div>
            </div>

            {/* DESK 2: DIRECTORATE ADMIN DESK */}
            <div className="gov-desk-card">
              <div className="gov-desk-header dark">
                <span>🛡️</span>
                <span>Meet Directorate Admin Desk</span>
              </div>
              <div className="gov-desk-body">
                <p className="gov-desk-desc">
                  Restricted access for the Technical Meet Director, Host Scrutiny Committee, and Finance Verification Officials.
                </p>
                <ul className="gov-desk-checklist">
                  <li><span>🔒</span> Single-click registration toggle (Open / Lock Rosters)</li>
                  <li><span>⚡</span> Strict-rule serialized bid numbers &amp; QR code generation</li>
                  <li><span>💳</span> Payment proof verification (UTR, screenshot, expected fee)</li>
                  <li><span>📥</span> Athletes management with Excel (.xlsx) export &amp; ID cards</li>
                </ul>
                <Link href="/login/admin" className="gov-desk-btn btn-dark" id="btn-portal-admin">
                  Directorate Admin Sign In &rarr;
                </Link>
              </div>
            </div>

            {/* DESK 3: DIRECTORATE HELPLINE */}
            <div className="gov-desk-card">
              <div className="gov-desk-header gold">
                <span>📞</span>
                <span>Directorate Helpdesk</span>
              </div>
              <div className="gov-desk-body" style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.6 }}>
                <div><strong>Organizing Secretary:</strong> Dr. Sports Director, ACSCE</div>
                <div><strong>Host Helpline:</strong> +91 94481 00000 / 080-28437955</div>
                <div><strong>VTU DPE Belagavi:</strong> 0831-2498172</div>
                <div><strong>Official Email:</strong> <code>sports@vtu.ac.in</code></div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 3. RULES, REGULATIONS & ELIGIBILITY CODE */}
      <section id="rules" className="gov-tabs-section">
        <div className="gov-section-header-bar">
          <div className="gov-section-category">Directorate Regulations</div>
          <h2 className="gov-section-heading">Eligibility Code, Entry Quotas &amp; Financial Protocol</h2>
          <p className="gov-section-subline">Official guidelines governing the 26th VTU Inter-Collegiate Athletics Championship 2026</p>
        </div>

        <div className="gov-rules-grid">
          {/* Card 1 */}
          <div className="gov-rule-card">
            <h3 className="gov-rule-card-title">1. Athlete Eligibility Code</h3>
            <ul className="gov-rule-list">
              <li>Must be a bonafide undergraduate or postgraduate student on rolls of a VTU affiliated college for academic year 2025&ndash;2026.</li>
              <li>Competitor age must be strictly below 25 years as of the university cut-off date.</li>
              <li>Must hold a valid University Seat Number (USN) and produce college photo identity card upon reporting.</li>
              <li>Athletes disqualified for disciplinary violations or non-attendance in university trials are ineligible.</li>
            </ul>
          </div>

          {/* Card 2 */}
          <div className="gov-rule-card">
            <h3 className="gov-rule-card-title">2. Event Nomination Quotas</h3>
            <ul className="gov-rule-list">
              <li>Each athlete may compete in a maximum of <strong>2 individual events</strong> (Event 1 Compulsory + Event 2 Optional).</li>
              <li>Each athlete may nominate <strong>1 Free Reserve event</strong> (₹0 fee) for emergency call-room substitution.</li>
              <li>Relay squads: A maximum of 4 primary runners and 2 reserve runners may be registered for the 4x100m relay.</li>
              <li>21km Half Marathon participation requires physical fitness clearance signed by the college PED.</li>
            </ul>
          </div>

          {/* Card 3 */}
          <div className="gov-rule-card">
            <h3 className="gov-rule-card-title">3. Payment &amp; Scrutiny Protocol</h3>
            <ul className="gov-rule-list">
              <li>Entry fee is calculated at <strong>₹100 per billable event</strong> registered across the college contingent.</li>
              <li>Colleges must complete bank RTGS/NEFT/UPI transfer and submit the transaction UTR number &amp; payment screenshot.</li>
              <li>Rosters remain tentative until verified and approved by the Meet Directorate finance desk.</li>
              <li>No entries will be accepted after registration is officially closed by the Directorate.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 4. EVENT SCHEDULE SECTION */}
      <section id="schedule" className="gov-tabs-section" style={{ background: '#f8fafc' }}>
        <div className="gov-section-header-bar">
          <div className="gov-section-category">Competition Timetable</div>
          <h2 className="gov-section-heading">4-Day Championship Order of Events</h2>
          <p className="gov-section-subline">Track heats, field throwing sectors, and horizontal jumping discipline schedules</p>
        </div>

        <ScheduleView />
      </section>

      {/* 5. VENUE, STADIUM & TRANSIT MAP */}
      <section id="venue" className="gov-tabs-section">
        <div className="gov-section-header-bar">
          <div className="gov-section-category">Host Stadium &amp; Logistics</div>
          <h2 className="gov-section-heading">Championship Stadium Location &amp; Transit Directions</h2>
          <p className="gov-section-subline">Department of Physical Education &amp; Sports, Dr. ACS College of Engineering Campus</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem', alignItems: 'stretch' }}>
          {/* Map Frame */}
          <div style={{ minHeight: '380px', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3889.3787723916965!2d77.46322507597952!3d12.891300987416347!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae3f972b9a7c61%3A0xc3f8e5f0d367f08b!2sACS%20College%20of%20Engineering!5e0!3m2!1sen!2sin!4v1710000000000!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: '380px' }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Dr. ACS College of Engineering Campus Stadium Location Map"
            />
          </div>

          {/* Transit Guide */}
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                📍 Stadium Address
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.5rem' }}>
                Dr. ACS College of Engineering (ACSCE), Bengaluru
              </h3>
              <p style={{ color: '#475569', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                #207, Kambipura, Mysore Road, Kengeri Hobli, Bengaluru, Karnataka 560074 (RajaRajeswari Group of Institutions Campus).
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.825rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 800, color: '#0b2545' }}>🚇 Namma Metro:</span>
                  <span style={{ color: '#334155' }}>Challaghatta / Kengeri Metro Station (Purple Line) &mdash; 3.5 km</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 800, color: '#0b2545' }}>🚆 Railway Stations:</span>
                  <span style={{ color: '#334155' }}>Kengeri Railway Station (KGI) &mdash; 5 km &bull; KSR Bengaluru (SBC) &mdash; 18 km</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 800, color: '#0b2545' }}>🚌 Bus Terminal:</span>
                  <span style={{ color: '#334155' }}>Kengeri TTMC Satellite Bus Station &bull; Direct BMTC buses outside campus</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 800, color: '#0b2545' }}>🛏️ Delegation Hostels:</span>
                  <span style={{ color: '#334155' }}>On-campus Boys &amp; Girls Hostels check-in opens 24h prior to meet start</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <a
                href="https://maps.google.com/?q=ACS+College+of+Engineering+Kambipura+Bengaluru"
                target="_blank"
                rel="noopener noreferrer"
                className="gov-desk-btn btn-navy"
                style={{ flex: 1 }}
              >
                Open in Google Maps &rarr;
              </a>
              <Link href="/login/squad" className="gov-desk-btn btn-dark" style={{ flex: 1 }}>
                Register Contingent &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. HOST INSTITUTION PROFILE */}
      <section id="host-college" className="gov-tabs-section" style={{ background: '#f8fafc' }}>
        <div className="gov-section-header-bar">
          <div className="gov-section-category">Host Institution Profile</div>
          <h2 className="gov-section-heading">Dr. ACS College of Engineering, Bengaluru</h2>
          <p className="gov-section-subline">Approved by AICTE, New Delhi &bull; Affiliated to VTU &bull; NAAC &lsquo;A&rsquo; Grade &amp; NBA Accredited</p>
        </div>

        <div className="gov-host-grid">
          <div className="gov-host-text">
            <h3>Nurturing Champions in Engineering &amp; Athletics</h3>
            <p>
              Established under the visionary leadership of <strong>Dr. A. C. Shanmugam</strong>, 
              Dr. ACS College of Engineering stands as a premier seat of academic rigor and sports excellence in Karnataka. 
              The institution is proud to host the 26th VTU Inter-Collegiate Athletics Championship on its expansive 
              sports campus, featuring standard synthetic tracks and comprehensive field sectors.
            </p>

            <div className="gov-host-stats-row">
              <div className="gov-host-stat-box">
                <div className="gov-host-stat-val">35+ Acres</div>
                <div className="gov-host-stat-lbl">Lush Green Campus &amp; Stadium</div>
              </div>
              <div className="gov-host-stat-box">
                <div className="gov-host-stat-val">NAAC &lsquo;A&rsquo;</div>
                <div className="gov-host-stat-lbl">Grade Accredited &amp; NBA Approved</div>
              </div>
              <div className="gov-host-stat-box">
                <div className="gov-host-stat-val">Lynx Timing</div>
                <div className="gov-host-stat-lbl">Electronic Photo-Finish Operations</div>
              </div>
            </div>

            <div style={{ background: '#eff6ff', borderLeft: '4px solid #1e3a8a', padding: '1rem 1.25rem', borderRadius: '4px', fontSize: '0.9rem', color: '#1e3a8a', fontStyle: 'italic', fontWeight: 600 }}>
              &ldquo;To create job creators not job seekers &mdash; fostering holistic discipline through collegiate physical education.&rdquo;
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img 
              src="/acsce-crest.jpg" 
              alt="Dr. ACS College of Engineering Campus Crest" 
              style={{ maxWidth: '100%', maxHeight: '340px', objectFit: 'contain', border: '1px solid #cbd5e1', borderRadius: '8px' }}
            />
          </div>
        </div>
      </section>

      {/* 7. SPORTS HERITAGE GALLERY */}
      <section id="gallery" className="gov-tabs-section">
        <div className="gov-section-header-bar">
          <div className="gov-section-category">Tournament Laurels</div>
          <h2 className="gov-section-heading">Host College Athletics Heritage Gallery</h2>
          <p className="gov-section-subline">Inter-collegiate track &amp; field glory and tournament laurels</p>
        </div>

        <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px', padding: '3rem 2rem', textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏆</div>
          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.1rem' }}>Official Photo Gallery &amp; Records Archive</div>
          <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Podium photography and championship records will be uploaded upon tournament inauguration.</p>
        </div>
      </section>

      {/* 8. OFFICIAL GOVERNMENT & UNIVERSITY FOOTER */}
      <footer className="gov-footer">
        <div className="gov-footer-grid">
          {/* Col 1 */}
          <div className="gov-footer-col">
            <h4>Visvesvaraya Technological University</h4>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Directorate of Physical Education &amp; Sports</strong><br />
              &ldquo;Jnana Sangama&rdquo;, Belagavi &ndash; 590018, Karnataka, India.
            </p>
            <p>
              Director of Physical Education: <strong>Dr. Rajesh Y. H.</strong><br />
              Office Email: <code>sports@vtu.ac.in</code><br />
              Directorate EPABX: 0831-2498172
            </p>
          </div>

          {/* Col 2 */}
          <div className="gov-footer-col">
            <h4>Host Institution</h4>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Dr. ACS College of Engineering</strong><br />
              Department of Physical Education<br />
              #207, Kambipura, Mysore Road, Bengaluru &ndash; 560074.
            </p>
            <p>
              Affiliated to VTU &bull; NAAC &lsquo;A&rsquo; Grade<br />
              Campus Desk: 080-28437955
            </p>
          </div>

          {/* Col 3: The 2 Logins */}
          <div className="gov-footer-col">
            <h4>Official Portals</h4>
            <ul>
              <li>
                <Link href="/login/squad" style={{ color: '#f59e0b', fontWeight: 800 }}>
                  🏛️ Institution Squad Login
                </Link>
              </li>
              <li>
                <Link href="/login/admin" style={{ color: '#ffffff', fontWeight: 800 }}>
                  🛡️ Directorate Admin Desk
                </Link>
              </li>
              <li><a href="#rules">📜 Regulations Handbook</a></li>
              <li><a href="#schedule">📅 Discipline Schedule</a></li>
              <li><a href="#venue">📍 Venue &amp; Transit Map</a></li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="gov-footer-col">
            <h4>Organizing Committee</h4>
            <p>
              Organizing Secretary: <strong>Dr. Sports Director</strong><br />
              Finance Verification: <strong>Finance Desk</strong><br />
              Hostel Accommodation: <strong>Campus Warden Desk</strong><br />
              Technical Scrutiny: <strong>VTU Technical Delegate</strong>
            </p>
          </div>
        </div>

        <div className="gov-footer-bottom">
          <div>
            &copy; 2026 Visvesvaraya Technological University, Belagavi &amp; Dr. ACS College of Engineering, Bengaluru. All Rights Reserved.
          </div>
          <div>
            Official Portal &bull; Department of Physical Education &amp; Sports &bull; Government of Karnataka
          </div>
        </div>
      </footer>
    </div>
  );
}
