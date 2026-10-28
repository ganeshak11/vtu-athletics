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
    // Initial sync
    setTimeLeft(getTimeRemaining());

    const timer = setInterval(() => {
      setTimeLeft(getTimeRemaining());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hero-countdown-card">
      <div className="countdown-eyebrow">
        <span className="countdown-live-badge">⏱️ COUNTDOWN TO INAUGURAL CEREMONY</span>
        <span className="countdown-date">December 8, 2026 • 08:00 AM</span>
      </div>
      <div className="countdown-units-grid">
        <div className="countdown-unit">
          <span className="unit-number">{String(timeLeft.days).padStart(2, '0')}</span>
          <span className="unit-label">DAYS</span>
        </div>
        <span className="countdown-divider">:</span>
        <div className="countdown-unit">
          <span className="unit-number">{String(timeLeft.hours).padStart(2, '0')}</span>
          <span className="unit-label">HOURS</span>
        </div>
        <span className="countdown-divider">:</span>
        <div className="countdown-unit">
          <span className="unit-number">{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span className="unit-label">MINUTES</span>
        </div>
        <span className="countdown-divider">:</span>
        <div className="countdown-unit">
          <span className="unit-number">{String(timeLeft.seconds).padStart(2, '0')}</span>
          <span className="unit-label">SECONDS</span>
        </div>
      </div>
      <div className="countdown-footer-msg">
        🏆 ACS ATHLETICS AURA 2026 &bull; 26th VTU State Athletics Championship &bull; All India Selections
      </div>
    </div>
  );
}
