'use client';

import React, { useState } from 'react';

interface EventItem {
  time: string;
  callRoom: string;
  name: string;
  division: 'Men' | 'Women' | 'Both';
  stage: 'Heats' | 'Semi-Final' | 'Final';
  venue: string;
  type: 'Track' | 'Field' | 'Relay';
}

const SCHEDULE_DATA: Record<number, { title: string; date: string; events: EventItem[] }> = {
  1: {
    title: 'Day 1 — Inaugural Sprints & Field Explosiveness',
    date: 'Day 1 • Morning & Afternoon Sessions',
    events: [
      { time: '07:30 AM', callRoom: '07:05 AM', name: '100m Sprint Preliminary Heats', division: 'Men', stage: 'Heats', venue: 'Main 8-Lane Synthetic Track', type: 'Track' },
      { time: '08:15 AM', callRoom: '07:50 AM', name: '100m Sprint Preliminary Heats', division: 'Women', stage: 'Heats', venue: 'Main 8-Lane Synthetic Track', type: 'Track' },
      { time: '09:00 AM', callRoom: '08:30 AM', name: 'Long Jump Qualification & Final', division: 'Men', stage: 'Final', venue: 'Jumping Pit 1 (North Sector)', type: 'Field' },
      { time: '09:30 AM', callRoom: '09:00 AM', name: 'Shot Put (7.26 kg) Final', division: 'Men', stage: 'Final', venue: 'Throwing Ring A', type: 'Field' },
      { time: '10:15 AM', callRoom: '09:50 AM', name: '400m Heats', division: 'Men', stage: 'Heats', venue: 'Main 8-Lane Synthetic Track', type: 'Track' },
      { time: '11:00 AM', callRoom: '10:35 AM', name: '400m Heats', division: 'Women', stage: 'Heats', venue: 'Main 8-Lane Synthetic Track', type: 'Track' },
      { time: '02:30 PM', callRoom: '02:05 PM', name: '100m Semi-Finals', division: 'Men', stage: 'Semi-Final', venue: 'Main 8-Lane Synthetic Track', type: 'Track' },
      { time: '03:15 PM', callRoom: '02:50 PM', name: 'Shot Put (4.00 kg) Final', division: 'Women', stage: 'Final', venue: 'Throwing Ring A', type: 'Field' },
      { time: '04:00 PM', callRoom: '03:35 PM', name: '100m Grand Final', division: 'Women', stage: 'Final', venue: 'Main 8-Lane Synthetic Track', type: 'Track' },
      { time: '04:15 PM', callRoom: '03:50 PM', name: '100m Grand Final', division: 'Men', stage: 'Final', venue: 'Main 8-Lane Synthetic Track', type: 'Track' },
    ],
  },
  2: {
    title: 'Day 2 — Middle Distance & Horizontal Power',
    date: 'Day 2 • Morning & Afternoon Sessions',
    events: [
      { time: '07:00 AM', callRoom: '06:35 AM', name: '1500m Timed Finals', division: 'Men', stage: 'Final', venue: 'Main 8-Lane Synthetic Track', type: 'Track' },
      { time: '07:45 AM', callRoom: '07:20 AM', name: '1500m Timed Finals', division: 'Women', stage: 'Final', venue: 'Main 8-Lane Synthetic Track', type: 'Track' },
      { time: '08:30 AM', callRoom: '08:00 AM', name: 'High Jump Final (Metric Crossbar)', division: 'Men', stage: 'Final', venue: 'High Jump Fan (South D-Area)', type: 'Field' },
      { time: '09:15 AM', callRoom: '08:45 AM', name: 'Discus Throw (2.0 kg) Final', division: 'Men', stage: 'Final', venue: 'Discus Throwing Cage', type: 'Field' },
      { time: '10:00 AM', callRoom: '09:35 AM', name: '200m Sprint Heats', division: 'Men', stage: 'Heats', venue: 'Main 8-Lane Synthetic Track', type: 'Track' },
      { time: '10:45 AM', callRoom: '10:20 AM', name: '200m Sprint Heats', division: 'Women', stage: 'Heats', venue: 'Main 8-Lane Synthetic Track', type: 'Track' },
      { time: '03:00 PM', callRoom: '02:30 PM', name: 'Long Jump Qualification & Final', division: 'Women', stage: 'Final', venue: 'Jumping Pit 1', type: 'Field' },
      { time: '03:45 PM', callRoom: '03:20 PM', name: '400m Grand Finals', division: 'Women', stage: 'Final', venue: 'Main 8-Lane Synthetic Track', type: 'Track' },
      { time: '04:00 PM', callRoom: '03:35 PM', name: '400m Grand Finals', division: 'Men', stage: 'Final', venue: 'Main 8-Lane Synthetic Track', type: 'Track' },
    ],
  },
  3: {
    title: 'Day 3 — Hurdles & Strategic Leaps',
    date: 'Day 3 • Morning & Afternoon Sessions',
    events: [
      { time: '07:30 AM', callRoom: '07:05 AM', name: '110m Hurdles Final', division: 'Men', stage: 'Final', venue: 'Main 8-Lane Synthetic Track', type: 'Track' },
      { time: '08:00 AM', callRoom: '07:35 AM', name: '100m Hurdles Final', division: 'Women', stage: 'Final', venue: 'Main 8-Lane Synthetic Track', type: 'Track' },
      { time: '08:45 AM', callRoom: '08:15 AM', name: 'Javelin Throw (800g) Final', division: 'Men', stage: 'Final', venue: 'Javelin Runway & Sector', type: 'Field' },
      { time: '09:30 AM', callRoom: '09:00 AM', name: 'Triple Jump Final', division: 'Women', stage: 'Final', venue: 'Jumping Pit 2', type: 'Field' },
      { time: '10:15 AM', callRoom: '09:50 AM', name: '800m Heats', division: 'Men', stage: 'Heats', venue: 'Main 8-Lane Synthetic Track', type: 'Track' },
      { time: '11:00 AM', callRoom: '10:35 AM', name: '800m Heats', division: 'Women', stage: 'Heats', venue: 'Main 8-Lane Synthetic Track', type: 'Track' },
      { time: '03:00 PM', callRoom: '02:30 PM', name: 'Discus Throw (1.0 kg) Final', division: 'Women', stage: 'Final', venue: 'Discus Throwing Cage', type: 'Field' },
      { time: '03:45 PM', callRoom: '03:20 PM', name: '200m Grand Final', division: 'Women', stage: 'Final', venue: 'Main 8-Lane Synthetic Track', type: 'Track' },
      { time: '04:00 PM', callRoom: '03:35 PM', name: '200m Grand Final', division: 'Men', stage: 'Final', venue: 'Main 8-Lane Synthetic Track', type: 'Track' },
    ],
  },
  4: {
    title: 'Day 4 — Endurance, Relays & Championship Valedictory',
    date: 'Day 4 • Final Championship Decider',
    events: [
      { time: '06:00 AM', callRoom: '05:30 AM', name: '21km Half Marathon (Campus Highway Loop)', division: 'Men', stage: 'Final', venue: 'Main Gate Start / Stadium Finish', type: 'Track' },
      { time: '06:15 AM', callRoom: '05:45 AM', name: '21km Half Marathon (Campus Highway Loop)', division: 'Women', stage: 'Final', venue: 'Main Gate Start / Stadium Finish', type: 'Track' },
      { time: '08:30 AM', callRoom: '08:00 AM', name: 'Triple Jump Final', division: 'Men', stage: 'Final', venue: 'Jumping Pit 1', type: 'Field' },
      { time: '09:15 AM', callRoom: '08:45 AM', name: 'Javelin Throw (600g) Final', division: 'Women', stage: 'Final', venue: 'Javelin Runway & Sector', type: 'Field' },
      { time: '10:00 AM', callRoom: '09:35 AM', name: '4x100m Baton Relay Preliminaries', division: 'Women', stage: 'Heats', venue: 'Main 8-Lane Synthetic Track', type: 'Relay' },
      { time: '10:45 AM', callRoom: '10:20 AM', name: '4x100m Baton Relay Preliminaries', division: 'Men', stage: 'Heats', venue: 'Main 8-Lane Synthetic Track', type: 'Relay' },
      { time: '02:30 PM', callRoom: '02:05 PM', name: '4x400m Baton Relay Timed Finals', division: 'Women', stage: 'Final', venue: 'Main 8-Lane Synthetic Track', type: 'Relay' },
      { time: '03:15 PM', callRoom: '02:50 PM', name: '4x400m Baton Relay Timed Finals', division: 'Men', stage: 'Final', venue: 'Main 8-Lane Synthetic Track', type: 'Relay' },
      { time: '04:00 PM', callRoom: '03:35 PM', name: '4x100m Grand Final', division: 'Women', stage: 'Final', venue: 'Main 8-Lane Synthetic Track', type: 'Relay' },
      { time: '04:20 PM', callRoom: '03:55 PM', name: '4x100m Grand Final', division: 'Men', stage: 'Final', venue: 'Main 8-Lane Synthetic Track', type: 'Relay' },
      { time: '05:00 PM', callRoom: '04:45 PM', name: 'Championship Rolling Trophy Valedictory Ceremony', division: 'Both', stage: 'Final', venue: 'Podium & Grandstand', type: 'Relay' },
    ],
  },
};

export default function ScheduleView() {
  const [activeDay, setActiveDay] = useState(1);
  const [filterType, setFilterType] = useState<'All' | 'Track' | 'Field' | 'Relay'>('All');

  const currentDayData = SCHEDULE_DATA[activeDay];
  const filteredEvents = currentDayData.events.filter(
    (ev) => filterType === 'All' || ev.type === filterType
  );

  return (
    <div id="schedule-section-root" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Day Selector Pills & Category Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Day Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', background: '#ffffff', padding: '0.35rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          {[1, 2, 3, 4].map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setActiveDay(day)}
              style={{
                padding: '0.55rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                background: activeDay === day ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
                color: activeDay === day ? '#ffffff' : '#475569',
                fontWeight: activeDay === day ? 800 : 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: activeDay === day ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
              }}
            >
              Day {day}
            </button>
          ))}
        </div>

        {/* Discipline Filter */}
        <div style={{ display: 'flex', gap: '0.4rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
          {(['All', 'Track', 'Field', 'Relay'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterType(cat)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                background: filterType === cat ? '#ffffff' : 'transparent',
                color: filterType === cat ? '#0f172a' : '#64748b',
                fontWeight: filterType === cat ? 700 : 500,
                fontSize: '0.8rem',
                cursor: 'pointer',
                boxShadow: filterType === cat ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Day Headline */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', boxShadow: '0 2px 10px rgba(15,23,42,0.03)' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            {currentDayData.title}
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            {currentDayData.date} &bull; Dr. ACS College Synthetic Track Stadium
          </p>
        </div>
        <div style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.35rem 0.85rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>
          {filteredEvents.length} Scheduled Events
        </div>
      </div>

      {/* Events Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
        {filteredEvents.map((ev, idx) => (
          <div
            key={idx}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.2rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '0.85rem',
              boxShadow: '0 2px 8px rgba(15,23,42,0.02)',
              transition: 'all 0.2s ease',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                  ⏰ {ev.time}
                </span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    background: ev.stage === 'Final' ? '#fef3c7' : '#f1f5f9',
                    color: ev.stage === 'Final' ? '#b45309' : '#475569',
                    border: ev.stage === 'Final' ? '1px solid #fde68a' : '1px solid #e2e8f0',
                  }}
                >
                  {ev.stage}
                </span>
              </div>

              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3, margin: '0 0 0.35rem' }}>
                {ev.name}
              </h4>

              <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>📍 {ev.venue}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <span style={{ fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px', background: ev.division === 'Men' ? '#dbeafe' : ev.division === 'Women' ? '#fce7f3' : '#e0e7ff', color: ev.division === 'Men' ? '#1e40af' : ev.division === 'Women' ? '#9d174d' : '#3730a3' }}>
                  {ev.division}
                </span>
                <span style={{ fontWeight: 600, padding: '0.15rem 0.45rem', borderRadius: '4px', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
                  {ev.type}
                </span>
              </div>

              <span style={{ color: '#b45309', fontWeight: 600 }}>
                Call Room: {ev.callRoom}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
