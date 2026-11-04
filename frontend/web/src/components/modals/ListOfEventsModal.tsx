'use client';

import React, { useState } from 'react';
import { OFFICIAL_CHAMPIONSHIP_EVENTS, OfficialEventDefinition } from '@/lib/championship-events';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ListOfEventsModal({ isOpen, onClose }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const categories = ['All', 'Track', 'Hurdles', 'Field Throw', 'Field Jump', 'Relay', 'Road', 'Combined'];

  const filteredEvents = OFFICIAL_CHAMPIONSHIP_EVENTS.filter((e) => {
    const matchesCat = selectedCategory === 'All' || e.category === selectedCategory;
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.sections.toLowerCase().includes(search.toLowerCase()) ||
      (e.specification && e.specification.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
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
          maxWidth: '920px',
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
            background: 'linear-gradient(135deg, #0b2545 0%, #1e3a8a 100%)',
            color: '#ffffff',
            padding: '1.5rem 1.75rem',
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
                🏅
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
                  Visvesvaraya Technological University &bull; Official Catalogue
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0.2rem 0 0', color: '#ffffff' }}>
                  Official Championship List of Events
                </h2>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#cbd5e1' }}>
                  25 Championship Disciplines &bull; 28th VTU Athletic Meet 2026 &bull; Dr. ACSCE Bengaluru
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
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                type="button"
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: selectedCategory === cat ? '#fbbf24' : 'rgba(255, 255, 255, 0.12)',
                  color: selectedCategory === cat ? '#0f172a' : '#ffffff',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat === 'All' ? 'All (25)' : cat}
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
            placeholder="🔍 Search event by name, specification, or category (e.g. 100m, hurdle, shot put, relay)..."
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

        {/* Events Table / Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.75rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #cbd5e1', background: '#f8fafc' }}>
                <th style={{ padding: '0.75rem 0.5rem', width: '55px', color: '#475569', fontWeight: 800 }}>#</th>
                <th style={{ padding: '0.75rem 0.75rem', minWidth: '180px', color: '#475569', fontWeight: 800 }}>Event Discipline</th>
                <th style={{ padding: '0.75rem 0.75rem', minWidth: '110px', color: '#475569', fontWeight: 800 }}>Category</th>
                <th style={{ padding: '0.75rem 0.75rem', minWidth: '130px', color: '#475569', fontWeight: 800 }}>Eligible Section</th>
                <th style={{ padding: '0.75rem 0.75rem', minWidth: '200px', color: '#475569', fontWeight: 800 }}>Specifications &amp; Rules</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                    No events matched your search query.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev: OfficialEventDefinition) => {
                  const isStandalone = ev.name.includes('Relay') || ev.name.includes('Half Marathon');
                  return (
                    <tr
                      key={ev.code}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        background: ev.code % 2 === 0 ? '#fafafa' : '#ffffff',
                      }}
                    >
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 800, color: '#0b2545' }}>
                        {String(ev.code).padStart(2, '0')}
                      </td>
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{ev.name}</div>
                        {isStandalone && (
                          <span
                            style={{
                              display: 'inline-block',
                              marginTop: '0.2rem',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: '#15803d',
                              background: '#dcfce7',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                            }}
                          >
                            ⭐ Standalone Discipline
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #dbeafe',
                          }}
                        >
                          {ev.category}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        <span
                          style={{
                            fontWeight: 600,
                            color:
                              ev.sections === 'Men'
                                ? '#2563eb'
                                : ev.sections === 'Women'
                                ? '#7c3aed'
                                : '#059669',
                          }}
                        >
                          {ev.sections === 'Men' && '🚹 Men Only'}
                          {ev.sections === 'Women' && '🚺 Women Only'}
                          {ev.sections === 'Men & Women' && '👥 Men & Women'}
                          {ev.sections === 'Mix Relay' && '🤝 2 Men + 2 Women'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.75rem', color: '#475569', fontSize: '0.8rem' }}>
                        {ev.specification ? (
                          <span style={{ fontWeight: 500 }}>{ev.specification}</span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>Standard IAAF/VTU rules</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
            Fee: ₹100/individual regular event &bull; ₹400/relay team &bull; Free reserve nomination
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
              🖨️ Print Catalogue
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
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

