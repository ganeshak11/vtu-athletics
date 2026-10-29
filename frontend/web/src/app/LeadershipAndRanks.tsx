'use client';

import React, { useState } from 'react';

interface LeaderItem {
  role: string;
  roleBadge: string;
  badgeBg: string;
  name: string;
  degrees: string;
  designation: string;
  organization: string;
  imageSrc: string;
  imageAlt: string;
}

const LEADERS: LeaderItem[] = [
  {
    role: 'Chief Patron',
    roleBadge: 'CHIEF PATRON',
    badgeBg: '#1e3a8a',
    name: 'Dr. A. C. Shanmugam',
    degrees: 'B.A., LL.B, FIMSA, FRCPS (Glasgow, UK)',
    designation: 'Founder Chairman',
    organization: 'Dr. M.G.R. Educational & Research Institute, Chennai & Rajarajeswari Group of Institutions (RRGI), Bengaluru',
    imageSrc: '/management/image1.jpeg',
    imageAlt: 'Dr. A.C. Shanmugam, Chief Patron & Founder Chairman'
  },
  {
    role: 'Patron',
    roleBadge: 'PATRON',
    badgeBg: '#d97706',
    name: 'Sri. A. C. S. ArunKumar',
    degrees: 'B.Tech (Hons), LMISTE, MIET (UK), LMCSI',
    designation: 'President',
    organization: 'Dr. M.G.R. Educational & Research Institute, Chennai & Rajarajeswari Group of Institutions (RRGI), Bengaluru',
    imageSrc: '/management/image2.jpeg',
    imageAlt: 'Sri. A.C.S. ArunKumar, Patron & President'
  },
  {
    role: 'Executive Director',
    roleBadge: 'EXECUTIVE DIRECTOR',
    badgeBg: '#059669',
    name: 'Dr. S. Vijayanand',
    degrees: 'M.Tech, Ph.D',
    designation: 'Executive Director',
    organization: 'Rajarajeswari Group of Institutions (RRGI), Bengaluru',
    imageSrc: '/management/image3.jpeg',
    imageAlt: 'Dr. S. Vijayanand, Executive Director, RRGI'
  }
];

interface PosterItem {
  id: string;
  batch: string;
  title: string;
  subtitle: string;
  badge: string;
  imageSrc: string;
  topAchievers: string[];
}

const RANK_POSTERS: PosterItem[] = [
  {
    id: 'batch-2021-25',
    batch: 'Batch 2021–2025',
    title: 'Top 10 Ranks in VTU under B.E Program',
    subtitle: 'Outstanding performance across Aerospace, Biomedical & Aeronautical Engineering',
    badge: '🥇 10 VTU UNIVERSITY RANKS',
    imageSrc: '/management/image4.jpeg',
    topAchievers: [
      '1st Rank: Ms. Harshitha M. K (CGPA 9.41) — Dept. of BME',
      '2nd Rank: Mr. T.N. Saaket (CGPA 9.39) — Dept. of ASE',
      '3rd Rank: Mr. Khandelwal Sujal Tapish (CGPA 9.36) — Dept. of ASE',
      '4th Rank: Ms. Shireesha C (CGPA 9.36) & Mr. Balu S (CGPA 9.35)',
      '5th–7th Ranks: Ms. Chaithra R, Mr. Ajay Rahul K, Ms. Aishwarya, Ms. Sangeetha'
    ]
  },
  {
    id: 'batch-2022-26',
    batch: 'Batch 2022–2026',
    title: '26th Convocation — VTU Rank Holders',
    subtitle: 'State Gold Medalists and top university scorers in Autonomous BE Programs',
    badge: '🎖️ 26TH CONVOCATION MEDALISTS',
    imageSrc: '/management/image5.jpeg',
    topAchievers: [
      '1st Rank: Ms. Charvi R A (CGPA 9.21) — Dept. of ASE',
      '1st Rank: Ms. Neha Vinod P (CGPA 9.01) — Dept. of BME',
      '2nd Rank: Mr. Mohd Ameen (CGPA 9.13) — Dept. of ASE',
      '3rd Rank: Mr. Nithish (CGPA 8.79) — Dept. of BME',
      '4th–8th Ranks: Ms. Akshatha, Ms. Ananya, Mr. Raghurama, Mr. Ratnakar, Ms. S. Anu Nadig'
    ]
  }
];

export default function LeadershipAndRanks() {
  const [activeModalPoster, setActiveModalPoster] = useState<PosterItem | null>(null);

  return (
    <div className="leadership-ranks-section">
      {/* 1. ORGANIZING PATRONS & LEADERSHIP */}
      <div className="leadership-subwrapper">
        <div className="section-eyebrow" style={{ textAlign: 'center', display: 'block', marginBottom: '0.45rem' }}>
          CHAMPIONSHIP PATRONAGE &bull; DR. ACS COLLEGE OF ENGINEERING &amp; RRGI
        </div>
        <h3 className="section-title-clean" style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
          Organizing Patrons &amp; Institutional Leadership
        </h3>
        <p style={{ textAlign: 'center', color: '#475569', maxWidth: '780px', margin: '0 auto 2.25rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Under the visionary stewardship of our Chief Patron and Executive Leadership, Dr. ACS College of Engineering hosts the 26th VTU State Athletics Championship with state-of-the-art sports infrastructure and collegiate hospitality.
        </p>

        <div className="leaders-grid">
          {LEADERS.map((leader, idx) => (
            <div key={idx} className="leader-card">
              <div className="leader-image-box">
                <img
                  src={leader.imageSrc}
                  alt={leader.imageAlt}
                  className="leader-img"
                  loading="lazy"
                />
                <span
                  className="leader-badge-floating"
                  style={{ background: leader.badgeBg }}
                >
                  {leader.roleBadge}
                </span>
              </div>
              <div className="leader-info">
                <h4 className="leader-name">{leader.name}</h4>
                <div className="leader-degrees">{leader.degrees}</div>
                <div className="leader-desig">{leader.designation}</div>
                <div className="leader-org">{leader.organization}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. ACADEMIC EXCELLENCE & VTU UNIVERSITY RANK HOLDERS */}
      <div className="ranks-subwrapper" id="vtu-rank-holders">
        <div className="ranks-header-block">
          <div className="ranks-header-left">
            <span className="ranks-header-badge">🏅 VTU STATE RANK HOLDERS &bull; ACADEMIC EXCELLENCE</span>
            <h3 className="ranks-header-title">
              Dr. ACS College of Engineering &bull; Top University Ranks
            </h3>
            <p className="ranks-header-desc">
              Pioneering excellence in both inter-university athletic sports and academic distinction under 
              <strong> Visvesvaraya Technological University (VTU)</strong>. Click any official poster to preview in high resolution.
            </p>
          </div>
        </div>

        <div className="rank-posters-grid">
          {RANK_POSTERS.map((poster) => (
            <div key={poster.id} className="rank-poster-card">
              <div
                className="rank-poster-image-box"
                onClick={() => setActiveModalPoster(poster)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setActiveModalPoster(poster); }}
                title="Click to view full high-resolution university poster"
              >
                <img
                  src={poster.imageSrc}
                  alt={poster.title}
                  className="rank-poster-img"
                  loading="lazy"
                />
                <div className="poster-hover-overlay">
                  <span className="overlay-btn">🔍 View Full Poster</span>
                </div>
                <span className="poster-batch-badge">{poster.badge}</span>
              </div>

              <div className="rank-poster-content">
                <div className="poster-batch-label">{poster.batch}</div>
                <h4 className="poster-title">{poster.title}</h4>
                <p className="poster-subtitle">{poster.subtitle}</p>

                <div className="poster-achievers-box">
                  <div className="achievers-heading">Key Rank Highlights:</div>
                  <ul className="achievers-list">
                    {poster.topAchievers.map((achiever, i) => (
                      <li key={i} className="achiever-item">
                        <span className="achiever-bullet">★</span>
                        <span>{achiever}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  className="btn-view-poster"
                  onClick={() => setActiveModalPoster(poster)}
                >
                  <span>View Official VTU Merit Poster</span>
                  <span>↗</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* HIGH-RES LIGHTBOX MODAL */}
      {activeModalPoster && (
        <div 
          className="poster-modal-backdrop"
          onClick={() => setActiveModalPoster(null)}
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="poster-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="poster-modal-header">
              <div>
                <span className="poster-modal-badge">{activeModalPoster.badge}</span>
                <h4 className="poster-modal-title">{activeModalPoster.title} ({activeModalPoster.batch})</h4>
              </div>
              <button
                type="button"
                className="poster-modal-close-btn"
                onClick={() => setActiveModalPoster(null)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <div className="poster-modal-body">
              <img
                src={activeModalPoster.imageSrc}
                alt={activeModalPoster.title}
                className="poster-modal-full-img"
              />
            </div>

            <div className="poster-modal-footer">
              <div style={{ fontSize: '0.825rem', color: '#64748b' }}>
                Affiliated to VTU, Belagavi &bull; Approved by AICTE, New Delhi &bull; NAAC &lsquo;A&rsquo; Accredited
              </div>
              <a
                href={activeModalPoster.imageSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-open-original"
              >
                <span>Open Raw Image</span>
                <span>↗</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
