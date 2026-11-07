'use client';

import React, { useState } from 'react';
import { setAthleteDateOfBirthAction } from '@/app/actions/athletes';
import { validateDateOfBirth, EARLIEST_ELIGIBLE_DOB } from '@/lib/eligibility';

/**
 * Inline one-time date-of-birth entry for athletes registered before DOB was collected.
 * Works on locked rosters too (DOB affects neither events nor fees).
 */
export default function DobQuickFill({
  profileId,
  onSaved,
}: {
  profileId: string;
  onSaved: (dob: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dob, setDob] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        id={`btn-add-dob-${profileId}`}
        onClick={() => setOpen(true)}
        style={{
          marginTop: '0.25rem',
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.45)',
          color: '#92400e',
          padding: '0.15rem 0.5rem',
          borderRadius: '6px',
          fontSize: '0.72rem',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        ⚠️ DOB missing — Add
      </button>
    );
  }

  async function save() {
    setError(null);
    const msg = validateDateOfBirth(dob);
    if (msg) return setError(msg);
    setSaving(true);
    try {
      const res = await setAthleteDateOfBirthAction(profileId, dob);
      if (res.success) onSaved(dob);
      else setError(res.error || 'Could not save date of birth.');
    } catch (e: any) {
      setError(e?.message || 'Could not save date of birth.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', maxWidth: 220 }}>
      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
        <input
          type="date"
          aria-label="Date of birth"
          min={EARLIEST_ELIGIBLE_DOB}
          max={new Date().toISOString().slice(0, 10)}
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          style={{ fontSize: '0.78rem', padding: '0.2rem 0.35rem', border: '1px solid var(--border-color)', borderRadius: '6px' }}
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.55rem', borderRadius: '6px', border: 'none', background: 'var(--accent-primary)', color: '#fff', cursor: 'pointer' }}
        >
          {saving ? '…' : 'Save'}
        </button>
      </div>
      {error && <div role="alert" style={{ fontSize: '0.7rem', color: 'var(--danger, #dc2626)', fontWeight: 600 }}>{error}</div>}
    </div>
  );
}
