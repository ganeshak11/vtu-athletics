'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginSquad } from '@/app/actions/auth';
import Link from 'next/link';
import Image from 'next/image';
import ListOfEventsModal from '@/components/modals/ListOfEventsModal';
import HelpManualModal from '@/components/modals/HelpManualModal';
import '../login.css';

export default function SquadLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collegeCode, setCollegeCode] = useState('');
  const [gender, setGender] = useState<'men' | 'women'>('men');
  const [passphrase, setPassphrase] = useState('');
  const [showEventsModal, setShowEventsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await loginSquad(formData);
      if (res.success && res.redirectTo) {
        router.push(res.redirectTo);
        router.refresh();
      } else {
        setError(res.error || 'Authentication failed. Please check credentials.');
      }
    } catch {
      setError('An unexpected network error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto' }}>
      <div className="login-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '2.5rem 2rem', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)' }}>
        <div className="login-header" style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: '#0b2545', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', margin: '0 auto 0.75rem' }}>
            🏛️
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
            Institution Contingent Portal
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.35rem' }}>
            VTU Affiliated Colleges &bull; Athletes Delegation Desk
          </p>
        </div>

          <div className="login-body">
            {/* Quick Championship Handbook & Events Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '1.25rem' }}>
              <a
                href="/docs/vtu-28-athletic-meet-invite-letter.pdf"
                target="_blank"
                rel="noopener noreferrer"
                id="btn-login-rules-regulations"
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.65rem 0.6rem',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  color: '#0f172a',
                  fontSize: '0.8rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <span>📜</span> Rules &amp; Regulations
              </a>
              <button
                type="button"
                onClick={() => setShowEventsModal(true)}
                id="btn-login-list-of-events"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.65rem 0.6rem',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  color: '#0f172a',
                  fontSize: '0.8rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <span>🏅</span> List of Events
              </button>
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                id="btn-login-help-manual"
                style={{
                  gridColumn: '1 / -1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.7rem 0.6rem',
                  borderRadius: '8px',
                  background: '#eff6ff',
                  border: '1.5px solid #93c5fd',
                  color: '#1e3a8a',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <span>📘</span> Help Manual: How to Register (Step by Step)
              </button>
            </div>

            {error && (
              <div className="login-error-alert" id="squad-login-error" style={{ marginBottom: '1.25rem' }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form" id="squad-login-form">
              {/* Prompt 1: College Code */}
              <div>
                <label htmlFor="collegeCode" className="login-label">
                  1. College Code
                </label>
                <div className="login-input-group">
                  <input
                    id="collegeCode"
                    name="collegeCode"
                    type="text"
                    value={collegeCode}
                    onChange={(e) => setCollegeCode(e.target.value.toUpperCase())}
                    placeholder="Enter official college code (e.g. 1AH, ACSCE)"
                    required
                    className="login-input"
                    autoComplete="off"
                  />
                  {collegeCode && (
                    <button
                      type="button"
                      onClick={() => setCollegeCode('')}
                      className="login-clear-btn"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '0.35rem' }}>
                  Enter your official VTU college abbreviation code
                </span>
              </div>

              {/* Prompt 2: Division (Gender) */}
              <div>
                <label className="login-label">
                  2. Division (Gender)
                </label>
                <input type="hidden" name="gender" value={gender} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setGender('men')}
                    className="btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.8rem',
                      fontWeight: 800,
                      borderRadius: '10px',
                      background: gender === 'men' ? '#2563eb' : '#f8fafc',
                      color: gender === 'men' ? '#ffffff' : '#0f172a',
                      border: gender === 'men' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    id="btn-select-male"
                  >
                    <span>🚹</span> Boys (Men)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('women')}
                    className="btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.8rem',
                      fontWeight: 800,
                      borderRadius: '10px',
                      background: gender === 'women' ? '#7c3aed' : '#f8fafc',
                      color: gender === 'women' ? '#ffffff' : '#0f172a',
                      border: gender === 'women' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    id="btn-select-female"
                  >
                    <span>🚺</span> Girls (Women)
                  </button>
                </div>
              </div>

              {/* Prompt 3: Passphrase */}
              <div>
                <label htmlFor="passphrase" className="login-label">
                  3. Confidential Passphrase
                </label>
                <input
                  id="passphrase"
                  name="passphrase"
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="e.g. swift-falcon-84"
                  required
                  className="login-input"
                  style={{ textTransform: 'none', letterSpacing: 'normal', fontSize: '0.95rem' }}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '0.35rem' }}>
                  Confidential passphrase issued by VTU Athletics Directorate
                </span>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="login-submit-btn"
                id="btn-squad-submit"
                style={{ marginTop: '0.75rem' }}
              >
                {loading ? 'Authenticating Institution...' : 'Sign In to Institution Portal →'}
              </button>
            </form>

            <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
              VTU Directorate or Meet Official?{' '}
              <Link href="/login/admin" style={{ color: '#2563eb', fontWeight: 700 }}>
                Directorate Admin Login &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Modal: PED Help Manual */}
        <HelpManualModal
          isOpen={showHelpModal}
          onClose={() => setShowHelpModal(false)}
        />

        {/* Modal: List of Events */}
        <ListOfEventsModal
          isOpen={showEventsModal}
          onClose={() => setShowEventsModal(false)}
        />
      </div>
  );
}
