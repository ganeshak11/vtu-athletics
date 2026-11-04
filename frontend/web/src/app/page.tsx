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

      {/* 2. GRAND EDITORIAL CHAMPIONSHIP HERO SECTION */}
      <section className="hero-editorial-section">
        <div className="hero-editorial-container">

          {/* Tournament Identity & Authority (Full-Width Top Stage) */}
          <div className="hero-editorial-main">

            {/* Taxonomy / Classification Header */}
            <div className="hero-kicker-bar">
              <span className="hero-kicker-dept">DIRECTORATE OF PHYSICAL EDUCATION &amp; SPORTS</span>
              <span className="hero-kicker-sep">/</span>
              <span className="hero-kicker-meet">28TH VTU STATE ATHLETICS</span>
            </div>

            {/* Display Headline */}
            <h1 className="hero-editorial-title">
              <span className="hero-title-brand">
                D<span className="hero-title-dr-r">r</span>. ACS AURA
              </span>{' '}
              <span className="hero-title-year">2026</span>
            </h1>

            {/* Edition Subtitle */}
            <div className="hero-edition-line">
              28th VTU Inter-Collegiate State Level Athletic Meet – 2026
            </div>

            {/* Institutional Summary */}
            <p className="hero-editorial-desc">
              Organized under the aegis of <strong>Visvesvaraya Technological University (VTU), Belagavi</strong> and hosted by <strong>Dr. ACS College of Engineering, Bengaluru</strong>. Bringing together 200+ affiliated engineering institutions, 3,000+ student-athletes, and All India Inter-University selection trials.
            </p>

            {/* Structured Event Metadata Strip */}
            <div className="hero-meta-strip">
              <div className="meta-strip-item">
                <span className="meta-strip-label">CHAMPIONSHIP DATES</span>
                <span className="meta-strip-val">Dec 07 – 10, 2026</span>
              </div>
              <div className="meta-strip-sep" aria-hidden="true" />
              <div className="meta-strip-item">
                <span className="meta-strip-label">COMPETITION ARENA</span>
                <span className="meta-strip-val">Mud Track, Dr. ACSCE Campus</span>
              </div>
              <div className="meta-strip-sep" aria-hidden="true" />
              <div className="meta-strip-item">
                <span className="meta-strip-label">DISCIPLINES</span>
                <span className="meta-strip-val">25 Event Codes (45 Competitions)</span>
              </div>
              <div className="meta-strip-sep" aria-hidden="true" />
              <div className="meta-strip-item">
                <span className="meta-strip-label">REGISTRATION DEADLINE</span>
                <span className="meta-strip-val">25-11-2026</span>
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

          {/* Tournament Control Deck & Precision Clock (Brought Down & Scaled Up) */}
          <div className="hero-countdown-wrapper">
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

            {/* Rule 1: Individual Event Quota & Reserve Rule */}
            <div className="regulation-card">
              <div className="reg-card-header">
                <span className="reg-norm-code">NORM 01</span>
                <span className="reg-badge-quota">MAX 2 EVENTS + RESERVE RULE</span>
              </div>
              <h3 className="reg-card-title">Individual Discipline Quota &amp; Reserve Rule</h3>
              <p className="reg-card-desc">
                Each athlete may compete in a maximum of 2 individual track or field events. <strong>If an athlete chooses both Event 1 and Event 2, they cannot nominate a reserve event</strong> (reserve is strictly disabled). Athletes can still register for 4&times;400m Mixed Relay and 21km Half Marathon unrestricted.
              </p>
            </div>

            {/* Rule 2: Standalone Disciplines & Relay Squads */}
            <div className="regulation-card">
              <div className="reg-card-header">
                <span className="reg-norm-code">NORM 02</span>
                <span className="reg-badge-quota">STANDALONE &bull; 6 PER TEAM</span>
              </div>
              <h3 className="reg-card-title">Standalone Relays &amp; Relay Team Quota</h3>
              <p className="reg-card-desc">
                All relays (4&times;100m, 4&times;400m, Mixed Relay) and 21km Half Marathon can be registered <strong>standalone</strong> (no Event 1 required). A college can enter up to 3 relay teams with <strong>6 members per relay team</strong> (4 active runners + 2 reserves). Only 1 divisional relay team per member. Call Room Officials can approve and update substitutes before race start.
              </p>
            </div>

            {/* Rule 3: Hurdle Specifications */}
            <div className="regulation-card">
              <div className="reg-card-header">
                <span className="reg-norm-code">NORM 03</span>
                <span className="reg-badge-quota">HURDLE HEIGHT NORMS</span>
              </div>
              <h3 className="reg-card-title">Official Hurdle Height Specifications</h3>
              <p className="reg-card-desc">
                World Athletics &amp; VTU standard hurdle heights: <strong>110m Hurdles (Men) &ndash; 1.067 m</strong> (3.5 ft / 42 in); <strong>100m Hurdles (Women) &ndash; 0.838 m</strong> (2.75 ft / 33 in); <strong>400m Hurdles (Men) &ndash; 0.914 m</strong> (3.0 ft / 36 in); <strong>400m Hurdles (Women) &ndash; 0.762 m</strong> (2.5 ft / 30 in).
              </p>
            </div>

            {/* Rule 4: Field Events Pass Rules */}
            <div className="regulation-card">
              <div className="reg-card-header">
                <span className="reg-norm-code">NORM 04</span>
                <span className="reg-badge-quota">VERTICAL &amp; HORIZONTAL PASS</span>
              </div>
              <h3 className="reg-card-title">Field Jumps &amp; Throws Pass Protocols</h3>
              <p className="reg-card-desc">
                <strong>Vertical Jumps</strong> (High Jump, Pole Vault): Athletes may pass at any given height. <strong>Horizontal Jumps</strong> (Long Jump, Triple Jump) &amp; <strong>Throws</strong> (Shot Put, Discus, Javelin, Hammer): Athletes may pass on any individual attempt / trial.
              </p>
            </div>

            {/* Rule 5: Championship Scoring Matrix */}
            <div className="regulation-card">
              <div className="reg-card-header">
                <span className="reg-norm-code">NORM 05</span>
                <span className="reg-badge-quota">POINTS: 10-6-2 &amp; 5-3-1</span>
              </div>
              <h3 className="reg-card-title">Championship Points &amp; Scoring Matrix</h3>
              <p className="reg-card-desc">
                <strong>Team / Relay Events:</strong> 1st = 10 pts, 2nd = 6 pts, 3rd = 2 pts (<strong>only the final 4 running members who compete in the relay receive points</strong>). <strong>Individual Events:</strong> 1st = 5 pts, 2nd = 3 pts, 3rd = 1 pt.
              </p>
            </div>

            {/* Rule 6: Track Heats Progression */}
            <div className="regulation-card">
              <div className="reg-card-header">
                <span className="reg-norm-code">NORM 06</span>
                <span className="reg-badge-quota">TOP 2 ADVANCE TO FINALS</span>
              </div>
              <h3 className="reg-card-title">Preliminary Track Progression Rule</h3>
              <p className="reg-card-desc">
                <strong>Top 2 athletes from each preliminary heat automatically advance to the Finals</strong> (position-based Q1 &amp; Q2). Progression is <strong>strictly position-based, NOT based on fastest times</strong> for preliminary heats.
              </p>
            </div>

            {/* Rule 7: 5 Major Championship Awards */}
            <div className="regulation-card">
              <div className="reg-card-header">
                <span className="reg-norm-code">NORM 07</span>
                <span className="reg-badge-quota">5 CHAMPIONSHIP TROPHIES</span>
              </div>
              <h3 className="reg-card-title">Championship Trophies &amp; Best Athletes</h3>
              <p className="reg-card-desc">
                Five major championship trophies will be awarded: (1) <strong>Best Male Athlete</strong> (Individual Champion), (2) <strong>Best Female Athlete</strong> (Individual Champion), (3) <strong>Best Men&rsquo;s College Team</strong>, (4) <strong>Best Women&rsquo;s College Team</strong>, and (5) <strong>Overall Championship Trophy</strong>.
              </p>
            </div>

            {/* Rule 8: Results & Attendance to College PEDs */}
            <div className="regulation-card">
              <div className="reg-card-header">
                <span className="reg-norm-code">NORM 08</span>
                <span className="reg-badge-quota">PED DESK DISTRIBUTION</span>
              </div>
              <h3 className="reg-card-title">Results Bulletins &amp; Contingent Attendance</h3>
              <p className="reg-card-desc">
                Official verified competition result bulletins and contingent daily attendance certificates will be issued directly to college Physical Education Directors (PEDs) at the Directorate Control Desk and downloadable online.
              </p>
            </div>

            {/* Rule 9: Entry Fee Structure & Differential Settlement */}
            <div className="regulation-card">
              <div className="reg-card-header">
                <span className="reg-norm-code">NORM 09</span>
                <span className="reg-badge-quota">FLAT ₹400 RELAY &bull; ₹100 INDIVIDUAL</span>
              </div>
              <h3 className="reg-card-title">Transparent Fee Structure &amp; Differential Pay</h3>
              <p className="reg-card-desc">
                Individual &amp; 21km Half Marathon: <strong>₹100/entry</strong>. Reserves: <strong>FREE (₹0)</strong>. Relays: <strong>Flat ₹400 per relay team</strong> (even with 6 members: 4 runners + 2 reserves free). If colleges register more athletes later, they pay only the differential balance due. Printable official invoice with VTU &amp; ACSCE logos provided.
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
                World-class Mud track infrastructure and transit connectivity at Dr. ACS College of Engineering, Bengaluru.
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
                    <strong>8-Lane 400m Mud Track:</strong> Full polyurethane Mud surface complying with World Athletics technical specifications and ultrasonic wind gauges.
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

      {/* 7. ABOUT THE INSTITUTION & HOST PROFILE */}
      <section className="host-section" id="host-college">
        <div className="section-wrapper">

          <div className="editorial-section-header">
            <div className="editorial-header-left">
              <div className="editorial-category-tag">HOST INSTITUTION // ABOUT Dr. ACSCE</div>
              <h2 className="editorial-section-title">About the Institution</h2>
              <p className="editorial-section-desc">
                Dr. ACS College of Engineering (Dr. ACSCE), Bengaluru &bull; Autonomous Institution under VTU, Belagavi
              </p>
            </div>
            <div className="editorial-header-right">
              <span className="editorial-header-badge">ESTD. 2009 &bull; RRGI</span>
            </div>
          </div>

          {/* Main Institution Profile Card */}
          <div className="host-modern-container">
            <div>
              <div className="editorial-category-tag">MOOGAMBIGAI CHARITABLE &amp; EDUCATIONAL TRUST</div>
              <h2 className="editorial-section-title" style={{ marginBottom: '0.4rem', fontSize: '1.75rem' }}>
                Dr. ACS College of Engineering (Dr. ACSCE)
              </h2>
              <div style={{ color: '#1d4ed8', fontWeight: 700, fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Autonomous Institution under VTU, Belagavi &bull; Approved by AICTE, New Delhi &bull; NAAC &lsquo;A&rsquo; Grade &amp; NBA Accredited
              </div>

              <p style={{ color: '#334155', lineHeight: 1.7, fontSize: '0.935rem', marginBottom: '1rem' }}>
                <strong>Dr. ACS College of Engineering (Dr. ACSCE), Bengaluru</strong>, was established in <strong>2009</strong> under the aegis of the <strong>Moogambigai Charitable and Educational Trust</strong>, which was founded in <strong>1992</strong> by the visionary educationist <strong>Dr. A. C. Shanmugam</strong>, B.A., LL.B, FIMSA, FRCPS (Glasgow, UK), with the main objective of promoting higher education in Karnataka. Various professional institutions—including Medical, Dental, and Nursing colleges—function under the aegis of the Trust, collectively termed as the <strong>RajaRajeswari Group of Institutions (RRGI)</strong>.
              </p>

              <p style={{ color: '#334155', lineHeight: 1.7, fontSize: '0.935rem', marginBottom: '1rem' }}>
                The institution is an <strong>Autonomous Institution under Visvesvaraya Technological University (VTU), Belagavi</strong>, and approved by the <strong>All India Council for Technical Education (AICTE), New Delhi</strong>. Located at Kambipura, Mysore Road, Bengaluru, along the Bengaluru-Mysuru Expressway, the institution provides a conducive learning environment supported by modern infrastructure, qualified faculty members, well-equipped laboratories, and extensive facilities for academic, research, and extracurricular activities.
              </p>

              <p style={{ color: '#334155', lineHeight: 1.7, fontSize: '0.935rem', marginBottom: '1.25rem' }}>
                Dr. ACSCE is committed to imparting holistic engineering education by integrating academic knowledge, practical skills, professional ethics, innovation, entrepreneurship, and social responsibility. Its educational philosophy aligns with the vision of transforming students into technically competent professionals, innovative leaders, and responsible citizens.
              </p>

              {/* Chairperson's Motto Card */}
              <div className="host-motto-box">
                <div className="host-motto-quote">
                  &ldquo;To Create Job creators not job seekers&rdquo;
                </div>
                <div className="host-motto-author">
                  &mdash; Chairperson&rsquo;s Motto &bull; <strong>Dr. A. C. Shanmugam</strong>, Founder Chairman, Moogambigai Educational Trust &amp; RRGI
                </div>
              </div>

              {/* Quick Institutional Stats Strip */}
              <div className="host-stats-row-6">
                <div className="host-stat-box">
                  <div className="host-stat-val">2009</div>
                  <div className="host-stat-lbl">College Established</div>
                </div>
                <div className="host-stat-box">
                  <div className="host-stat-val">Autonomous</div>
                  <div className="host-stat-lbl">Under VTU Belagavi</div>
                </div>
                <div className="host-stat-box">
                  <div className="host-stat-val">NAAC &lsquo;A&rsquo;</div>
                  <div className="host-stat-lbl">Grade &amp; NBA Accredited</div>
                </div>
                <div className="host-stat-box">
                  <div className="host-stat-val">554+</div>
                  <div className="host-stat-lbl">Placement Offers</div>
                </div>
                <div className="host-stat-box">
                  <div className="host-stat-val">25 MoUs</div>
                  <div className="host-stat-lbl">Industry Collaborations</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
              <img
                src="/acsce-logo.png"
                alt="Dr. ACS College of Engineering Official Red Emblem"
                style={{ maxWidth: '100%', maxHeight: '220px', objectFit: 'contain' }}
              />
              <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                Campus #207, Kambipura, Mysore Road, Bengaluru &bull; Estd. 2009
              </div>

              {/* Institutional Fact Sheet Box */}
              <div className="host-fact-sheet">
                <div className="host-fact-row">
                  <span className="host-fact-label">Governing Trust:</span>
                  <span className="host-fact-val">Moogambigai Trust (Estd. 1992)</span>
                </div>
                <div className="host-fact-row">
                  <span className="host-fact-label">Founder Chairman:</span>
                  <span className="host-fact-val">Dr. A. C. Shanmugam</span>
                </div>
                <div className="host-fact-row">
                  <span className="host-fact-label">Group:</span>
                  <span className="host-fact-val">RajaRajeswari Group (RRGI)</span>
                </div>
                <div className="host-fact-row">
                  <span className="host-fact-label">Affiliation:</span>
                  <span className="host-fact-val">Autonomous under VTU, Belagavi</span>
                </div>
                <div className="host-fact-row">
                  <span className="host-fact-label">Approval:</span>
                  <span className="host-fact-val">AICTE, New Delhi</span>
                </div>
                <div className="host-fact-row">
                  <span className="host-fact-label">Location:</span>
                  <span className="host-fact-val">Kambipura, Mysore Rd, Bengaluru</span>
                </div>
              </div>
            </div>
          </div>

          {/* Institutional Vision & Mission Cards */}
          <div className="host-vm-grid">
            {/* Vision Card */}
            <div className="host-vm-card host-vm-vision">
              <div className="host-vm-tag">
                <span>&#x25C6;</span>
                <span>INSTITUTIONAL VISION</span>
              </div>
              <h3 className="host-vm-title">Vision</h3>
              <p className="host-vm-text">
                &ldquo;Engineering the future of the nation by transforming the students to be technically skilled managers, innovative leaders and environmentally receptive citizens.&rdquo;
              </p>
            </div>

            {/* Mission Card */}
            <div className="host-vm-card host-vm-mission">
              <div className="host-vm-tag">
                <span>&#x25C6;</span>
                <span>INSTITUTIONAL MISSION</span>
              </div>
              <h3 className="host-vm-title">Mission</h3>
              <ul className="host-vm-list">
                <li className="host-vm-item">
                  <span className="host-vm-bullet">&bull;</span>
                  <div>
                    <strong>Holistic Pedagogy &amp; Industry Integration:</strong> To implement holistic approach in curriculum and pedagogy through Industry Integrated Interactions to meet the needs of Global Engineering Environment.
                  </div>
                </li>
                <li className="host-vm-item">
                  <span className="host-vm-bullet">&bull;</span>
                  <div>
                    <strong>Employability &amp; Entrepreneurship:</strong> To develop students with knowledge, attitude and skill of employability, entrepreneurship (<em>&ldquo;Be Job creators than job seekers&rdquo;</em>), research potential and professionally ethical citizens.
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Institutional Core Values */}
          <div style={{ marginTop: '2.5rem' }}>
            <div className="editorial-section-header" style={{ marginBottom: '1.25rem' }}>
              <div className="editorial-header-left">
                <div className="editorial-category-tag">GUIDING PRINCIPLES // Dr. ACSCE</div>
                <h3 className="editorial-section-title" style={{ fontSize: '1.4rem' }}>Institutional Core Values</h3>
              </div>
            </div>
            <div className="host-core-values-grid">
              {[
                { icon: '◈', label: 'Academic Excellence', desc: 'Commitment towards continuous improvement in teaching, learning, research, and professional development.' },
                { icon: '◈', label: 'Integrity', desc: 'Maintaining ethical standards, transparency, and accountability in all institutional activities.' },
                { icon: '◈', label: 'Innovation', desc: 'Encouraging creativity, research, and technology-driven solutions.' },
                { icon: '◈', label: 'Inclusiveness', desc: 'Providing equal opportunities and a supportive learning environment for all students.' },
                { icon: '◈', label: 'Sustainability', desc: 'Promoting environmentally responsible practices and sustainable development.' },
                { icon: '◈', label: 'Leadership', desc: 'Developing future-ready professionals with strong leadership capabilities.' },
                { icon: '◈', label: 'Professional Ethics', desc: 'Building responsible engineers committed to societal welfare and national progress.' },
                { icon: '◈', label: 'Social Responsibility', desc: 'Contributing towards community development and national progress through service.' },
              ].map((val, i) => (
                <div key={i} className="host-core-value-card">
                  <div className="host-cv-icon">{val.icon}</div>
                  <div>
                    <div className="host-cv-label">{val.label}</div>
                    <div className="host-cv-desc">{val.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Institutional Achievements & Milestones */}
          <div style={{ marginTop: '2.5rem' }}>
            <div className="editorial-section-header" style={{ marginBottom: '1.25rem' }}>
              <div className="editorial-header-left">
                <div className="editorial-category-tag">MILESTONES &amp; RECOGNITION // Dr. ACSCE</div>
                <h3 className="editorial-section-title" style={{ fontSize: '1.4rem' }}>Significant Achievements &amp; Milestones</h3>
              </div>
              <div className="editorial-header-right">
                <span className="editorial-header-badge">RANKED &amp; RECOGNISED</span>
              </div>
            </div>

            {/* Achievement Scoreboard Row */}
            <div className="host-achievements-scoreboard">
              <div className="host-ach-score-box">
                <div className="host-ach-score-num">554+</div>
                <div className="host-ach-score-lbl">Placement Offers</div>
              </div>
              <div className="host-ach-score-box">
                <div className="host-ach-score-num">25</div>
                <div className="host-ach-score-lbl">Industry MoUs</div>
              </div>
              <div className="host-ach-score-box">
                <div className="host-ach-score-num">&#x20B9;1.75 Cr+</div>
                <div className="host-ach-score-lbl">Funded Research Projects</div>
              </div>
              <div className="host-ach-score-box">
                <div className="host-ach-score-num">100th</div>
                <div className="host-ach-score-lbl">DATAQUEST T-School 2026</div>
              </div>
              <div className="host-ach-score-box">
                <div className="host-ach-score-num">40+</div>
                <div className="host-ach-score-lbl">VTU Ranks (since 2018)</div>
              </div>
            </div>

            {/* Achievement Cards */}
            <div className="host-achievements-grid">
              <div className="host-ach-card">
                <div className="host-ach-card-tag">NATIONAL RECOGNITION</div>
                <h4 className="host-ach-card-title">100th Rank — DATAQUEST T-School 2026</h4>
                <p className="host-ach-card-desc">Dr. ACSCE achieved a prestigious rank in the DATAQUEST T-School Ranking 2026, recognising it as one of the Top Engineering Colleges in Bangalore and a leading technical institution in Karnataka.</p>
              </div>
              <div className="host-ach-card">
                <div className="host-ach-card-tag">ACADEMIC EXCELLENCE</div>
                <h4 className="host-ach-card-title">VTU Gold Medals &amp; University Ranks — 2026</h4>
                <p className="host-ach-card-desc">Students secured outstanding positions in the 26th VTU Convocation, including 1st ranks in Aerospace Engineering and Biomedical Engineering, along with multiple state-level university toppers across engineering disciplines.</p>
              </div>
              <div className="host-ach-card">
                <div className="host-ach-card-tag">RESEARCH &amp; INNOVATION</div>
                <h4 className="host-ach-card-title">&#x20B9;1.75 Crore+ in Funded Research Projects</h4>
                <p className="host-ach-card-desc">The institution has secured externally funded research projects exceeding ₹1.75 crore, supporting research infrastructure, innovation labs, and interdisciplinary technology projects across engineering departments.</p>
              </div>
              <div className="host-ach-card">
                <div className="host-ach-card-tag">PLACEMENTS &amp; INDUSTRY</div>
                <h4 className="host-ach-card-title">554+ Placement Offers &amp; 25 Industry MoUs</h4>
                <p className="host-ach-card-desc">Leading recruiters including Infosys, IBM, Capgemini, Tech Mahindra, Siemens, Robert Bosch, and HPE have participated in campus placements. 25 active MoUs drive internships, joint projects, and industry-oriented training programmes.</p>
              </div>
              <div className="host-ach-card">
                <div className="host-ach-card-tag">INNOVATION ECOSYSTEM</div>
                <h4 className="host-ach-card-title">Smart India Hackathon &amp; IIC Activities</h4>
                <p className="host-ach-card-desc">Active participation in Smart India Hackathon (SIH), Institution's Innovation Council (IIC) events, startup promotion, project exhibitions, and entrepreneurship development programmes that transform student ideas into viable ventures.</p>
              </div>
              <div className="host-ach-card">
                <div className="host-ach-card-tag">ACADEMIC DISCIPLINES</div>
                <h4 className="host-ach-card-title">12+ B.E./B.Tech &amp; PG Engineering Programmes</h4>
                <p className="host-ach-card-desc">Programmes in Aeronautical, Aerospace, AI &amp; ML, Biomedical, CSE (Data Science, Cyber Security, IoT), ECE, Mechanical Engineering, MCA, and postgraduate engineering — with Outcome-Based Education (OBE) framework and experiential learning.</p>
              </div>
            </div>
          </div>

          {/* Three Campus &amp; Sports Infrastructure Pillars */}
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
                  <span><strong>8-Lane Mud Track:</strong> 400m standard Mud running track with electronic lane markers, photo-finish timing mounts, and IAAF-compliant curves.</span>
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
              <li><a href="#host-college">About the Institution</a></li>
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
            &copy; All rights reserved to Fortis Technologies
          </div>
        </div>
      </footer>

    </div>
  );
}
