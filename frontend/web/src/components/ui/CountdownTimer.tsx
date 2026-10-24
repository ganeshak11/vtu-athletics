'use client';
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';

interface CountdownTimerProps {
  targetDate: string | Date;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState<{ hours: number, minutes: number, seconds: number, isPast: boolean } | null>(null);

  useEffect(() => {
    const calculateTime = () => {
      const difference = new Date(targetDate).getTime() - new Date().getTime();
      
      if (difference <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      setTimeLeft({
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isPast: false
      });
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return <span>Calculating...</span>;

  if (timeLeft.isPast) {
    return <Badge variant="danger">Deadline Passed</Badge>;
  }

  const pad = (num: number) => String(num).padStart(2, '0');

  // If less than 15 mins, flash warning color
  const isUrgent = timeLeft.hours === 0 && timeLeft.minutes < 15;

  return (
    <div style={{ 
      display: 'inline-flex', 
      gap: '0.25rem', 
      fontSize: '1.25rem', 
      fontWeight: 800,
      fontVariantNumeric: 'tabular-nums',
      color: isUrgent ? 'var(--danger)' : 'var(--accent-primary)',
      animation: isUrgent ? 'pulse 1s infinite' : 'none'
    }}>
      <span>{pad(timeLeft.hours)}</span>:
      <span>{pad(timeLeft.minutes)}</span>:
      <span>{pad(timeLeft.seconds)}</span>
    </div>
  );
};
