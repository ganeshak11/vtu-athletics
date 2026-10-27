import Link from 'next/link';
import ScheduleView from './ScheduleView';
import { Navbar } from '@/components/layout/Navbar';
import './home.css';

export default function HomePage() {
  return (
    <div className="landing-container" id="landing-page-root">
      {/* 1. PRESTIGIOUS UNIVERSITY & COLLEGE IDENTITY NAVBAR (Clean Light Glassmorphism) */}
      <Navbar />

      {/* 2. DYNAMIC ATHLETIC HERO SECTION */}
      <section className="hero-section">
        <div className="hero-inner">
          
          {/* Eyebrow Badge */}
          <div className="hero-badge-pill">
            <span className="hero-live-dot" />
            <span>26th VTU State Athletics Championship 2026 &bull; Online Registration Active</span>
          </div>

          {/* Main Display Headline */}
          <h1 className="hero-main-title">
            Where Engineering Athletes Compete for <span className="hero-highlight">State Glory &amp; National Honors</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-subtitle">
            The premier inter-collegiate track and field championship and official All India Inter-University selection trials. 
            Hosted at the state-of-the-art 400m synthetic track facility at Dr. ACS College of Engineering, Bengaluru.
          </p>

          {/* Action CTAs */}
          <div className="hero-cta-group">
            <Link href="/login/squad" className="btn-primary-hero" id="hero-btn-squad">
              <span>🏛️ Institution Squad Portal</span>
              <span>&rarr;</span>
            </Link>

            <Link href="/login/admin" className="btn-secondary-hero" id="hero-btn-admin">
              <span>🛡️ Directorate Admin Desk</span>
            </Link>

            <a href="#schedule" className="btn-tertiary-hero">
              <span>📅 View Event Timetable</span>
              <span>&darr;</span>
            </a>
          </div>

          {/* Key Metrics Ribbon */}
          <div className="hero-stats-ribbon">
            <div className="stat-item">
              <span className="stat-value">180+</span>
              <span className="stat-label">Affiliated Engineering Colleges</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">2,500+</span>
              <span className="stat-label">Collegiate Athletes</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">32</span>
              <span className="stat-label">Track &amp; Field Disciplines</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">8-Lane</span>
              <span className="stat-label">Synthetic Athletic Track</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">₹100</span>
              <span className="stat-label">Transparent Dues (Reserves Free)</span>
            </div>
          </div>

        </div>
      </section>

      {/* 3. THREE INTERACTIVE ACCESS DESKS */}
      <section className="portal-cards-section" id="access-desks">
        <div className="section-wrapper">
          
          <div className="section-header-clean">
            <div className="section-eyebrow">Direct System Portals</div>
            <h2 className="section-title-clean">Choose Your Directorate Access Desk</h2>
            <p className="section-subtitle-clean">
              Secure, role-gated operational gateways for college teams, meet administrators, and technical officials.
            </p>
          </div>

          <div className="cards-triple-grid">
            
            {/* CARD 1: INSTITUTION SQUAD DESK */}
            <div className="portal-glass-card card-blue">
              <div>
                <div className="card-icon-pill">🏛️</div>
                <h3 className="card-title">Institution Squad Portal</h3>
                <p className="card-desc">
                  Physical Education Directors (PEDs) and College Sports Officers register student-athletes and settle participation dues.
                </p>
                <ul className="card-feature-list">
                  <li>
                    <span className="check">✓</span>
                    <span>Single sign-on using College Code &amp; Directorate Passphrase</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>Student registration with 12-digit Aadhaar &amp; photo uploads</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>4x100m baton relay assembly and reserve nominations</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>Instant fee computation and UPI transaction UTR verification</span>
                  </li>
                </ul>
              </div>
              <Link href="/login/squad" className="btn-card-action" id="card-btn-squad">
                <span>Access Squad Portal</span>
                <span>&rarr;</span>
              </Link>
            </div>

            {/* CARD 2: DIRECTORATE ADMIN COMMAND */}
            <div className="portal-glass-card card-dark">
              <div>
                <div className="card-icon-pill">🛡️</div>
                <h3 className="card-title">Directorate Central Command</h3>
                <p className="card-desc">
                  Central meet administration for technical delegates, scrutiny committees, and directorate finance officers.
                </p>
                <ul className="card-feature-list">
                  <li>
                    <span className="check">✓</span>
                    <span>Master registration closure and instant contingent locking</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>Serialized contiguous bib numbers (Boys: #100+, Girls: #2001+)</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>Payment verification desk with screenshot inspection</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>Automatic 8-lane track preliminary heat and lane seeding</span>
                  </li>
                </ul>
              </div>
              <Link href="/login/admin" className="btn-card-action" id="card-btn-admin">
                <span>Directorate Admin Sign In</span>
                <span>&rarr;</span>
              </Link>
            </div>

            {/* CARD 3: RULES & INFORMATION DESK */}
            <div className="portal-glass-card card-gold">
              <div>
                <div className="card-icon-pill">📜</div>
                <h3 className="card-title">Championship Regulations</h3>
                <p className="card-desc">
                  Official athletics guidelines, stadium infrastructure specifications, eligibility codes, and transit directions.
                </p>
                <ul className="card-feature-list">
                  <li>
                    <span className="check">✓</span>
                    <span>AFI &amp; VTU competition rules and event participation quotas</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>AFI certified electronic track timing and ultrasonic wind gauge standards</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>Day-by-day 4-day athletics timetable with call-room reporting</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>Campus arrival protocol, athlete village hostels &amp; transit GPS</span>
                  </li>
                </ul>
              </div>
              <a href="#rules" className="btn-card-action">
                <span>View Guidelines &amp; Rules</span>
                <span>&darr;</span>
              </a>
            </div>

          </div>

        </div>
      </section>

      {/* 4. CHAMPIONSHIP REGULATIONS & TECHNICAL CODE */}
      <section className="regulations-section" id="rules">
        <div className="section-wrapper">
          
          <div className="section-header-clean">
            <div className="section-eyebrow">Directorate Code</div>
            <h2 className="section-title-clean">Eligibility Criteria &amp; Competition Regulations</h2>
            <p className="section-subtitle-clean">
              Standard operating procedures governing participation in the 26th VTU Inter-Collegiate Athletics Championship 2026.
            </p>
          </div>

          <div className="regulations-grid">
            
            <div className="regulation-card">
              <div className="reg-icon">🎓</div>
              <h3 className="reg-title">1. Student-Athlete Eligibility</h3>
              <ul className="reg-list">
                <li>Bonafide undergraduate or postgraduate students enrolled in VTU affiliated engineering colleges.</li>
                <li>Competitor age must be strictly under 25 years as of the university cut-off date.</li>
                <li>Must hold an active University Seat Number (USN) and produce college photo identification.</li>
                <li>Disciplinary disqualifications from prior university trials render candidates ineligible.</li>
              </ul>
            </div>

            <div className="regulation-card">
              <div className="reg-icon">🏃</div>
              <h3 className="reg-title">2. Event Nomination Quotas</h3>
              <ul className="reg-list">
                <li>Maximum <strong>2 individual events</strong> per athlete (Event 1 Compulsory + Event 2 Optional).</li>
                <li>Maximum <strong>2 athletes per college</strong> in any single regular track or field event.</li>
                <li>Each student may nominate <strong>1 Free Reserve event</strong> (₹0) for emergency substitution.</li>
                <li>Relay squads: Up to 4 primary runners and 2 reserve runners for the 4x100m relay.</li>
              </ul>
            </div>

            <div className="regulation-card">
              <div className="reg-icon">💳</div>
              <h3 className="reg-title">3. Entry Fee Structure</h3>
              <ul className="reg-list">
                <li>Participation dues: <strong>₹100 per billable event entry</strong> across the contingent.</li>
                <li>Emergency reserve events are billed at <strong>₹0 (Free)</strong>.</li>
                <li>Instant offline UPI transfer with bank UTR submission and proof screenshot.</li>
                <li>Entry fees are strictly non-refundable once approved by the Directorate.</li>
              </ul>
            </div>

            <div className="regulation-card">
              <div className="reg-icon">🎽</div>
              <h3 className="reg-title">4. Accreditation &amp; Chest Bibs</h3>
              <ul className="reg-list">
                <li>Deterministic contiguous bib numbers allocated alphabetically by institution.</li>
                <li>Men&apos;s division starts from <strong>#100+</strong>; Women&apos;s division starts from <strong>#2001+</strong>.</li>
                <li>High-security accreditation badges embed digital SVG QR codes for call room validation.</li>
                <li>Replacement of lost bibs requires formal physical clearance at the Technical Information Desk.</li>
              </ul>
            </div>

          </div>

        </div>
      </section>

      {/* 5. INTERACTIVE 4-DAY EVENT TIMETABLE */}
      <section className="schedule-section" id="schedule">
        <div className="section-wrapper">
          
          <div className="section-header-clean">
            <div className="section-eyebrow">Competition Timetable</div>
            <h2 className="section-title-clean">4-Day Championship Order of Events</h2>
            <p className="section-subtitle-clean">
              Filter preliminary track heats, field throwing sectors, and grand finals by discipline and category.
            </p>
          </div>

          <ScheduleView />

        </div>
      </section>

      {/* 6. CAMPUS STADIUM & TRANSIT DIRECTIONS */}
      <section className="transit-section" id="venue">
        <div className="section-wrapper">
          
          <div className="section-header-clean">
            <div className="section-eyebrow">Host Stadium &amp; Transit</div>
            <h2 className="section-title-clean">Stadium Location &amp; Campus Arrival Guide</h2>
            <p className="section-subtitle-clean">
              Department of Physical Education &amp; Sports &bull; Dr. ACS College of Engineering, Bengaluru
            </p>
          </div>

          <div className="transit-grid">
            
            {/* Left: Google Maps Interactive Frame */}
            <div className="map-card">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3889.3787723916965!2d77.46322507597952!3d12.891300987416347!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae3f972b9a7c61%3A0xc3f8e5f0d367f08b!2sACS%20College%20of%20Engineering!5e0!3m2!1sen!2sin!4v1710000000000!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: '420px' }}
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Dr. ACS College of Engineering Campus Stadium Location Map"
              />
            </div>

            {/* Right: Arrival Logistics & Metro Points */}
            <div className="transit-info-card">
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Stadium Coordinates
                </span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', marginTop: '0.35rem', marginBottom: '0.5rem' }}>
                  Dr. ACS College of Engineering (ACSCE)
                </h3>
                <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  #207, Kambipura, Mysore Road, Kengeri Hobli, Bengaluru &ndash; 560074. 
                  (RajaRajeswari Group of Institutions Campus).
                </p>

                <div className="transit-points">
                  <div className="transit-point">
                    <span className="transit-icon">🚇</span>
                    <div>
                      <strong>Namma Metro (Purple Line)</strong>
                      <p>Challaghatta / Kengeri Metro Station &mdash; 3.5 km from campus. Frequent feeder BMTC buses and autos available.</p>
                    </div>
                  </div>

                  <div className="transit-point">
                    <span className="transit-icon">🚆</span>
                    <div>
                      <strong>Railway Stations</strong>
                      <p>Kengeri Railway Station (KGI) &mdash; 5 km &bull; KSR Bengaluru City (SBC) &mdash; 18 km.</p>
                    </div>
                  </div>

                  <div className="transit-point">
                    <span className="transit-icon">🚌</span>
                    <div>
                      <strong>BMTC &amp; KSRTC Bus Connectivity</strong>
                      <p>Kengeri TTMC Satellite Bus Terminal &bull; Direct buses stop directly in front of the main campus arch.</p>
                    </div>
                  </div>

                  <div className="transit-point">
                    <span className="transit-icon">🛏️</span>
                    <div>
                      <strong>Delegation Accommodation</strong>
                      <p>On-campus student-athlete hostels (separate for Men &amp; Women) open 24 hours prior to the meet commencement.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <a
                  href="https://maps.google.com/?q=ACS+College+of+Engineering+Kambipura+Bengaluru"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary-hero"
                  style={{ flex: 1, padding: '0.75rem 1rem', fontSize: '0.875rem', justifyContent: 'center' }}
                >
                  Open in Google Maps &rarr;
                </a>
                <Link
                  href="/login/squad"
                  className="btn-secondary-hero"
                  style={{ flex: 1, padding: '0.75rem 1rem', fontSize: '0.875rem', justifyContent: 'center' }}
                >
                  Register Contingent &rarr;
                </Link>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 7. HOST INSTITUTION PROFILE */}
      <section className="host-section" id="host-college">
        <div className="section-wrapper">
          
          <div className="section-header-clean">
            <div className="section-eyebrow">Host Institution</div>
            <h2 className="section-title-clean">Dr. ACS College of Engineering, Bengaluru</h2>
            <p className="section-subtitle-clean">
              Approved by AICTE, New Delhi &bull; Affiliated to VTU &bull; NAAC &lsquo;A&rsquo; Grade &amp; NBA Accredited
            </p>
          </div>

          <div className="host-grid-clean">
            <div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.85rem' }}>
                Fostering Excellence in Engineering &amp; Athletics
              </h3>
              <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                Established under the visionary leadership of <strong>Dr. A. C. Shanmugam</strong>, 
                Dr. ACS College of Engineering stands as a landmark institution of academic rigor and sporting achievements in Karnataka. 
                The college is honored to host the 26th VTU Inter-Collegiate Athletics Championship on its expansive campus, 
                offering international-standard synthetic tracks, high-speed electronic timing, and comprehensive student amenities.
              </p>

              <div className="host-stats-row">
                <div className="host-stat-box">
                  <div className="host-stat-val">35+ Acres</div>
                  <div className="host-stat-lbl">Lush Green Campus &amp; Stadium</div>
                </div>
                <div className="host-stat-box">
                  <div className="host-stat-val">NAAC &lsquo;A&rsquo;</div>
                  <div className="host-stat-lbl">Grade Accredited &amp; NBA Approved</div>
                </div>
                <div className="host-stat-box">
                  <div className="host-stat-val">8-Lane</div>
                  <div className="host-stat-lbl">Synthetic Track &amp; Field Arena</div>
                </div>
              </div>

              <div style={{ background: '#eff6ff', borderLeft: '4px solid #2563eb', padding: '1.15rem 1.5rem', borderRadius: '8px', fontSize: '0.925rem', color: '#1e3a8a', fontStyle: 'italic', fontWeight: 600 }}>
                &ldquo;To create job creators not job seekers &mdash; fostering holistic discipline, competitive spirit, and character through collegiate athletics.&rdquo;
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <img
                src="/acsce-crest.jpg"
                alt="Dr. ACS College of Engineering Campus Crest"
                style={{ maxWidth: '100%', maxHeight: '360px', objectFit: 'contain', borderRadius: '16px', boxShadow: '0 4px 20px rgba(15,23,42,0.06)' }}
              />
            </div>
          </div>

        </div>
      </section>

      {/* 8. MODERN CLEAN LIGHT FOOTER */}
      <footer className="modern-light-footer">
        <div className="footer-grid">
          
          <div className="footer-col">
            <h4>Visvesvaraya Technological University</h4>
            <p style={{ marginBottom: '0.85rem' }}>
              <strong>Directorate of Physical Education &amp; Sports</strong><br />
              &ldquo;Jnana Sangama&rdquo;, Belagavi &ndash; 590018, Karnataka, India.
            </p>
            <p>
              Director of Physical Education: <strong>Dr. Rajesh Y. H.</strong><br />
              EPABX Helpline: 0831-2498172<br />
              Official Email: <code>sports@vtu.ac.in</code>
            </p>
          </div>

          <div className="footer-col">
            <h4>Host Institution</h4>
            <p style={{ marginBottom: '0.85rem' }}>
              <strong>Dr. ACS College of Engineering</strong><br />
              Department of Physical Education<br />
              #207, Kambipura, Mysore Road, Bengaluru &ndash; 560074.
            </p>
            <p>
              Affiliated to VTU &bull; NAAC &lsquo;A&rsquo; Grade<br />
              Campus Desk: 080-28437955
            </p>
          </div>

          <div className="footer-col">
            <h4>Direct Access Portals</h4>
            <ul>
              <li>
                <Link href="/login/squad" style={{ color: '#2563eb', fontWeight: 700 }}>
                  🏛️ Institution Squad Login
                </Link>
              </li>
              <li>
                <Link href="/login/admin" style={{ color: '#0f172a', fontWeight: 700 }}>
                  🛡️ Directorate Admin Command
                </Link>
              </li>
              <li><a href="#rules">📜 Championship Regulations</a></li>
              <li><a href="#schedule">📅 Discipline Timetable</a></li>
              <li><a href="#venue">📍 Stadium Location &amp; Transit</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Meet Administration</h4>
            <p>
              Organizing Secretary: <strong>Director of Physical Education, ACSCE</strong><br />
              Technical Delegate: <strong>VTU Sports Delegate</strong><br />
              Finance Verification: <strong>Finance Desk</strong><br />
              Accommodation: <strong>Campus Warden Desk</strong>
            </p>
          </div>

        </div>

        <div className="footer-bottom">
          <div>
            &copy; 2026 Visvesvaraya Technological University, Belagavi &amp; Dr. ACS College of Engineering, Bengaluru.
          </div>
          <div>
            Official Portal &bull; Department of Physical Education &amp; Sports &bull; State Public University
          </div>
        </div>
      </footer>

    </div>
  );
}
