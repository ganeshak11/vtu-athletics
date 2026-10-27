import React from 'react';
import Link from 'next/link';
import './Navbar.css';

interface Props {
  portalBadge?: string;
}

export function OfficialBanner({ portalBadge }: Props) {
  return (
    <div className="univ-main-banner">
      <div className="univ-banner-inner">
        {/* Left: Host College Crest */}
        <div className="univ-left-emblem">
          <Link href="/" title="Dr. ACS College of Engineering, Bengaluru (Host)">
            <img
              src="/acsce-logo.png"
              alt="Dr. ACS College of Engineering Emblem"
              className="univ-logo-img"
            />
          </Link>
        </div>

        {/* Center: University & College Institutional Typography */}
        <div className="univ-center-titles">
          <div className="univ-kannada-name">
            ವಿಶ್ವೇಶ್ವರಯ್ಯ ತಾಂತ್ರಿಕ ವಿಶ್ವವಿದ್ಯಾಲಯ, ಬೆಳಗಾವಿ
          </div>
          <div className="univ-english-name">
            VISVESVARAYA TECHNOLOGICAL UNIVERSITY, BELAGAVI
          </div>
          <div className="univ-sub-state">
            (A State Public University of Government of Karnataka &bull; Estd. 1998)
          </div>
          <div className="univ-host-clg">
            DR. ACS COLLEGE OF ENGINEERING, BENGALURU
          </div>
          <div className="univ-accreditation-pill">
            Approved by AICTE, New Delhi &bull; Affiliated to VTU &bull; NAAC &lsquo;A&rsquo; Grade &amp; NBA Accredited
          </div>
          {portalBadge && (
            <div className="univ-meet-badge">
              {portalBadge}
            </div>
          )}
        </div>

        {/* Right: VTU University Crest */}
        <div className="univ-right-emblem">
          <Link href="/" title="Visvesvaraya Technological University (VTU) Belagavi">
            <img
              src="/vtu.png"
              alt="Visvesvaraya Technological University Official Emblem"
              className="univ-logo-img"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}
