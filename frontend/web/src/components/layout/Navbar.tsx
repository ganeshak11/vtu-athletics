'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { OfficialBanner } from './OfficialBanner';
import './Navbar.css';

export const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="univ-portal-header-wrapper">
      {/* 1 & 2. OFFICIAL TOP BANNER WITH ACSCE & VTU EMBLEMS */}
      <OfficialBanner portalBadge="26TH INTER-COLLEGIATE ATHLETICS CHAMPIONSHIP 2026 & ALL INDIA SELECTION TRIALS" />

      {/* 3. SOLID INSTITUTIONAL NAVIGATION BAR (Navy & Gold Trim) */}
      <nav className="univ-main-nav">
        <div className="univ-nav-inner">
          {/* Menu Links */}
          <div className="univ-nav-menu">
            <Link 
              href="/" 
              className={`univ-nav-link ${pathname === '/' ? 'active' : ''}`}
            >
              <span>🏛️ Home</span>
            </Link>
            <a href="#rules" className="univ-nav-link">
              <span>📜 Rules &amp; Regulations</span>
            </a>
            <a href="#schedule" className="univ-nav-link">
              <span>📅 Event Schedule</span>
            </a>
            <a href="#venue" className="univ-nav-link">
              <span>📍 Stadium &amp; Transit</span>
            </a>
            <a href="#host-college" className="univ-nav-link">
              <span>🏫 Host Institution</span>
            </a>
            <a href="#gallery" className="univ-nav-link">
              <span>🏆 Sports Heritage</span>
            </a>
          </div>

          {/* Direct Portal Access Logins */}
          <div className="univ-nav-auth">
            <Link href="/login/squad" className="univ-btn-portal univ-btn-squad" id="nav-btn-squad">
              <span>🏛️ Institution Squad Login</span>
            </Link>

            <Link href="/login/admin" className="univ-btn-portal univ-btn-admin" id="nav-btn-admin">
              <span>🛡️ Directorate Admin</span>
            </Link>

            {/* Mobile Toggle */}
            <button 
              type="button" 
              className="univ-mobile-hamburger"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle Navigation"
            >
              {isMobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </nav>

      {/* 4. SCROLLING DIRECTORATE CIRCULARS NOTICE TICKER */}
      <div className="univ-ticker-strip">
        <div className="univ-ticker-badge">
          <span className="univ-ticker-pulse" />
          <span>LIVE CIRCULARS &amp; NOTICES</span>
        </div>
        <div className="univ-ticker-content">
          <div className="univ-ticker-track">
            <span>&bull; Online squad registration portal is now active for all VTU affiliated institutions across Karnataka.</span>
            <span>&bull; Physical Education Directors must complete roster entry, event nominations, and fee verification before the deadline.</span>
            <span>&bull; Serialized bid numbers and official accreditation QR badges will be generated once registrations are locked and college payments verified.</span>
            <span>&bull; 4x100m Relay &amp; 21km Half Marathon quotas are strictly enforced per Directorate competition regulations.</span>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="univ-mobile-dropdown">
          <Link href="/" className="univ-mobile-link" onClick={() => setIsMobileMenuOpen(false)}>🏛️ Home</Link>
          <a href="#rules" className="univ-mobile-link" onClick={() => setIsMobileMenuOpen(false)}>📜 Rules &amp; Regulations</a>
          <a href="#schedule" className="univ-mobile-link" onClick={() => setIsMobileMenuOpen(false)}>📅 Event Schedule</a>
          <a href="#venue" className="univ-mobile-link" onClick={() => setIsMobileMenuOpen(false)}>📍 Stadium &amp; Transit</a>
          <a href="#host-college" className="univ-mobile-link" onClick={() => setIsMobileMenuOpen(false)}>🏫 Host Institution</a>
          <a href="#gallery" className="univ-mobile-link" onClick={() => setIsMobileMenuOpen(false)}>🏆 Sports Heritage</a>
          <div style={{ borderTop: '1px solid #1e3a8a', margin: '0.5rem 0' }} />
          <Link href="/login/squad" className="univ-mobile-link" style={{ background: '#1e3a8a', color: '#ffffff', fontWeight: 800 }} onClick={() => setIsMobileMenuOpen(false)}>
            🏛️ Institution Squad Login
          </Link>
          <Link href="/login/admin" className="univ-mobile-link" style={{ background: '#0f172a', color: '#ffffff', fontWeight: 800 }} onClick={() => setIsMobileMenuOpen(false)}>
            🛡️ Directorate Admin Login
          </Link>
        </div>
      )}
    </header>
  );
};
