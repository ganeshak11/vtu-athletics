'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth';

interface SquadNavProps {
  collegeName?: string;
  collegeCode?: string;
  gender: 'men' | 'women';
}

export function SquadNav({ collegeName, collegeCode, gender }: SquadNavProps) {
  const pathname = usePathname();
  const isMen = gender === 'men';

  const navLinks = [
    { href: '/squad/dashboard', label: 'Contingent Overview', icon: '📊' },
    { href: '/squad/athletes', label: 'Athlete Roster & Events', icon: '🏃' },
    { href: '/squad/relay', label: '4x100m Relay', icon: '🎽' },
    { href: '/squad/payment', label: 'Fee Settlement', icon: '💳' },
  ];

  return (
    <nav className="univ-main-nav" style={{ borderBottom: '1px solid #e2e8f0', background: 'rgba(255, 255, 255, 0.96)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 2px 10px rgba(15, 23, 42, 0.05)' }}>
      <div className="univ-nav-inner" style={{ padding: '0 2rem', minHeight: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Brand / Championship Context + Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link href="/squad/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none', flexShrink: 0 }}>
            <img src="/acsce-logo.png" alt="ACSCE" style={{ height: '34px', width: 'auto', objectFit: 'contain' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.15, letterSpacing: '-0.01em' }}>
                ACS ATHLETICS AURA
              </span>
              <span style={{ fontSize: '0.675rem', fontWeight: 800, color: '#b45309', letterSpacing: '0.04em' }}>
                CONTINGENT PORTAL &bull; 2026
              </span>
            </div>
          </Link>

          <div style={{ height: '24px', width: '1px', background: '#cbd5e1' }} />

          {/* Navigation Tabs */}
          <div className="univ-nav-menu" style={{ gap: '0.4rem', display: 'flex', alignItems: 'center' }}>
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`univ-nav-link ${isActive ? 'active' : ''}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.42rem 0.9rem',
                    fontSize: '0.85rem',
                    fontWeight: isActive ? 750 : 600,
                    color: isActive ? '#1e3a8a' : '#475569',
                    background: isActive ? '#eff6ff' : 'transparent',
                    border: isActive ? '1.5px solid #bfdbfe' : '1.5px solid transparent',
                    borderRadius: '8px',
                    transition: 'all 0.15s ease',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Institution Info & Sign Out */}
        <div className="univ-nav-auth" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#1e3a8a',
              fontSize: '0.825rem',
              fontWeight: 700,
              padding: '0.35rem 0.85rem',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <span>🏛️</span>
            <span style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {collegeName || collegeCode}
            </span>
            <span
              style={{
                background: isMen ? '#dbeafe' : '#fce7f3',
                color: isMen ? '#1e40af' : '#9d174d',
                padding: '0.15rem 0.5rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              {isMen ? "Men's Section" : "Women's Section"}
            </span>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="univ-btn-portal"
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.8rem',
                cursor: 'pointer',
                background: '#fef2f2',
                color: '#b91c1c',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                fontWeight: 700,
                transition: 'all 0.15s ease',
              }}
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
