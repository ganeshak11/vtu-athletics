import Link from 'next/link';
import ScheduleView from './ScheduleView';
import GallerySection from './GallerySection';
import CountdownTimer from './CountdownTimer';
import { Navbar } from '@/components/layout/Navbar';
import './home.css';

export default function HomePage() {
  return (
    <div className="landing-container" id="landing-page-root">
      {/* 0. FIXED VIEWPORT ATHLETIC SVG BACKGROUND (Stuck to Screen Behind All Sections) */}
      <div className="fixed-viewport-svg-bg" aria-hidden="true">
        <img
          src="/athletics-aura-bg.svg"
          alt=""
          className="fixed-viewport-svg-asset"
        />
      </div>

      {/* 1. OFFICIAL UNIVERSITY IDENTITY & NAVIGATION */}
      <Navbar />

      {/* 2. DYNAMIC ATHLETIC CHAMPIONSHIP HERO SECTION */}
      <section className="hero-section">
        <div className="hero-inner">
          
          {/* Eyebrow Status Badge */}
          <div className="hero-badge-pill">
            <span className="hero-live-dot" />
            <span>🏆 ACSATHLAURA 2026 &bull; 26th VTU State Athletics Championship &amp; Selection Trials</span>
          </div>

          {/* Main Display Headline (ACS + Athletics + AURA) */}
          <div className="hero-host-kicker">DR. ACS COLLEGE OF ENGINEERING &bull; VTU INTER-COLLEGIATE ATHLETICS</div>
          <h1 className="hero-main-title">
            ACS<span className="hero-highlight">ATHLAURA</span> <span className="hero-year-badge">2026</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-subtitle">
            The 26th VTU Inter-Collegiate Athletics Championship &amp; All India Inter-University Selection Trials. Hosted by <strong>Dr. ACS College of Engineering, Bengaluru</strong> under the auspices of Directorate of Physical Education &amp; Sports, Visvesvaraya Technological University.
          </p>

          {/* Primary CTA Buttons */}
          <div className="hero-cta-group">
            <Link href="/login/squad" className="btn-primary-hero" id="hero-btn-squad-login">
              <span>🏛️ Institution Squad Portal</span>
              <span>&rarr;</span>
            </Link>

            <Link href="/login/admin" className="btn-secondary-hero" id="hero-btn-admin-login">
              <span>🛡️ Directorate Admin Command</span>
            </Link>

            <a href="#schedule" className="btn-tertiary-hero">
              <span>📅 View Discipline Timetable &darr;</span>
            </a>
          </div>

          {/* Live Countdown to Inauguration */}
          <CountdownTimer />

        </div>
      </section>

      {/* 3. THREE INTERACTIVE ACCESS DESKS */}
      <section className="portal-cards-section" id="access-desks">
        <div className="section-wrapper">
          
          <div className="section-header-clean">
            <div className="section-eyebrow">CHAMPIONSHIP OPERATIONS DESKS</div>
            <h2 className="section-title-clean">Choose Your Official Portal Desk</h2>
            <p className="section-subtitle-clean">
              Dedicated interfaces tailored for college sports directors, technical officials, and participating institutions.
            </p>
          </div>

          <div className="cards-triple-grid">
            
            {/* Card 1: Institution Squad Portal */}
            <div className="portal-glass-card card-blue">
              <div>
                <div className="card-icon-pill">🏛️</div>
                <div className="card-role-badge">COLLEGE PRINCIPALS &bull; PEDS &bull; COACHES</div>
                <h3 className="card-title">Institution Delegation Portal</h3>
                <p className="card-desc">
                  Decentralized athlete onboarding and entry fee settlement desk for all affiliated engineering colleges.
                </p>
                <ul className="card-feature-list">
                  <li>
                    <span className="check">✓</span>
                    <span>Register Men and Women squads using institutional passphrases</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>Student athlete nomination with 12-digit Aadhaar &amp; photo uploads</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>Enforce event quotas (Compulsory 1, Optional 2, Distinct Reserve)</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>Configure 4&times;100m relay teams &amp; 21km Half Marathon runners</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>Fee computation (₹100/event, reserves free) &amp; direct UPI submission</span>
                  </li>
                </ul>
              </div>
              <Link href="/login/squad" className="btn-card-action btn-card-blue" id="portal-card-squad">
                <span>Enter Squad Portal &rarr;</span>
              </Link>
            </div>

            {/* Card 2: Directorate Admin Suite */}
            <div className="portal-glass-card card-dark">
              <div>
                <div className="card-icon-pill">🛡️</div>
                <div className="card-role-badge">TECHNICAL DIRECTORS &bull; CHIEF REFEREES</div>
                <h3 className="card-title">Directorate Administrative Suite</h3>
                <p className="card-desc">
                  Central meet command desk for the VTU Physical Education Directorate and technical officials.
                </p>
                <ul className="card-feature-list">
                  <li>
                    <span className="check">✓</span>
                    <span>Central Meet Control: One-click registration window lockdown</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>Contiguous serialized bib numbers (Boys #100+, Girls #2001+)</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>Finance clearance desk for verifying college UTR payments</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>Official accreditation ID cards studio with photo &amp; QR badges</span>
                  </li>
                  <li>
                    <span className="check">✓</span>
                    <span>Institution squad directory &amp; physical education director contacts</span>
                  </li>
                </ul>
              </div>
              <Link href="/login/admin" className="btn-card-action btn-card-dark" id="portal-card-admin">
                <span>Sign In to Command Center &rarr;</span>
              </Link>
            </div>

            {/* Card 3: Championship Regulations */}
            <div className="portal-glass-card card-gold">
              <div>
                <div className="card-icon-pill">📜</div>
                <div className="card-role-badge">AFI STANDARDS &bull; VTU COMPETITION HANDBOOK</div>
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
                  <li>
                    <span className="check">✓</span>
                    <span>Trophy scoring matrix (7-5-4-3-2-1) &amp; Team Championships</span>
                  </li>
                </ul>
              </div>
              <a href="#rules" className="btn-card-action btn-card-gold">
                <span>View Guidelines &amp; Rules &darr;</span>
              </a>
            </div>

          </div>

        </div>
      </section>

      {/* 4. CHAMPIONSHIP REGULATIONS & PARTICIPATION QUOTAS */}
      <section className="regulations-section" id="rules">
        <div className="section-wrapper">
          
          <div className="section-header-clean">
            <div className="section-eyebrow">REGULATORY FRAMEWORK</div>
            <h2 className="section-title-clean">Eligibility Norms &amp; Competition Quotas</h2>
            <p className="section-subtitle-clean">
              All participating institutions must adhere strictly to Directorate of Physical Education &amp; Sports regulations.
            </p>
          </div>

          <div className="regulations-grid-modern">
            
            {/* Rule 1: Individual Event Quota */}
            <div className="regulation-card">
              <div className="reg-card-header">
                <div className="reg-icon-box">🏃</div>
                <span className="reg-badge-quota">MAX 2 EVENTS + 1 RESERVE</span>
              </div>
              <h3 className="reg-card-title">Individual Discipline Quota</h3>
              <p className="reg-card-desc">
                Each athlete may compete in a maximum of 2 individual track or field events, plus 1 distinct reserve discipline. Event 1 is compulsory; Event 2 is optional.
              </p>
            </div>

            {/* Rule 2: Relay Squads */}
            <div className="regulation-card">
              <div className="reg-card-header">
                <div className="reg-icon-box">🔁</div>
                <span className="reg-badge-quota">4 RUNNERS + 1 RESERVE</span>
              </div>
              <h3 className="reg-card-title">Relay Squad Lineup</h3>
              <p className="reg-card-desc">
                Colleges may field 1 team for the 4&times;100m Relay and 1 team for the 4&times;400m Relay in both Men and Women divisions. Team rosters must comprise 4 active runners and 1 designated reserve.
              </p>
            </div>

            {/* Rule 3: 21km Road Half Marathon */}
            <div className="regulation-card">
              <div className="reg-card-header">
                <div className="reg-icon-box">🛣️</div>
                <span className="reg-badge-quota">DISTANCE DISCIPLINE</span>
              </div>
              <h3 className="reg-card-title">21km Road Half Marathon</h3>
              <p className="reg-card-desc">
                Open to nominated endurance runners. Athletes competing in the 21km Road Half Marathon must submit a certified institutional medical fitness certificate at the time of call-room clearance.
              </p>
            </div>

            {/* Rule 4: Student Verification & Aadhaar */}
            <div className="regulation-card">
              <div className="reg-card-header">
                <div className="reg-icon-box">🆔</div>
                <span className="reg-badge-quota">MANDATORY VERIFICATION</span>
              </div>
              <h3 className="reg-card-title">Aadhaar &amp; USN Compliance</h3>
              <p className="reg-card-desc">
                Athletes must hold an active University Seat Number (USN), provide their 12-digit Aadhaar number, and upload a high-resolution portrait photograph for official university ID badge issuance.
              </p>
            </div>

            {/* Rule 5: Transparent Dues */}
            <div className="regulation-card">
              <div className="reg-card-header">
                <div className="reg-icon-box">💳</div>
                <span className="reg-badge-quota">₹100 / EVENT &bull; RESERVES FREE</span>
              </div>
              <h3 className="reg-card-title">Transparent Financial Dues</h3>
              <p className="reg-card-desc">
                Entry fees are strictly ₹100 per active event entry. Reserve nominations are completely free of charge (₹0). Colleges transfer fees directly via UPI / NEFT and submit the 12-digit UTR reference.
              </p>
            </div>

            {/* Rule 6: Call Room Protocol */}
            <div className="regulation-card">
              <div className="reg-card-header">
                <div className="reg-icon-box">⏱️</div>
                <span className="reg-badge-quota">30 MINS ADVANCE</span>
              </div>
              <h3 className="reg-card-title">Call Room &amp; Spike Check</h3>
              <p className="reg-card-desc">
                Athletes must report to the Central Call Room 30 minutes prior to scheduled track heats and 45 minutes prior to field finals with their serialized Bib number. Maximum spike length permitted is 9mm.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 5. INTERACTIVE 4-DAY EVENT TIMETABLE */}
      <section className="schedule-section" id="schedule">
        <div className="section-wrapper">
          
          <div className="section-header-clean">
            <div className="section-eyebrow">CHAMPIONSHIP SCHEDULE</div>
            <h2 className="section-title-clean">Interactive 4-Day Discipline Timetable</h2>
            <p className="section-subtitle-clean">
              Explore scheduled track heats, field qualification flights, and grand finals across the 4-day athletic championship.
            </p>
          </div>

          <ScheduleView />

        </div>
      </section>

      {/* 6. STADIUM FACILITIES & TRANSIT LOGISTICS */}
      <section className="transit-section" id="venue">
        <div className="section-wrapper">
          
          <div className="section-header-clean">
            <div className="section-eyebrow">VENUE &amp; TRANSIT INFRASTRUCTURE</div>
            <h2 className="section-title-clean">Stadium Complex &amp; Campus Logistics</h2>
            <p className="section-subtitle-clean">
              World-class athletic infrastructure and seamless connectivity at Dr. ACS College of Engineering, Bengaluru.
            </p>
          </div>

          <div className="transit-modern-grid">
            
            {/* Left: Stadium Specifications */}
            <div className="transit-card-box">
              <h3 className="transit-card-title">
                <span>🏟️</span>
                <span>Athletic Stadium Arena Specifications</span>
              </h3>
              <ul className="transit-spec-list">
                <li className="transit-spec-item">
                  <span className="transit-spec-icon">⚡</span>
                  <div>
                    <strong>8-Lane 400m Synthetic Track:</strong> Full polyurethane synthetic surface complying with World Athletics technical specifications and ultrasonic wind gauges.
                  </div>
                </li>
                <li className="transit-spec-item">
                  <span className="transit-spec-icon">🎯</span>
                  <div>
                    <strong>Dual Sector Jumping Pits:</strong> International standard sand pits with calibrated take-off boards for Long Jump and Triple Jump disciplines.
                  </div>
                </li>
                <li className="transit-spec-item">
                  <span className="transit-spec-icon">🛡️</span>
                  <div>
                    <strong>Dedicated Throwing Rings:</strong> Concrete reinforced sectors with protective netting cages for Shot Put, Discus Throw, and Javelin runways.
                  </div>
                </li>
                <li className="transit-spec-item">
                  <span className="transit-spec-icon">🏥</span>
                  <div>
                    <strong>Sports Medicine &amp; Physiotherapy Center:</strong> 24&times;7 on-track emergency response, medical physicians, and athletic recovery beds.
                  </div>
                </li>
              </ul>
            </div>

            {/* Right: Transit & Connectivity */}
            <div className="transit-card-box">
              <h3 className="transit-card-title">
                <span>📍</span>
                <span>Transit Connectivity &amp; Hostels</span>
              </h3>
              <p style={{ color: '#475569', fontSize: '0.925rem', lineHeight: 1.6, margin: '0 0 1rem 0' }}>
                Dr. ACS College of Engineering is strategically situated along the Bengaluru-Mysuru Expressway (NH 275) with direct Namma Metro and railway connectivity.
              </p>

              <div className="transit-distance-pills">
                <div className="distance-pill">
                  <div className="dist-km">3.5 km</div>
                  <div className="dist-label">Kengeri Metro Station</div>
                </div>
                <div className="distance-pill">
                  <div className="dist-km">18 km</div>
                  <div className="dist-label">KSR Bengaluru City Railway</div>
                </div>
                <div className="distance-pill">
                  <div className="dist-km">52 km</div>
                  <div className="dist-label">Kempegowda Int'l Airport</div>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe', fontSize: '0.85rem', color: '#1e3a8a', lineHeight: 1.5 }}>
                🏨 <strong>Athlete Village Hostels:</strong> Separate hostel blocks for Men and Women contingents are pre-allocated on campus. Breakfast, lunch, and dinner are served at the Central Dining Pavilion.
              </div>
            </div>

          </div>

          {/* Dedicated Campus & Stadium Location Map Card */}
          <div className="transit-map-wrapper">
            <div className="transit-map-header">
              <div className="transit-map-header-left">
                <span className="transit-map-badge">📍 GOOGLE MAPS &bull; LIVE CAMPUS NAVIGATION</span>
                <h3 className="transit-map-title">Dr. ACS College of Engineering &bull; Athletics Stadium Arena</h3>
                <p className="transit-map-address">
                  Mysore Road, Kambipura, Kengeri Hobli, Bengaluru, Karnataka 560074 &bull; NH 275 (Bengaluru-Mysuru Expressway)
                </p>
              </div>
              <div className="transit-map-header-right">
                <a 
                  href="https://www.google.com/maps/search/?api=1&query=ACS+College+of+Engineering+Bengaluru" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-open-maps"
                  title="Open live navigation in Google Maps"
                >
                  <span>Open in Google Maps</span>
                  <span>↗</span>
                </a>
              </div>
            </div>

            <div className="transit-map-frame-box">
              <iframe
                title="Dr. ACS College of Engineering Campus & Stadium on Google Maps"
                src="https://maps.google.com/maps?q=ACS+College+of+Engineering,+Bengaluru&t=&z=15&ie=UTF8&iwloc=&output=embed"
                className="transit-map-iframe"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="transit-map-footer-strip">
              <div className="transit-footer-item">
                <span className="transit-footer-icon">🚇</span>
                <div>
                  <strong>Namma Metro (Purple Line):</strong> Kengeri Metro Terminal (3.5 km) with direct tournament shuttle vans
                </div>
              </div>
              <div className="transit-footer-item">
                <span className="transit-footer-icon">🚆</span>
                <div>
                  <strong>South Western Railway:</strong> Kengeri Railway Station (4.0 km) &amp; KSR Bengaluru Central (18 km)
                </div>
              </div>
              <div className="transit-footer-item">
                <span className="transit-footer-icon">🛣️</span>
                <div>
                  <strong>Highway Convoys:</strong> Direct expressway slip-road access from NH 275; Gates 1 &amp; 2 for team coaches
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 7. HOST INSTITUTION SPOTLIGHT */}
      <section className="host-section" id="host-college">
        <div className="section-wrapper">
          
          {/* Main Institution Profile Card */}
          <div className="host-modern-container">
            <div>
              <div className="section-eyebrow">HOST INSTITUTION PROFILE &bull; 26TH VTU ATHLETICS CHAMPIONSHIP</div>
              <h2 className="section-title-clean" style={{ textAlign: 'left', marginBottom: '0.65rem' }}>
                Dr. ACS College of Engineering, Bengaluru
              </h2>
              <div style={{ color: '#1d4ed8', fontWeight: 700, fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                Approved by AICTE, New Delhi &bull; Affiliated to VTU, Belagavi &bull; NAAC &lsquo;A&rsquo; Grade &amp; NBA Accredited
              </div>
              <p style={{ color: '#334155', lineHeight: 1.7, fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                Established under the benevolent stewardship of <strong>Moogambigai Charitable and Educational Trust</strong>, founded by renowned visionary leader <strong>Dr. A. C. Shanmugam</strong>, Dr. ACS College of Engineering (ACSCE) stands as a beacon of academic rigor and collegiate athletic prominence in Karnataka. The institution features a 35+ acre campus along the Bengaluru-Mysuru Expressway, integrating state-of-the-art engineering laboratories with world-class athletic facilities, multi-sport arenas, and full residential hospitality for inter-university championships.
              </p>

              <div className="host-stats-row-6">
                <div className="host-stat-box">
                  <div className="host-stat-val">35+ Acres</div>
                  <div className="host-stat-lbl">Sports &amp; Tech Campus</div>
                </div>
                <div className="host-stat-box">
                  <div className="host-stat-val">NAAC &lsquo;A&rsquo;</div>
                  <div className="host-stat-lbl">Grade &amp; NBA Accredited</div>
                </div>
                <div className="host-stat-box">
                  <div className="host-stat-val">4,000+</div>
                  <div className="host-stat-lbl">ACS Convention Center</div>
                </div>
                <div className="host-stat-box">
                  <div className="host-stat-val">600+ Beds</div>
                  <div className="host-stat-lbl">Delegation Hostels</div>
                </div>
                <div className="host-stat-box">
                  <div className="host-stat-val">24/7 Care</div>
                  <div className="host-stat-lbl">RRMCH Medical Support</div>
                </div>
              </div>

              <div style={{ background: '#eff6ff', borderLeft: '4px solid #2563eb', padding: '1.15rem 1.5rem', borderRadius: '8px', fontSize: '0.925rem', color: '#1e3a8a', fontStyle: 'italic', fontWeight: 600 }}>
                &ldquo;To create job creators not job seekers &mdash; fostering holistic discipline, competitive spirit, and character through collegiate athletics.&rdquo;
                <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500, fontStyle: 'normal', marginTop: '0.35rem' }}>
                  &mdash; <strong>Dr. A. C. Shanmugam</strong>, Chairman, Moogambigai Educational Trust
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <img
                src="/acsce-logo.png"
                alt="Dr. ACS College of Engineering Official Red Emblem"
                style={{ maxWidth: '100%', maxHeight: '260px', objectFit: 'contain', filter: 'drop-shadow(0 4px 20px rgba(15,23,42,0.08))' }}
              />
              <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                Campus #207, Kambipura, Mysore Road, Bengaluru &bull; Estd. 1992
              </div>
            </div>
          </div>

          {/* Three Detailed Campus & Sports Infrastructure Pillars */}
          <div className="host-features-grid">
            {/* Pillar 1: Athletic & Sports Infrastructure */}
            <div className="host-feature-card">
              <div className="host-feature-header">
                <div className="host-feature-icon host-icon-blue">🏟️</div>
                <div className="host-feature-title">Championship Athletic Arenas</div>
              </div>
              <ul className="host-feature-list">
                <li className="host-feature-item">
                  <span className="host-item-bullet">&bull;</span>
                  <span><strong>8-Lane Synthetic Track:</strong> 400m standard synthetic running track with electronic lane markers, photo-finish timing mounts, and IAAF-compliant curves.</span>
                </li>
                <li className="host-feature-item">
                  <span className="host-item-bullet">&bull;</span>
                  <span><strong>Dedicated Field Arenas:</strong> Competition-certified pits for Long Jump, Triple Jump, High Jump, and Pole Vault, plus specialized safety cages for Javelin, Shot Put, and Discus throw.</span>
                </li>
                <li className="host-feature-item">
                  <span className="host-item-bullet">&bull;</span>
                  <span><strong>Multi-Sport Grounds:</strong> Expansive lush grass outfield for Football, Cricket, Hockey, and Rugby tournaments with spectator pavilions.</span>
                </li>
                <li className="host-feature-item">
                  <span className="host-item-bullet">&bull;</span>
                  <span><strong>Aquatics &amp; Conditioning:</strong> Semi-Olympic on-campus swimming pool and modern gymnasium equipped with Olympic weight sets and cardio fitness trainers.</span>
                </li>
              </ul>
            </div>

            {/* Pillar 2: Delegation Residential & Hospitality */}
            <div className="host-feature-card">
              <div className="host-feature-header">
                <div className="host-feature-icon host-icon-gold">🛌</div>
                <div className="host-feature-title">Delegation Hospitality &amp; Lodging</div>
              </div>
              <ul className="host-feature-list">
                <li className="host-feature-item">
                  <span className="host-item-bullet">&bull;</span>
                  <span><strong>Dedicated Hostels:</strong> Separate multi-storey residential towers for visiting men and women athlete squads, accommodating 600+ delegates with 24/7 security and Wi-Fi.</span>
                </li>
                <li className="host-feature-item">
                  <span className="host-item-bullet">&bull;</span>
                  <span><strong>Central Dining Pavilion:</strong> Hygienic multi-cuisine dining facility serving balanced, high-protein athletic meals prepared fresh under dietary supervision.</span>
                </li>
                <li className="host-feature-item">
                  <span className="host-item-bullet">&bull;</span>
                  <span><strong>ACS Convention Hall:</strong> A state-of-the-art 4,000-seat central auditorium hosting the grand inaugural march-past, technical briefings, and championship valedictory banquets.</span>
                </li>
                <li className="host-feature-item">
                  <span className="host-item-bullet">&bull;</span>
                  <span><strong>Indoor Pavilion:</strong> Air-conditioned recreational halls with multi-table Table Tennis setups, Carrom suites, and international Chess boards for athlete downtime.</span>
                </li>
              </ul>
            </div>

            {/* Pillar 3: On-Field Medical Care & Strategic Connectivity */}
            <div className="host-feature-card">
              <div className="host-feature-header">
                <div className="host-feature-icon host-icon-emerald">🏥</div>
                <div className="host-feature-title">Medical Care &amp; Transit Hub</div>
              </div>
              <ul className="host-feature-list">
                <li className="host-feature-item">
                  <span className="host-item-bullet">&bull;</span>
                  <span><strong>RRMCH Medical Support:</strong> Direct collaboration with the adjacent Rajarajeswari Medical College &amp; Hospital, providing on-field doctors and emergency triage stations.</span>
                </li>
                <li className="host-feature-item">
                  <span className="host-item-bullet">&bull;</span>
                  <span><strong>Sports Physiotherapy:</strong> Dedicated physio recovery desk equipped with cryotherapy ice baths, sports massage specialists, and stretch recovery facilities.</span>
                </li>
                <li className="host-feature-item">
                  <span className="host-item-bullet">&bull;</span>
                  <span><strong>Expressway Location:</strong> Located right on NH 275 (10-Lane Bengaluru-Mysuru Expressway), ensuring zero traffic bottlenecks for arriving team convoys.</span>
                </li>
                <li className="host-feature-item">
                  <span className="host-item-bullet">&bull;</span>
                  <span><strong>Metro &amp; Bus Transit:</strong> Just 2.5 km from Kengeri Metro Station (Purple Line) and Kengeri Satellite Bus Terminal, serviced by dedicated university shuttle vans.</span>
                </li>
              </ul>
            </div>
          </div>

        </div>
      </section>

      {/* 8. CHAMPIONSHIP GALLERY & HALL OF GLORY (Interactive Editorial Bento & Lightbox) */}
      <GallerySection />

      {/* 9. MODERN CLEAN LIGHT FOOTER */}
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
              <li><a href="#gallery">📸 Championship Gallery</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Meet Administration</h4>
            <p>
              Organizing Secretary: <strong>Director of Physical Education, ACSCE</strong><br />
              Technical Delegate: <strong>VTU Sports Delegate</strong><br />
              Finance Verification: <strong>Finance Desk</strong><br />
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
