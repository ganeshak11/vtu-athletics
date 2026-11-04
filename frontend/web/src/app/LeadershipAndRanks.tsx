'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface LeaderItem {
  role: string;
  roleBadge: string;
  roleBadgeClass?: string;
  name: string;
  degrees: string;
  designation: string;
  organization: string;
  imageSrc: string;
  imageAlt: string;
  imageFit?: 'cover' | 'contain';
}

const CHIEF_PATRONS: LeaderItem[] = [
  {
    role: 'Chief Patron',
    roleBadge: 'CHIEF PATRON',
    roleBadgeClass: 'chief',
    name: 'Dr. Vidyashankar S.',
    degrees: 'Ph.D',
    designation: 'Hon. Vice-Chancellor',
    organization: 'Visvesvaraya Technological University (VTU), Belagavi',
    imageSrc: '/management/vidyashankar-sir.jpeg',
    imageAlt: 'Dr. Vidyashankar S., Hon. Vice-Chancellor, VTU Belagavi',
    imageFit: 'cover',
  },
  {
    role: 'Chief Patron',
    roleBadge: 'CHIEF PATRON',
    roleBadgeClass: 'chief',
    name: 'Dr. A. C. Shanmugam',
    degrees: 'B.A., LL.B, FIMSA, FRCPS (Glasgow, UK)',
    designation: 'Founder Chairman',
    organization: 'RajaRajeswari Group of Institutions (RRGI), Bengaluru',
    imageSrc: '/management/image1.jpeg',
    imageAlt: 'Dr. A. C. Shanmugam, Chief Patron & Founder Chairman, RRGI',
    imageFit: 'cover',
  },
];

const PATRONS: LeaderItem[] = [
  {
    role: 'Patron',
    roleBadge: 'PATRON',
    roleBadgeClass: 'patron',
    name: 'Dr. Prasad B. Rampure',
    degrees: 'Ph.D',
    designation: 'Registrar',
    organization: 'Visvesvaraya Technological University (VTU), Belagavi',
    imageSrc: '/management/prasanth-b-sir.jpeg',
    imageAlt: 'Dr. Prasad B. Rampure, Registrar, VTU Belagavi',
    imageFit: 'cover',
  },
  {
    role: 'Patron',
    roleBadge: 'PATRON',
    roleBadgeClass: 'patron',
    name: 'Dr. A. C. S. Arun Kumar',
    degrees: 'B.Tech (Hons), MBA, LMISTE, MIET (UK), LMCSI',
    designation: 'President',
    organization: 'RajaRajeswari Group of Institutions (RRGI), Bengaluru',
    imageSrc: '/management/image2.jpeg',
    imageAlt: 'Dr. A. C. S. Arun Kumar, President, RRGI',
    imageFit: 'cover',
  },
  {
    role: 'Patron',
    roleBadge: 'PATRON',
    roleBadgeClass: 'patron',
    name: 'Dr. Ujwal U. J.',
    degrees: 'Ph.D',
    designation: 'Registrar (Evaluation)',
    organization: 'Visvesvaraya Technological University (VTU), Belagavi',
    imageSrc: '/management/ujwal-u-j-sir.jpeg',
    imageAlt: 'Dr. Ujwal U. J., Registrar (Evaluation), VTU Belagavi',
    imageFit: 'cover',
  },
  {
    role: 'Patron',
    roleBadge: 'PATRON',
    roleBadgeClass: 'patron',
    name: 'Dr. Prashantha Nayaka G.',
    degrees: 'Ph.D',
    designation: 'Finance Officer',
    organization: 'Visvesvaraya Technological University (VTU), Belagavi',
    imageSrc: '/management/prasanth-nayak-sir.jpeg',
    imageAlt: 'Dr. Prashantha Nayaka G., Finance Officer, VTU Belagavi',
    imageFit: 'cover',
  },
  {
    role: 'Patron',
    roleBadge: 'PATRON',
    roleBadgeClass: 'patron',
    name: 'Smt. S. Lalitha Lakshmi',
    degrees: '',
    designation: 'Chairperson',
    organization: 'RajaRajeswari Group of Institutions (RRGI), Bengaluru',
    imageSrc: '/management/chairperson-rr.png',
    imageAlt: 'Smt. S. Lalitha Lakshmi, Chairperson, RRGI',
    imageFit: 'cover',
  },
  {
    role: 'Patron',
    roleBadge: 'PATRON',
    roleBadgeClass: 'patron',
    name: 'Dr. S. Vijayanand',
    degrees: 'M.Tech, Ph.D',
    designation: 'Executive Director',
    organization: 'RajaRajeswari Group of Institutions (RRGI), Bengaluru',
    imageSrc: '/management/image3.jpeg',
    imageAlt: 'Dr. S. Vijayanand, Executive Director, RRGI',
    imageFit: 'cover',
  },
];

const ORGANIZING_COMMITTEE: LeaderItem[] = [
  {
    role: 'Organizing Chairman',
    roleBadge: 'ORGANIZING CHAIRMAN',
    roleBadgeClass: 'organizing',
    name: 'Dr. Shylaja B. S.',
    degrees: 'M.Tech, Ph.D',
    designation: 'Principal',
    organization: 'Dr. ACS College of Engineering, Bengaluru',
    imageSrc: '/management/principal.png',
    imageAlt: 'Dr. Shylaja B. S., Principal, Dr. ACSCE',
    imageFit: 'contain',
  },
  {
    role: 'Director of the Meet',
    roleBadge: 'DIRECTOR OF THE MEET',
    roleBadgeClass: 'director',
    name: 'Dr. Rajesh Y. H.',
    degrees: 'M.P.Ed, Ph.D',
    designation: 'Director of Physical Education',
    organization: 'Visvesvaraya Technological University (VTU), Belagavi',
    imageSrc: '/management/rajesh-sir.jpeg',
    imageAlt: 'Dr. Rajesh Y. H., Director of Physical Education, VTU Belagavi',
    imageFit: 'cover',
  },
  {
    role: 'Organizing Secretary',
    roleBadge: 'ORGANIZING SECRETARY',
    roleBadgeClass: 'secretary',
    name: 'Mr. Devendra Naik R. S.',
    degrees: 'M.P.Ed, M.Phil',
    designation: 'Physical Education Director',
    organization: 'Dr. ACS College of Engineering, Bengaluru',
    imageSrc: '/management/devendra-nayak-sir.jpeg',
    imageAlt: 'Mr. Devendra Naik R. S., Physical Education Director, Dr. ACSCE',
    imageFit: 'cover',
  },
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
    batch: 'Batch 2021–2025 (AY 2024-2025)',
    title: 'Top 10 Ranks in VTU under B.E Program',
    subtitle: 'Outstanding state ranks across Aerospace, Biomedical & Aeronautical Engineering',
    badge: '10 VTU STATE RANKS',
    imageSrc: '/management/image4.jpeg',
    topAchievers: [
      '1st Rank (Gold Medal): Ms. Harshitha M. K — Dept. of Biomedical Engineering',
      '2nd Rank: Mr. Saaket T N — Dept. of Aerospace Engineering',
      '3rd Rank: Mr. Kandelwal Sujal Tapish — Dept. of Aerospace Engineering',
      '4th Rank: Mr. Balu S — Dept. of Aeronautical Engineering',
      '4th Rank: Ms. Banu K — Dept. of Aerospace Engineering',
      '5th Rank: Mr. Ajay Rahul K | 6th: Ms. Aishwarya A N | 7th: Ms. Sangeetha B — Aerospace',
      '4th Rank: Ms. Shirisha R | 5th: Ms. Chaithra A — Dept. of Biomedical Engineering',
    ]
  },
  {
    id: 'batch-2022-26',
    batch: 'Batch 2022–2026 (26th Convocation)',
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

interface RankEntry {
  year: string;
  summary: string;
  ranks: { dept: string; name: string; rank: string; medal?: string }[];
}

const HISTORICAL_RANKS: RankEntry[] = [
  {
    year: 'AY 2024-2025',
    summary: '10 VTU Ranks',
    ranks: [
      { dept: 'Biomedical Engg.', name: 'Harshitha M K', rank: '1st', medal: 'Gold Medal' },
      { dept: 'Aerospace Engg.', name: 'Saaket T N', rank: '2nd' },
      { dept: 'Aerospace Engg.', name: 'Kandelwal Sujal Tapish', rank: '3rd' },
      { dept: 'Aeronautical Engg.', name: 'Balu S', rank: '4th' },
      { dept: 'Aerospace Engg.', name: 'Banu K', rank: '4th' },
      { dept: 'Aerospace Engg.', name: 'Ajay Rahul K', rank: '5th' },
      { dept: 'Aerospace Engg.', name: 'Aishwarya A N', rank: '6th' },
      { dept: 'Aerospace Engg.', name: 'Sangeetha B', rank: '7th' },
      { dept: 'Biomedical Engg.', name: 'Shirisha R', rank: '4th' },
      { dept: 'Biomedical Engg.', name: 'Chaithra A', rank: '5th' },
    ]
  },
  {
    year: 'AY 2023-2024',
    summary: '7 VTU Ranks',
    ranks: [
      { dept: 'Aerospace Engg.', name: 'Poorvi M U', rank: '1st', medal: 'Gold Medal' },
      { dept: 'Aerospace Engg.', name: 'Prajwal K', rank: '2nd' },
      { dept: 'Aerospace Engg.', name: 'Pratheeksha M', rank: '3rd' },
      { dept: 'Aerospace Engg.', name: 'Mohammad Iqbal', rank: '4th' },
      { dept: 'Aerospace Engg.', name: 'Hrik Chakraborty', rank: '5th' },
      { dept: 'Aerospace Engg.', name: 'Srujana C', rank: '6th' },
      { dept: 'Biomedical Engg.', name: 'Linda Sunil', rank: '4th' },
    ]
  },
  {
    year: 'AY 2022-2023',
    summary: '12 Ranks — 2nd Top College in VTU',
    ranks: [
      { dept: 'Aerospace Engg.', name: 'Riya D S', rank: '1st', medal: 'Gold Medal' },
      { dept: 'Aerospace Engg.', name: 'Veethasmi A Kumar', rank: '2nd' },
      { dept: 'Aerospace Engg.', name: 'Spoorti G Bahaddurbandi', rank: '3rd' },
      { dept: 'Aerospace Engg.', name: 'Sangeetha G', rank: '4th' },
      { dept: 'Aerospace Engg.', name: 'Chandan Ganesh R', rank: '6th' },
      { dept: 'Aerospace Engg.', name: 'Nanda Kumar R', rank: '8th' },
      { dept: 'Aeronautical Engg.', name: 'Anju Jagadish', rank: '8th' },
      { dept: 'Aeronautical Engg.', name: 'Syed Tayeeb Ahmed', rank: '10th' },
      { dept: 'Biomedical Engg.', name: 'Indushree K P', rank: '2nd' },
      { dept: 'Biomedical Engg.', name: 'Vaishnavi B', rank: '5th' },
      { dept: 'Biomedical Engg.', name: 'Basavaraj V', rank: '6th' },
      { dept: 'Biomedical Engg.', name: 'Likitha M', rank: '7th' },
    ]
  },
  {
    year: 'AY 2021-2022',
    summary: '12 Ranks — 2nd Top College in VTU',
    ranks: [
      { dept: 'Aerospace Engg.', name: 'Swetha Shree', rank: '1st', medal: 'Gold Medal' },
      { dept: 'ECE', name: 'Swathi S', rank: '1st', medal: '7 Gold Medals' },
      { dept: 'Aerospace Engg.', name: 'Vidya Kumari M N', rank: '3rd' },
      { dept: 'Aerospace Engg.', name: 'Nithyasri BS', rank: '4th' },
      { dept: 'Aerospace Engg.', name: 'Varshith R Shetty', rank: '5th' },
      { dept: 'Aerospace Engg.', name: 'Srinidhi N S', rank: '6th' },
      { dept: 'Aerospace Engg.', name: 'Nagaraja M V', rank: '7th' },
      { dept: 'Aerospace Engg.', name: 'Priyanka L P', rank: '8th' },
      { dept: 'Biomedical Engg.', name: 'Prathiksha K', rank: '3rd' },
      { dept: 'Biomedical Engg.', name: 'Deepthi B', rank: '7th' },
      { dept: 'Biomedical Engg.', name: 'Priya K R', rank: '9th' },
      { dept: 'Aeronautical Engg.', name: 'Swikruti S Davande', rank: '8th' },
    ]
  },
  {
    year: 'AY 2020-2021',
    summary: 'Multiple VTU Ranks',
    ranks: [
      { dept: 'Aerospace Engg.', name: 'Chandu C P', rank: '1st', medal: 'Gold Medal' },
      { dept: 'Aerospace Engg.', name: 'Ajay Yalameli', rank: '2nd' },
      { dept: 'Aerospace Engg.', name: 'Dhansingh Bhandari J', rank: '3rd' },
      { dept: 'Aeronautical Engg.', name: 'Niveditha R', rank: '7th' },
      { dept: 'Biomedical Engg.', name: 'Noorena A', rank: '3rd' },
      { dept: 'Biomedical Engg.', name: 'R Navya Sree', rank: '5th' },
      { dept: 'Biomedical Engg.', name: 'Kavya S N', rank: '7th' },
      { dept: 'Biomedical Engg.', name: 'Rashmi S', rank: '9th' },
      { dept: 'Biomedical Engg.', name: 'Ananya M', rank: '10th' },
    ]
  },
  {
    year: 'AY 2019-2020',
    summary: 'VTU Ranks',
    ranks: [
      { dept: 'Aeronautical Engg.', name: 'Shaheen Shaikh', rank: '8th' },
      { dept: 'Biomedical Engg.', name: 'Susmitha Katti', rank: '9th' },
    ]
  },
  {
    year: 'AY 2018-2019',
    summary: 'VTU Ranks',
    ranks: [
      { dept: 'Aeronautical Engg.', name: 'Naveen V', rank: '4th' },
      { dept: 'Biomedical Engg.', name: 'Ragavi A R', rank: '8th' },
    ]
  },
];

export default function LeadershipAndRanks() {
  const [activeModalPoster, setActiveModalPoster] = useState<PosterItem | null>(null);
  const [activeRankYear, setActiveRankYear] = useState<string>(HISTORICAL_RANKS[0].year);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (activeModalPoster) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeModalPoster]);

  return (
    <div className="leadership-ranks-section">
      {/* 1. CHIEF PATRONS TIER */}
      <div className="leadership-subwrapper" id="chief-patrons">
        <div className="editorial-section-header">
          <div className="editorial-header-left">
            <div className="editorial-category-tag">HONORARY CHIEF PATRONS // VTU &amp; RRGI</div>
            <h3 className="editorial-section-title">Chief Patrons</h3>
            <p className="editorial-section-desc">
              Distinguished university and institutional leadership steering the 28th VTU State Level Inter-Collegiate Athletic Meet – 2026.
            </p>
          </div>
          <div className="editorial-header-right">
            <span className="editorial-header-badge" style={{ background: '#b45309', color: '#ffffff', borderColor: '#b45309' }}>CHIEF PATRONAGE</span>
          </div>
        </div>

        <div className="chief-patrons-grid">
          {CHIEF_PATRONS.map((leader, idx) => (
            <div key={idx} className="leader-card chief-patron-card">
              <div className="leader-image-box chief-image-box">
                <img
                  src={leader.imageSrc}
                  alt={leader.imageAlt}
                  className="leader-img"
                  style={{ objectFit: leader.imageFit || 'cover', objectPosition: 'top center' }}
                  loading="lazy"
                />
                <span className="leader-tag-badge chief">
                  {leader.roleBadge}
                </span>
              </div>
              <div className="leader-info">
                <h4 className="leader-name chief-name">{leader.name}</h4>
                {leader.degrees && <div className="leader-degrees">{leader.degrees}</div>}
                <div className="leader-desig chief-desig">{leader.designation}</div>
                <div className="leader-org">{leader.organization}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. PATRONS TIER */}
      <div className="leadership-subwrapper" id="patrons">
        <div className="editorial-section-header">
          <div className="editorial-header-left">
            <div className="editorial-category-tag">UNIVERSITY &amp; TRUST PATRONAGE</div>
            <h3 className="editorial-section-title">Patrons</h3>
            <p className="editorial-section-desc">
              Esteemed statutory officers of Visvesvaraya Technological University and Executive Officers of RajaRajeswari Group of Institutions.
            </p>
          </div>
          <div className="editorial-header-right">
            <span className="editorial-header-badge">PATRONS</span>
          </div>
        </div>

        <div className="patrons-grid">
          {PATRONS.map((leader, idx) => (
            <div key={idx} className="leader-card">
              <div className="leader-image-box">
                <img
                  src={leader.imageSrc}
                  alt={leader.imageAlt}
                  className="leader-img"
                  style={{ objectFit: leader.imageFit || 'cover', objectPosition: 'top center' }}
                  loading="lazy"
                />
                <span className="leader-tag-badge patron">
                  {leader.roleBadge}
                </span>
              </div>
              <div className="leader-info">
                <h4 className="leader-name">{leader.name}</h4>
                {leader.degrees && <div className="leader-degrees">{leader.degrees}</div>}
                <div className="leader-desig">{leader.designation}</div>
                <div className="leader-org">{leader.organization}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. ORGANIZING COMMITTEE & MEET DIRECTORATE */}
      <div className="leadership-subwrapper" id="organizing-committee">
        <div className="editorial-section-header">
          <div className="editorial-header-left">
            <div className="editorial-category-tag">ATHLETIC MEET SECRETARIAT // HOST &amp; VTU SPORTS DIRECTORATE</div>
            <h3 className="editorial-section-title">Organizing Committee &amp; Meet Directorate</h3>
            <p className="editorial-section-desc">
              Key executive leadership, Director of the Meet, and Organizing Secretary coordinating the state-level athletic championship.
            </p>
          </div>
          <div className="editorial-header-right">
            <span className="editorial-header-badge" style={{ background: '#047857', color: '#ffffff', borderColor: '#047857' }}>ORGANIZING EXECUTIVE</span>
          </div>
        </div>

        <div className="organizing-grid">
          {ORGANIZING_COMMITTEE.map((leader, idx) => (
            <div key={idx} className="leader-card organizing-card">
              <div className={`leader-image-box ${leader.imageFit === 'contain' ? 'crest-box' : ''}`}>
                <img
                  src={leader.imageSrc}
                  alt={leader.imageAlt}
                  className={`leader-img ${leader.imageFit === 'contain' ? 'crest-img' : ''}`}
                  style={{
                    objectFit: leader.imageFit || 'cover',
                    objectPosition: leader.imageSrc.includes('devendra') ? 'center 20%' : 'top center'
                  }}
                  loading="lazy"
                />
                <span className={`leader-tag-badge ${leader.roleBadgeClass || 'organizing'}`}>
                  {leader.roleBadge}
                </span>
              </div>
              <div className="leader-info">
                <h4 className="leader-name">{leader.name}</h4>
                {leader.degrees && <div className="leader-degrees">{leader.degrees}</div>}
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

        {/* 3. FULL HISTORICAL VTU RANK TABLE — Year-by-Year */}
        <div className="ranks-history-wrapper">
          <div className="ranks-history-header">
            <div className="editorial-category-tag" style={{ marginBottom: '0.5rem' }}>YEAR-BY-YEAR VTU RANK CHRONICLE // 2018–2025</div>
            <h3 className="ranks-history-title">Complete VTU University Rank History</h3>
            <p className="ranks-history-desc">Dr. ACSCE has consistently produced state-level toppers across engineering disciplines since 2018, with multiple Gold Medals and Top 10 State Ranks under VTU.</p>
          </div>

          <div className="ranks-year-tabs">
            {HISTORICAL_RANKS.map((entry) => (
              <button
                key={entry.year}
                type="button"
                className={"ranks-year-tab" + (activeRankYear === entry.year ? " active" : "")}
                onClick={() => setActiveRankYear(entry.year)}
              >
                <span className="tab-year">{entry.year.replace("AY ", "")}</span>
                <span className="tab-summary">{entry.summary}</span>
              </button>
            ))}
          </div>

          {HISTORICAL_RANKS.filter(e => e.year === activeRankYear).map((entry) => (
            <div key={entry.year} className="ranks-table-wrapper">
              <div className="ranks-table-heading">
                <span className="ranks-table-year-badge">{entry.year}</span>
                <span className="ranks-table-summary">{entry.summary}</span>
              </div>
              <table className="ranks-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>VTU Rank</th>
                    <th>Student Name</th>
                    <th>Department</th>
                    <th>Award</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.ranks.map((r, i) => (
                    <tr key={i} className={r.medal ? "gold-row" : ""}>
                      <td>{i + 1}</td>
                      <td><strong>{r.rank}</strong></td>
                      <td>{r.name}</td>
                      <td>{r.dept}</td>
                      <td>{r.medal ? <span className="gold-medal-badge">&#127941; {r.medal}</span> : <span>—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      {/* HIGH-RES LIGHTBOX MODAL */}
      {mounted && activeModalPoster && createPortal(
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
        </div>,
        document.body
      )}
    </div>
  );
}
