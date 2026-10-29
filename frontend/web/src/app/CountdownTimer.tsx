'use client';

import React, { useState, useEffect } from 'react';

// Official Inaugural Ceremony Date: December 8, 2026 at 08:00 AM IST
const TARGET_DATE = new Date('2026-12-08T08:00:00+05:30');

function getTimeRemaining() {
  const now = new Date().getTime();
  const difference = TARGET_DATE.getTime() - now;

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
}

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 41, hours: 10, minutes: 0, seconds: 0 });

  useEffect(() => {
    setTimeLeft(getTimeRemaining());
    const timer = setInterval(() => {
      setTimeLeft(getTimeRemaining());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <aside className="matchday-control-deck" aria-label="Official Tournament Schedule & Live Clock">
      {/* Top Header Strip */}
      <div className="control-deck-topbar">
        <div className="control-deck-label">
          <span className="deck-indicator" aria-hidden="true" />
          <span>OFFICIAL TOURNAMENT CLOCK</span>
        </div>
        <div className="control-deck-meet-id">VTU / DPE / 2026</div>
      </div>

      {/* Main Scoreboard Clock */}
      <div className="control-deck-clock-body">
        <div className="deck-inaugural-meta">
          <span className="inaugural-title">Inaugural Track &amp; Field Ceremony</span>
          <span className="inaugural-timestamp">Dec 08, 2026 &bull; 08:00 AM IST</span>
        </div>

        <div className="scoreboard-digits-grid">
          <div className="scoreboard-cell">
            <span className="scoreboard-number">{String(timeLeft.days).padStart(2, '0')}</span>
            <span className="scoreboard-tag">DAYS</span>
          </div>
          <span className="scoreboard-sep" aria-hidden="true">:</span>
          <div className="scoreboard-cell">
            <span className="scoreboard-number">{String(timeLeft.hours).padStart(2, '0')}</span>
            <span className="scoreboard-tag">HOURS</span>
          </div>
          <span className="scoreboard-sep" aria-hidden="true">:</span>
          <div className="scoreboard-cell">
            <span className="scoreboard-number">{String(timeLeft.minutes).padStart(2, '0')}</span>
            <span className="scoreboard-tag">MINUTES</span>
          </div>
          <span className="scoreboard-sep" aria-hidden="true">:</span>
          <div className="scoreboard-cell">
            <span className="scoreboard-number">{String(timeLeft.seconds).padStart(2, '0')}</span>
            <span className="scoreboard-tag">SECONDS</span>
          </div>
        </div>
      </div>

      {/* Tournament Operational Parameters (Tabular Data) */}
      <div className="control-deck-params">
        <div className="param-row">
          <span className="param-title">Sanction Authority</span>
          <span className="param-detail">VTU Directorate of Physical Education</span>
        </div>
        <div className="param-row">
          <span className="param-title">Host Institution</span>
          <span className="param-detail">Dr. ACS College of Engineering (ACSCE)</span>
        </div>
        <div className="param-row">
          <span className="param-title">Stadium Arena</span>
          <span className="param-detail">Synthetic Track, Kambipura (NH 275)</span>
        </div>
        <div className="param-row">
          <span className="param-title">GPS Coordinates</span>
          <span className="param-detail">12.8910233° N, 77.4655618° E</span>
        </div>
      </div>

      {/* Quick Access Link */}
      <div className="control-deck-footer">
        <a href="#venue" className="deck-nav-link">
          <span>Transit Routes &amp; Stadium Navigation</span>
          <span aria-hidden="true">&rarr;</span>
        </a>
      </div>
    </aside>
  );
}
