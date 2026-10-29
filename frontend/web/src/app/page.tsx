import Link from 'next/link';
import ScheduleView from './ScheduleView';
import GallerySection from './GallerySection';
import CountdownTimer from './CountdownTimer';
import TransitRoutes from './TransitRoutes';
import LeadershipAndRanks from './LeadershipAndRanks';
import { Navbar } from '@/components/layout/Navbar';
import './home.css';

export default function HomePage() {
  return (
    <div className="landing-container" id="landing-page-root">
      {/* 0. SUBTLE ARCHITECTURAL WATERMARK BACKGROUND */}
      <div className="fixed-viewport-svg-bg" aria-hidden="true">
        <img
          src="/athletics-aura-bg.svg"
          alt=""
          className="fixed-viewport-svg-asset"
        />
      </div>

      {/* 1. OFFICIAL UNIVERSITY IDENTITY & NAVIGATION */}
      <Navbar />

      {/* 2. ASYMMETRIC EDITORIAL CHAMPIONSHIP HERO SECTION */}
      <section className="hero-editorial-section">
        <div className="hero-editorial-container">
          
          {/* Left Column (60%): Tournament Identity & Authority */}
          <div className="hero-editorial-left">
            
            {/* Taxonomy / Classification Header */}
            <div className="hero-kicker-bar">
              <span className="hero-kicker-dept">DIRECTORATE OF PHYSICAL EDUCATION &amp; SPORTS</span>
              <span className="hero-kicker-sep">/</span>
              <span className="hero-kicker-meet">26TH VTU STATE ATHLETICS</span>
            </div>

            {/* Display Headline */}
            <h1 className="hero-editorial-title">
              ACS ATHLETICS AURA <span className="hero-title-year">2026</span>
            </h1>

            {/* Edition Subtitle */}
            <div className="hero-edition-line">
              26th VTU Inter-Collegiate Athletics Championship &amp; State Selection Trials
            </div>

            {/* Institutional Summary */}
            <p className="hero-editorial-desc">
              Organized by <strong>Visvesvaraya Technological University (VTU), Belagavi</strong> and hosted at the synthetic track stadium of <strong>Dr. ACS College of Engineering, Bengaluru</strong>. Bringing together 200+ affiliated engineering institutions, 3,000+ student-athletes, and All India Inter-University selection trials.
            </p>

            {/* Structured Event Metadata Strip */}
            <div className="hero-meta-strip">
              <div className="meta-strip-item">
                <span className="meta-strip-label">CHAMPIONSHIP DATES</span>
                <span className="meta-strip-val">Dec 08 – 11, 2026</span>
              </div>
              <div className="meta-strip-sep" aria-hidden="true" />
              <div className="meta-strip-item">
                <span className="meta-strip-label">COMPETITION ARENA</span>
                <span className="meta-strip-val">Synthetic Track, ACSCE Campus</span>
              </div>
              <div className="meta-strip-sep" aria-hidden="true" />
              <div className="meta-strip-item">
                <span className="meta-strip-label">DISCIPLINES</span>
                <span className="meta-strip-val">40+ Track &amp; Field Events</span>
              </div>
            </div>

            {/* Primary Action Buttons (Left-Aligned, High-Contrast) */}
            <div className="hero-action-buttons">
              <Link href="/login/squad" className="btn-hero-solid" id="hero-btn-squad-login">
                <span>Institution Squad Portal</span>
                <span className="btn-arrow" aria-hidden="true">&rarr;</span>
              </Link>

              <Link href="/login/admin" className="btn-hero-outline" id="hero-btn-admin-login">
                <span>Directorate Admin</span>
              </Link>

              <a href="#schedule" className="btn-hero-text">
                <span>Discipline Timetable &darr;</span>
              </a>
            </div>

          </div>

          {/* Right Column (40%): Tournament Control Deck & Precision Clock */}
          <div className="hero-editorial-right">
            <CountdownTimer />
          </div>

        </div>
      </section>

      {/* 3. THREE OFFICIAL PORTAL ACCESS DESKS */}
      <section className="portal-cards-section" id="access-desks">
        <div className="section-wrapper">
          
          <div className="editorial-section-header">
            <div className="editorial-header-left">
              <div className="editorial-category-tag">CHAMPIONSHIP OPERATIONS // SECURE DESKS</div>
              <h2 className="editorial-section-title">Official Portal Access Desks</h2>
              <p className="editorial-section-desc">
                Dedicated operational interfaces for college sports directors, physical education staff, and Directorate technical officials.
              </p>
            </div>
            <div className="editorial-header-right">
              <span className="editorial-header-badge">VTU &bull; DPE &bull; 2026-27</span>
            </div>
          </div>

          <div className="cards-triple-grid">
            
            {/* Card 1: Institution Squad Portal */}
            <div className="portal-official-card card-accent-blue">
              <div>
                <div className="card-top-tag">DESK 01 // INSTITUTION SQUADS</div>
                <h3 className="card-title">Delegation Roster Portal</h3>
                <p className="card-desc">
                  Decentralized athlete onboarding and entry fee settlement desk for all affiliated engineering colleges.
                </p>
                <ul className="card-feature-list">
                  <li>
                    <span className="check" aria-hidden="true">&bull;</span>
                    <span>Register Men and Women squads using institutional passphrases</span>
                  </li>
                  <li>
                    <span className="check" aria-hidden="true">&bull;</span>
                    <span>Student athlete nomination with 12-digit Aadhaar &amp; photo uploads</span>
                  </li>
                  <li>
                    <span className="check" aria-hidden="true">&bull;</span>
                    <span>Enforce event quotas (Compulsory 1, Optional 2, Distinct Reserve)</span>
                  </li>
                  <li>
                    <span className="check" aria-hidden="true">&bull;</span>
                    <span>Configure 4&times;100m relay squads &amp; 21km Road Half Marathon runners</span>
                  </li>
                  <li>
                    <span className="check" aria-hidden="true">&bull;</span>
                    <span>Fee computation (₹100/event, reserves free) &amp; direct UPI submission</span>
                  </li>
                </ul>
              </div>
              <Link href="/login/squad" className="btn-card-action btn-card-blue" id="portal-card-squad">
                <span>Enter Squad Portal &rarr;</span>
              </Link>
            </div>

            {/* Card 2: Directorate Admin Suite */}
            <div className="portal-official-card card-accent-dark">
              <div>
                <div className="card-top-tag">DESK 02 // DIRECTORATE COMMAND</div>
                <h3 className="card-title">Directorate Administrative Suite</h3>
                <p className="card-desc">
                  Central meet command desk for the VTU Physical Education Directorate and technical officials.
                </p>
                <ul className="card-feature-list">
                  <li>
                    <span className="check" aria-hidden="true">&bull;</span>
                    <span>Central Meet Control: One-click registration window lockdown</span>
                  </li>
                  <li>
                    <span className="check" aria-hidden="true">&bull;</span>
                    <span>Contiguous serialized bib numbers (Boys #100+, Girls #2001+)</span>
                  </li>
                  <li>
                    <span className="check" aria-hidden="true">&bull;</span>
                    <span>Finance clearance desk for verifying college UTR payments</span>
                  </li>
                  <li>
                    <span className="check" aria-hidden="true">&bull;</span>
                    <span>Batch printable PDF ID badges with encrypted security QR tags</span>
                  </li>
                  <li>
                    <span className="check" aria-hidden="true">&bull;</span>
                    <span>Event-wise heat sheets &amp; lane draw exports for technical judges</span>
                  </li>
                </ul>
              </div>
              <Link href="/login/admin" className="btn-card-action btn-card-dark" id="portal-card-admin">
                <span>Enter Admin Console &rarr;</span>
              </Link>
            </div>

            {/* Card 3: Regulations & Meet Guidelines */}
            <div className="portal-official-card card-accent-gold">
              <div>
                <div className="card-top-tag">DESK 03 // TOURNAMENT PROTOCOL</div>
                <h3 className="card-title">Technical Norms &amp; Rulebook</h3>
                <p className="card-desc">
                  Directorate guidelines governing competition conduct, eligibility scrutiny, and points allocation.
                </p>
                <ul className="card-feature-list">
                  <li>
                    <span className="check" aria-hidden="true">&bull;</span>
                    <span>AFI certified electronic track timing and ultrasonic wind gauge standards</span>
                  </li>
                  <li>
                    <span className="check" aria-hidden="true">&bull;</span>
                    <span>Day-by-day 4-day athletics timetable with call-room reporting</span>
                  </li>
                  <li>
                    <span className="check" aria-hidden="true">&bull;</span>
                    <span>Campus arrival protocol, athlete village hostels &amp; transit GPS</span>
                  </li>
                  <li>
                    <span className="check" aria-hidden="true">&bull;</span>
                    <span>Trophy scoring matrix (7-5-4-3-2-1) &amp; Team Championships</span>
                  </li>
                  <li>
                    <span className="check" aria-hidden="true">&bull;</span>
                    <span>Selection criteria for All India Inter-University Athletics Meet</span>
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
          
          <div className="editorial-section-header">
            <div className="editorial-header-left">
              <div className="editorial-category-tag">REGULATORY FRAMEWORK // VTU SPORTS CODE</div>
              <h2 className="editorial-section-title">Eligibility Norms &amp; Competition Quotas</h2>
              <p className="editorial-section-desc">
                All participating institutions must adhere strictly to Directorate of Physical Education &amp; Sports regulations.
              </p>
            </div>
            <div className="editorial-header-right">
              <span className="editorial-header-badge">VTU REGULATIONS</span>
            </div>
          </div>

          <div className="regulations-grid-modern">
            
            {/* Rule 1: Individual Event Quota */}
            <div className="regulation-card">
              <div className="reg-card-header">
                <span className="reg-norm-code">NORM 01</span>
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
                <span className="reg-norm-code">NORM 02</span>
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
                <span className="reg-norm-code">NORM 03</span>
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
                <span className="reg-norm-code">NORM 04</span>
                <span className="reg-badge-quota">GOVT VERIFICATION</span>
              </div>
              <h3 className="reg-card-title">Identity &amp; Aadhaar Verification</h3>
              <p className="reg-card-desc">
                Every nominated student must provide a valid 12-digit Aadhaar number and college ID card. Spot Aadhaar fingerprint verification is mandatory at call-room desk clearance.
              </p>
            </div>

            {/* Rule 5: Entry Fee Structure */}
            <div className="regulation-card">
              <div className="reg-card-header">
                <span className="reg-norm-code">NORM 05</span>
                <span className="reg-badge-quota">FINANCE VERIFICATION</span>
              </div>
              <h3 className="reg-card-title">Registration Fees &amp; Accounts</h3>
              <p className="reg-card-desc">
                Standard entry fee of ₹100 per nominated individual discipline. Reserve nominations are exempt from fees. All entry fee transfers must be confirmed via bank UTR before roster lock.
              </p>
            </div>

            {/* Rule 6: Call Room Protocol */}
            <div className="regulation-card">
              <div className="reg-card-header">
                <span className="reg-norm-code">NORM 06</span>
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
          
          <div className="editorial-section-header">
            <div className="editorial-header-left">
              <div className="editorial-category-tag">EVENT TIMETABLE // 4-DAY CHAMPIONSHIP</div>
              <h2 className="editorial-section-title">Interactive Discipline Schedule</h2>
              <p className="editorial-section-desc">
                Track heats, field qualification rounds, and valedictory finals scheduled across the 4-day athletic meet.
              </p>
            </div>
            <div className="editorial-header-right">
              <span className="editorial-header-badge">DEC 08 – 11, 2026</span>
            </div>
          </div>

          <ScheduleView />

        </div>
      </section>

      {/* 6. STADIUM FACILITIES & TRANSIT LOGISTICS */}
      <section className="transit-section" id="venue">
        <div className="section-wrapper">
          
          <div className="editorial-section-header">
            <div className="editorial-header-left">
              <div className="editorial-category-tag">CAMPUS &amp; LOGISTICS // BENGALURU-MYSURU EXPRESSWAY</div>
              <h2 className="editorial-section-title">Stadium Complex &amp; Campus Logistics</h2>
              <p className="editorial-section-desc">
                World-class synthetic track infrastructure and transit connectivity at Dr. ACS College of Engineering, Bengaluru.
              </p>
            </div>
            <div className="editorial-header-right">
              <span className="editorial-header-badge">GPS: 12.8910233° N, 77.4655618° E</span>
            </div>
          </div>

          <div className="transit-modern-grid">
            
            {/* Left: Stadium Specifications */}
            <div className="transit-card-box">
              <div className="transit-box-top-tag">FACILITY INFRASTRUCTURE</div>
              <h3 className="transit-card-title">
                Athletic Stadium Arena Specifications
              </h3>
              <ul className="transit-spec-list">
                <li className="transit-spec-item">
                  <span className="transit-spec-marker">&bull;</span>
                  <div>
                    <strong>8-Lane 400m Synthetic Track:</strong> Full polyurethane synthetic surface complying with World Athletics technical specifications and ultrasonic wind gauges.
                  </div>
                </li>
                <li className="transit-spec-item">
                  <span className="transit-spec-marker">&bull;</span>
                  <div>
                    <strong>Dual Sector Jumping Pits:</strong> International standard sand pits with calibrated take-off boards for Long Jump and Triple Jump disciplines.
                  </div>
                </li>
                <li className="transit-spec-item">
                  <span className="transit-spec-marker">&bull;</span>
                  <div>
                    <strong>Dedicated Throwing Rings:</strong> Concrete reinforced sectors with protective netting cages for Shot Put, Discus Throw, and Javelin runways.
                  </div>
                </li>
                <li className="transit-spec-item">
                  <span className="transit-spec-marker">&bull;</span>
                  <div>
                    <strong>Sports Medicine &amp; Physiotherapy Center:</strong> 24&times;7 on-track emergency response, medical physicians, and athletic recovery beds.
                  </div>
                </li>
              </ul>
            </div>

            {/* Right: Transit & Connectivity */}
            <div className="transit-card-box">
              <div className="transit-box-top-tag">CONNECTIVITY &amp; ACCOMMODATION</div>
              <h3 className="transit-card-title">
                Transit Connectivity &amp; Hostels
              </h3>
              <p style={{ color: '#475569', fontSize: '0.925rem', lineHeight: 1.6, margin: '0 0 1.25rem 0' }}>
                Dr. ACS College of Engineering is strategically situated along the Bengaluru-Mysuru Expressway (NH 275) with direct Namma Metro and South Western railway connectivity.
              </p>

              <div className="transit-distance-pills">
                <div className="distance-pill">
                  <div className="dist-km">2.0 km</div>
                  <div className="dist-label">Challagatta Metro Station</div>
                </div>
                <div className="distance-pill">
                  <div className="dist-km">3.5 km</div>
                  <div className="dist-label">Kengeri Metro Station</div>
                </div>
                <div className="distance-pill">
                  <div className="dist-km">18 km</div>
                  <div className="dist-label">KSR Bengaluru City Railway</div>
                </div>
                <div className="distance-pill">
                  <div className="dist-km">18.5 km</div>
                  <div className="dist-label">Majestic Bus Stand</div>
                </div>
              </div>

              <div className="athlete-village-box">
                <strong>Athlete Village Hostels:</strong> Separate hostel blocks for Men and Women contingents are pre-allocated on campus. Breakfast, lunch, and dinner are served at the Central Dining Pavilion.
              </div>
            </div>

          </div>

          {/* Dedicated Campus & Stadium Location Map Card */}
          <div className="transit-map-wrapper">
            <div className="transit-map-header">
              <div className="transit-map-header-left">
                <span className="transit-map-badge">12.8910233° N, 77.4655618° E &bull; LIVE STADIUM PINPOINT</span>
                <h3 className="transit-map-title">Dr. ACS College of Engineering &bull; Athletics Stadium Arena</h3>
                <p className="transit-map-address">
                  Mysore Road, Kambipura, Kengeri Hobli, Bengaluru, Karnataka 560074 &bull; NH 275 (Bengaluru-Mysuru Expressway)
                </p>
              </div>
              <div className="transit-map-header-right">
                <a 
                  href="https://maps.google.com/maps?q=12.8910233%2C77.4655618&z=17&hl=en" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-open-maps"
                  title="Open live navigation in Google Maps (Exact Stadium Pin)"
                >
                  <span>Open in Google Maps</span>
                  <span>↗</span>
                </a>
              </div>
            </div>

            <div className="transit-map-frame-box">
              <iframe
                title="Dr. ACS College of Engineering Athletic Stadium on Google Maps"
                src="https://maps.google.com/maps?q=12.8910233,77.4655618&t=&z=17&ie=UTF8&iwloc=&output=embed"
                className="transit-map-iframe"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="transit-map-footer-strip">
              <div className="transit-footer-item">
                <span className="transit-footer-tag">METRO</span>
                <div>
                  <strong>Namma Metro (Purple Line):</strong> Challagatta Terminal (2.0 km) &amp; Kengeri Station (3.5 km) with direct tournament connectivity
                </div>
              </div>
              <div className="transit-footer-item">
                <span className="transit-footer-tag">RAILWAY</span>
                <div>
                  <strong>South Western Railway:</strong> Kengeri Station (4.0 km) &amp; KSR Bengaluru City Railway (18 km)
                </div>
              </div>
              <div className="transit-footer-item">
                <span className="transit-footer-tag">BMTC BUS</span>
                <div>
                  <strong>Majestic Bus Terminal:</strong> Kempegowda Bus Station (18.5 km) with direct BMTC 226 series buses to campus gates
                </div>
              </div>
            </div>
          </div>

          {/* Official Contingent Logistics & Transit Routes (From Transport Doc) */}
          <TransitRoutes />

        </div>
      </section>

      {/* 7. HOST INSTITUTION SPOTLIGHT */}
      <section className="host-section" id="host-college">
        <div className="section-wrapper">
          
          {/* Main Institution Profile Card */}
          <div className="host-modern-container">
            <div>
              <div className="editorial-category-tag">HOST INSTITUTION PROFILE // BENGALURU</div>
              <h2 className="editorial-section-title" style={{ marginBottom: '0.5rem' }}>
                Dr. ACS College of Engineering, Bengaluru
              </h2>
              <div style={{ color: '#1d4ed8', fontWeight: 700, fontSize: '0.85rem', marginBottom: '1.25rem' }}>
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

              <div style={{ background: '#f8fafc', borderLeft: '3px solid #1e3a8a', padding: '1rem 1.25rem', borderRadius: '4px', fontSize: '0.9rem', color: '#1e3a8a', fontStyle: 'italic', fontWeight: 600 }}>
                &ldquo;To create job creators not job seekers &mdash; fostering holistic discipline, competitive spirit, and character through collegiate athletics.&rdquo;
                <div style={{ fontSize: '0.785rem', color: '#64748b', fontWeight: 600, fontStyle: 'normal', marginTop: '0.35rem' }}>
                  &mdash; <strong>Dr. A. C. Shanmugam</strong>, Chairman, Moogambigai Educational Trust
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <img
                src="/acsce-logo.png"
                alt="Dr. ACS College of Engineering Official Red Emblem"
                style={{ maxWidth: '100%', maxHeight: '240px', objectFit: 'contain' }}
              />
              <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                Campus #207, Kambipura, Mysore Road, Bengaluru &bull; Estd. 1992
              </div>
            </div>
          </div>

          {/* Three Campus & Sports Infrastructure Pillars */}
          <div className="host-features-grid">
            {/* Pillar 1: Athletic & Sports Infrastructure */}
            <div className="host-feature-card">
              <div className="host-feature-header">
                <span className="pillar-num">01</span>
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
                <span className="pillar-num">02</span>
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
                <span className="pillar-num">03</span>
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

          {/* Organizing Patrons, Executive Leadership & VTU University Rank Holders */}
          <LeadershipAndRanks />

        </div>
      </section>

      {/* 8. CHAMPIONSHIP GALLERY & HALL OF GLORY */}
      <GallerySection />

      {/* 9. OFFICIAL FOOTER */}
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
                <Link href="/login/squad" style={{ color: '#1d4ed8', fontWeight: 700 }}>
                  Institution Squad Login
                </Link>
              </li>
              <li>
                <Link href="/login/admin" style={{ color: '#0f172a', fontWeight: 700 }}>
                  Directorate Admin Command
                </Link>
              </li>
              <li><a href="#rules">Championship Regulations</a></li>
              <li><a href="#schedule">Discipline Timetable</a></li>
              <li><a href="#venue">Stadium Location &amp; Transit</a></li>
              <li><a href="#gallery">Championship Gallery</a></li>
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
