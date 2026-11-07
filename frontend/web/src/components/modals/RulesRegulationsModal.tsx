'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface RuleItem {
  id: number;
  category: 'eligibility' | 'technical' | 'relay' | 'documents' | 'scoring';
  title: string;
  desc: string;
  important?: boolean;
}

const CHAMPIONSHIP_RULES: RuleItem[] = [
  {
    id: 1,
    category: 'eligibility',
    title: 'Student Eligibility Criteria',
    desc: 'Only bonafide regular students currently officially enrolled / registered / pursuing a degree from VTU Affiliated, Autonomous, Constituent Colleges & School of Architecture with a valid University Seat Number (USN) are eligible to participate.',
    important: true,
  },
  {
    id: 2,
    category: 'eligibility',
    title: 'Minimum Contingent Strength (Rule 23)',
    desc: 'A college team must consist of a minimum of 08 Athletes (Men / Women) in the team delegation to be eligible for institutional participation.',
    important: true,
  },
  {
    id: 3,
    category: 'eligibility',
    title: 'Event Entry Fees',
    desc: 'Entry fees are ₹100/- per participant per individual regular event, and flat ₹400/- for each relay squad (4x100m, 4x400m, Mixed Relay). Reserve nominations carry ₹0/- entry fee.',
  },
  {
    id: 4,
    category: 'relay',
    title: 'Event Participation Limits & Blocked Reserve',
    desc: 'An athlete can participate in any two (2) individual events and one regular relay (4x100m or 4x400m). If an athlete registers for both Event 1 and Event 2, reserve selection is strictly BLOCKED.',
    important: true,
  },
  {
    id: 5,
    category: 'relay',
    title: 'Standalone Events (Mixed Relay & Half Marathon)',
    desc: 'Every kind of relay (4x100m, 4x400m, 4x400m Mixed Relay) and the 21km Road Half Marathon can be entered as standalone disciplines. Participation in Mixed Relay and Half Marathon is common and unrestricted (does not consume the 2 individual event quota).',
    important: true,
  },
  {
    id: 6,
    category: 'relay',
    title: 'Relay Squad Size & Composition',
    desc: 'Colleges can enter up to 3 relay teams with up to 6 members per relay team (4 active runners + 2 reserves). Only 1 divisional relay team per student member is permitted. Relay substitutes can be updated until call room reporting.',
  },
  {
    id: 7,
    category: 'relay',
    title: '4x400m Mixed Relay Running Order',
    desc: 'The 4x400m Mixed Relay includes 02 Men and 02 Women participants from the same college. The mandatory running baton order is: Leg 1: Woman, Leg 2: Man, Leg 3: Woman, Leg 4: Man.',
  },
  {
    id: 8,
    category: 'relay',
    title: 'College Event Quota',
    desc: 'There shall not be more than two (2) participants in each individual event and one (1) relay team per category from a college.',
  },
  {
    id: 9,
    category: 'relay',
    title: 'Reserve Nomination Condition (Rule 36)',
    desc: 'A reserve participant should also be a participant in at least one individual event. Relay-only athletes cannot register as individual reserves.',
  },
  {
    id: 10,
    category: 'technical',
    title: 'Strict Call Room Reporting (30 Minutes)',
    desc: 'Athletes must report to the Call Room officials strictly 30 minutes before the event scheduled time. Reporting directly to technical officials on the track/field will not be entertained.',
    important: true,
  },
  {
    id: 11,
    category: 'technical',
    title: 'Track Progression Rule (Preliminary Heats)',
    desc: 'The top 2 athletes from each preliminary heat automatically advance to the Finals (Q1 and Q2). Advancement is strictly position-based; qualification is NOT based on fastest times.',
    important: true,
  },
  {
    id: 12,
    category: 'technical',
    title: 'Hurdle Height Specifications',
    desc: '110m Hurdles (Men): 1.067m (42 in); 100m Hurdles (Women): 0.838m (33 in); 400m Hurdles (Men): 0.914m (36 in); 400m Hurdles (Women): 0.762m (30 in).',
  },
  {
    id: 13,
    category: 'technical',
    title: 'Field Events Pass Protocols',
    desc: 'In Vertical Jumps (High Jump, Pole Vault), an athlete may pass at any given height. In Horizontal Jumps (Long Jump, Triple Jump) and Field Throws, an athlete may pass on any individual trial.',
  },
  {
    id: 14,
    category: 'technical',
    title: 'Uniform, Footwear & Bib Numbers',
    desc: 'Athletes must wear proper institutional sportswear and sports shoes/spikes. Transferred sportswear, casuals, or jeans are prohibited. Bib numbers must be worn on both front and back.',
  },
  {
    id: 15,
    category: 'technical',
    title: '3-Lap Overlap & Long Distance Cut-Off',
    desc: 'In the 21km Half Marathon and 20km Walk, athletes lagging more than 3 laps behind leaders will be asked to vacate the track. In 5000m and 10000m, race concludes after top 10 finishers.',
  },
  {
    id: 16,
    category: 'documents',
    title: 'Mandatory Documents for Physical Scrutiny',
    desc: 'Hard copy of Contingent Registration Report (signed by Principal with seal and PED), Entry Fee Receipt, College ID cards, Attested SSLC Marks Card (DOB proof), Attested PUC/Degree marks card, Aadhaar copy, and Medical Fitness Certificate (for Half Marathon athletes).',
    important: true,
  },
  {
    id: 17,
    category: 'scoring',
    title: 'Championship Points Scoring Matrix',
    desc: 'Team/Relay Events: 1st (Gold) = 10 pts, 2nd (Silver) = 6 pts, 3rd (Bronze) = 2 pts (awarded to the 4 running members). Individual Events: 1st = 5 pts, 2nd = 3 pts, 3rd = 1 pt. Mixed relay points count toward Overall Championship only.',
  },
  {
    id: 18,
    category: 'scoring',
    title: 'Official Championship Trophies',
    desc: 'Conferred awards: (1) Best Male Athlete, (2) Best Female Athlete, (3) Best Men’s College Team, (4) Best Women’s College Team, and (5) Overall Championship Trophy.',
  },
  {
    id: 19,
    category: 'scoring',
    title: 'Compulsory Marchpast Participation',
    desc: 'Participation of all athletes and managers in the inaugural Marchpast with their college flag and uniform is mandatory. Non-participating contingents will not be permitted in athletics events.',
    important: true,
  },
];

export default function RulesRegulationsModal({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'all' | 'eligibility' | 'relay' | 'technical' | 'documents' | 'scoring'>('all');
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const filteredRules = CHAMPIONSHIP_RULES.filter((r) => {
    const matchesTab = activeTab === 'all' || r.category === activeTab;
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.desc.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'fadeInModal 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0b2545 0%, #133a6f 100%)',
            color: '#ffffff',
            padding: '1.5rem 1.75rem',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: 'rgba(251, 191, 36, 0.15)',
                  border: '1px solid rgba(251, 191, 36, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  flexShrink: 0,
                }}
              >
                📜
              </div>
              <div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: '#fbbf24',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    display: 'block',
                  }}
                >
                  Visvesvaraya Technological University &bull; Official Handbook
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0.2rem 0 0', color: '#ffffff' }}>
                  Championship Rules &amp; Regulations
                </h2>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#cbd5e1' }}>
                  28th VTU Inter-Collegiate State Level Athletic Meet 2026 &bull; Dr. ACSCE Bengaluru
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#ffffff',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                fontSize: '1.1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close modal"
            >
              ✕
            </button>
          </div>

          {/* Filter Bar */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              marginTop: '1.25rem',
              overflowX: 'auto',
              paddingBottom: '0.25rem',
            }}
          >
            {[
              { id: 'all', label: 'All Rules' },
              { id: 'eligibility', label: 'Eligibility' },
              { id: 'relay', label: 'Relays & Quotas' },
              { id: 'technical', label: 'Technical' },
              { id: 'documents', label: 'Documents' },
              { id: 'scoring', label: 'Scoring & Awards' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                type="button"
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === tab.id ? '#fbbf24' : 'rgba(255, 255, 255, 0.12)',
                  color: activeTab === tab.id ? '#0f172a' : '#ffffff',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '0.85rem 1.75rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search rules by keyword (e.g. reserve, hurdle, quota, mixed relay, call room)..."
            style={{
              width: '100%',
              padding: '0.6rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              outline: 'none',
              background: '#ffffff',
            }}
          />
        </div>

        {/* Rules Content List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {filteredRules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
              No rules matched your search query. Try clearing the filter.
            </div>
          ) : (
            filteredRules.map((rule) => (
              <div
                key={rule.id}
                style={{
                  border: rule.important ? '1.5px solid #fed7aa' : '1px solid #e2e8f0',
                  background: rule.important ? '#fffbeb' : '#ffffff',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  gap: '0.85rem',
                  alignItems: 'flex-start',
                }}
              >
                <span
                  style={{
                    background: rule.important ? '#f59e0b' : '#0b2545',
                    color: '#ffffff',
                    borderRadius: '6px',
                    width: '26px',
                    height: '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    flexShrink: 0,
                    marginTop: '0.1rem',
                  }}
                >
                  {rule.id}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.925rem', fontWeight: 750, color: '#0f172a' }}>
                      {rule.title}
                    </h4>
                    {rule.important && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: '#b45309',
                          background: '#fef3c7',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '9999px',
                        }}
                      >
                        Mandatory
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.825rem', color: '#334155', lineHeight: 1.55 }}>
                    {rule.desc}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.75rem',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Reference: Official VTU Athletics Technical Regulations 2026
          </span>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.825rem',
                fontWeight: 600,
                color: '#0f172a',
                cursor: 'pointer',
              }}
            >
              🖨️ Print Handbook
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#0b2545',
                border: 'none',
                padding: '0.5rem 1.15rem',
                borderRadius: '8px',
                fontSize: '0.825rem',
                fontWeight: 700,
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              Got It, Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

