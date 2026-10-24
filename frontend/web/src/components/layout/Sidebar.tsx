'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './Sidebar.css';

const menuItems = [
  { name: 'Dashboard', path: '/admin', icon: '📊' },
  { name: 'Accreditation Desk', path: '/admin/accreditation', icon: '🎫' },
  { name: 'Printable ID Badges', path: '/admin/id-cards', icon: '🪪' },
  { name: 'Heat Seeding', path: '/admin/events/heats', icon: '⚡' },
  { name: 'Events & Schedule', path: '/admin/events/schedule', icon: '📅' },
  { name: 'Official Results Engine', path: '/referee/results', icon: '⏱️' },
  { name: 'Call Room Marshalling', path: '/referee', icon: '📋' },
  { name: 'Athletes Management', path: '/admin/athletes', icon: '🏃' },
  { name: 'Hostel Desk (Warden)', path: '/warden', icon: '🏢' },
  { name: 'Canteen Food Scanner', path: '/volunteer', icon: '🍽️' },
  { name: 'Live Results Feed', path: '/live', icon: '🔴' },
  { name: 'Championship Leaderboard', path: '/leaderboard', icon: '🏆' },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-header" style={{ padding: '1.5rem 1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/vtu.png" alt="VTU Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }}></div>
          <img src="/acsce-logo.png" alt="Dr. ACSCE Logo" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
        </div>
        <div>
          <h2 className="sidebar-title" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>Meet Admin Desk</h2>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Dr. ACSCE Operations</span>
        </div>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || (pathname.startsWith(item.path) && item.path !== '/admin');
          return (
            <Link 
              key={item.name} 
              href={item.path}
              className={`sidebar-link ${isActive ? 'active' : ''} hover-lift`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
