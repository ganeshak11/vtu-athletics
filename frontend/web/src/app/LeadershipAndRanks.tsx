'use client';

import React, { useState } from 'react';

interface LeaderItem {
  role: string;
  roleBadge: string;
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
    subtitle: 'Outstanding state ranks across Aerospace, Biomedical & Aeronautical Engineering',
    badge: '10 VTU STATE RANKS',
    imageSrc: '/management/image4.jpeg',
    topAchievers: [
      '1st Rank: Ms. Harshitha M. K (CGPA 9.41) — Dept. of Biomedical Engineering',
      '2nd Rank: Mr. T.N. Saaket (CGPA 9.39) — Dept. of Aerospace Engineering',
      '3rd Rank: Mr. Khandelwal Sujal Tapish (CGPA 9.36) — Dept. of Aerospace Engineering',
      '4th Rank: Ms. Shireesha C (CGPA 9.36) & Mr. Balu S (CGPA 9.35)',
      '5th–7th Ranks: Ms. Chaithra R, Mr. Ajay Rahul K, Ms. Aishwarya A N, Ms. Sangeetha B'
    ]
  },
  {
    id: 'batch-2022-26',
    batch: 'Batch 2022–2026',
    title: '26th Convocation — VTU Rank Holders',
    subtitle: 'State Gold Medalists and top university scorers in Autonomous BE Programs',
    badge: '26TH CONVOCATION MEDALISTS',
    imageSrc: '/management/image5.jpeg',
    topAchievers: [
      '1st Rank: Ms. Charvi R A (CGPA 9.21) — Dept. of Aerospace Engineering',
      '1st Rank: Ms. Neha Vinod P (CGPA 9.01) — Dept. of Biomedical Engineering',
      '2nd Rank: Mr. Mohd Ameen (CGPA 9.13) — Dept. of Aerospace Engineering',
      '3rd Rank: Mr. Nithish (CGPA 8.79) — Dept. of Biomedical Engineering',
      '4th–8th Ranks: Ms. Akshatha P S, Ms. Ananya S Nadig, Mr. Raghurama Sharma, Mr. Ratnakar, Ms. S. Anu Nadig'
    ]
  }
];

export default function LeadershipAndRanks() {
  const [activeModalPoster, setActiveModalPoster] = useState<PosterItem | null>(null);

  return (
    <div className="leadership-ranks-section">
      {/* 1. ORGANIZING PATRONS & LEADERSHIP */}
      <div className="leadership-subwrapper">
        <div className="editorial-section-header">
          <div className="editorial-header-left">
            <div className="editorial-category-tag">INSTITUTIONAL PATRONAGE // ACSCE &amp; RRGI</div>
            <h3 className="editorial-section-title">Organizing Patrons &amp; Leadership</h3>
            <p className="editorial-section-desc">
              Under the visionary stewardship of our Chief Patron and Executive Leadership, Dr. ACS College of Engineering hosts the 26th VTU State Athletics Championship.
            </p>
          </div>
          <div className="editorial-header-right">
            <span className="editorial-header-badge">ESTD. 1992</span>
          </div>
        </div>

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
                <span className="leader-tag-badge">
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
        <div className="editorial-section-header" style={{ borderBottomColor: '#cbd5e1' }}>
          <div className="editorial-header-left">
            <div className="editorial-category-tag">ACADEMIC DISTINCTION // VTU STATE MERIT</div>
            <h3 className="editorial-section-title">
              Dr. ACS College of Engineering &bull; Top University Ranks
            </h3>
            <p className="editorial-section-desc">
              Institutional excellence in academic engineering alongside state inter-collegiate athletic prominence under 
              <strong> Visvesvaraya Technological University (VTU)</strong>. Click any official poster to preview in high resolution.
            </p>
          </div>
          <div className="editorial-header-right">
            <span className="editorial-header-badge">VTU MERIT RECORDS</span>
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
                  <span className="overlay-btn">Inspect High-Resolution Poster</span>
                </div>
                <span className="poster-batch-badge">{poster.badge}</span>
              </div>

              <div className="rank-poster-content">
                <div className="poster-batch-label">{poster.batch}</div>
                <h4 className="poster-title">{poster.title}</h4>
                <p className="poster-subtitle">{poster.subtitle}</p>

                <div className="poster-achievers-box">
                  <div className="achievers-heading">State Rank Summary:</div>
                  <ul className="achievers-list">
                    {poster.topAchievers.map((achiever, i) => (
                      <li key={i} className="achiever-item">
                        <span className="achiever-bullet" aria-hidden="true">&bull;</span>
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
                  <span aria-hidden="true">&rarr;</span>
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
                <span aria-hidden="true">&rarr;</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
