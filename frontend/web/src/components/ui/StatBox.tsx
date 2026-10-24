import React from 'react';
import { Card, CardContent } from './Card';
import './StatBox.css';

interface StatBoxProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  accent?: 'blue' | 'emerald' | 'amber' | 'violet';
}

export const StatBox: React.FC<StatBoxProps> = ({ title, value, icon, trend, accent = 'blue' }) => {
  return (
    <Card className={`stat-box stat-accent-${accent} hover-lift`}>
      <CardContent className="stat-box-content">
        <div className="stat-box-header">
          <p className="stat-box-title">{title}</p>
          {icon && <div className="stat-box-icon">{icon}</div>}
        </div>
        <div className="stat-box-body">
          <h4 className="stat-box-value">{value}</h4>
          {trend && (
            <span className={`stat-box-trend ${trend.isPositive ? 'positive' : 'negative'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
