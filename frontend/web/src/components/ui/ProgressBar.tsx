import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 to 100
  color?: string; // CSS color string
  height?: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  color = 'var(--accent-primary)', 
  height = '8px',
  className = ''
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div 
      className={className}
      style={{
        width: '100%',
        height,
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '9999px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${clampedProgress}%`,
          height: '100%',
          background: color,
          borderRadius: '9999px',
          transition: 'width 0.5s ease-out',
          boxShadow: `0 0 10px ${color}`
        }}
      />
    </div>
  );
};
