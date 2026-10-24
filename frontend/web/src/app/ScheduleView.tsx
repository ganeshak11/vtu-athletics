'use client';

import React from 'react';

export default function ScheduleView() {
  return (
    <div id="schedule-section-root">
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
          Official Meet Schedule
        </div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          Championship Discipline &amp; Events Order
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Host Stadium: Department of Physical Education, Dr. ACS College of Engineering, Bengaluru.
        </p>
      </div>

      <div 
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '3rem 2rem',
          textAlign: 'center',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Official Schedule Awaiting Directorate Notification
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '580px', margin: '0 auto 1.5rem', lineHeight: '1.6' }}>
          The verified 4-day athletics schedule (order of track heats, field throwing sectors, horizontal jumping pits, and call room reporting times) will be published here upon official release by the VTU Athletics Directorate.
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1.25rem', background: 'var(--bg-tertiary)', borderRadius: '9999px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <span>Venue:</span>
          <strong style={{ color: 'var(--text-primary)' }}>Dr. ACS College of Engineering Campus Track, Kambipura, Bengaluru</strong>
        </div>
      </div>
    </div>
  );
}
