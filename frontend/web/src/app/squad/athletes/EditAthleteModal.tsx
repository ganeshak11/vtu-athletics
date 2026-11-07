'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { updateAthleteAction, UpdateAthleteResult } from '@/app/actions/athletes';
import { validateDateOfBirth, EARLIEST_DOB } from '@/lib/eligibility';

export interface EditableAthlete {
  id: string;
  sslc_name: string;
  usn: string;
  semester: number;
  blood_group: string;
  college_joining_date: string;
  sem_start_date: string;
  aadhaar_number?: string;
  date_of_birth?: string | null;
  photo_url?: string;
}

interface Props {
  athlete: EditableAthlete;
  onClose: () => void;
  onSaved: (updated: NonNullable<UpdateAthleteResult['athlete']>) => void;
}

/** Mirrors server validation */
const VTU_USN_REGEX = /^[1-4][A-Z]{2}\d{2}[A-Z]{2,3}\d{2,3}$/;
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const toDateInput = (v?: string) => (v ? String(v).slice(0, 10) : '');

export default function EditAthleteModal({ athlete, onClose, onSaved }: Props) {
  const [sslcName, setSslcName] = useState(athlete.sslc_name);
  const [usn, setUsn] = useState(athlete.usn);
  const [semester, setSemester] = useState(String(athlete.semester || 1));
  const [bloodGroup, setBloodGroup] = useState(athlete.blood_group || 'O+');
  const [joiningDate, setJoiningDate] = useState(toDateInput(athlete.college_joining_date));
  const [semStartDate, setSemStartDate] = useState(toDateInput(athlete.sem_start_date));
  const [aadhaarNumber, setAadhaarNumber] = useState(athlete.aadhaar_number || '');
  const [dateOfBirth, setDateOfBirth] = useState(toDateInput(athlete.date_of_birth || ''));
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !saving && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, saving]);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const okTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!okTypes.includes(file.type.toLowerCase())) {
      setError('Invalid photo format. Please upload a JPG, PNG or WebP image.');
      e.target.value = '';
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('Photo must be less than 4MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const cleanUsn = usn.trim().toUpperCase();
    const cleanAadhaar = aadhaarNumber.replace(/[\s-]/g, '');
    if (!sslcName.trim()) return setError('Full name is required.');
    if (!VTU_USN_REGEX.test(cleanUsn)) return setError(`Invalid USN '${cleanUsn}'. Enter a valid VTU USN (e.g. 1RV21CS001).`);
    if (!/^\d{12}$/.test(cleanAadhaar)) return setError('Aadhaar Number must be exactly 12 numeric digits.');
    const dobError = validateDateOfBirth(dateOfBirth);
    if (dobError) return setError(dobError);
    if (!joiningDate || !semStartDate) return setError('Both dates are required.');
    if (new Date(semStartDate) < new Date(joiningDate)) {
      return setError('Current semester start date cannot be earlier than college joining date.');
    }

    const formData = new FormData();
    formData.set('profileId', athlete.id);
    formData.set('sslcName', sslcName.trim());
    formData.set('usn', cleanUsn);
    formData.set('semester', semester);
    formData.set('bloodGroup', bloodGroup);
    formData.set('collegeJoiningDate', joiningDate);
    formData.set('semStartDate', semStartDate);
    formData.set('aadhaarNumber', cleanAadhaar);
    formData.set('dateOfBirth', dateOfBirth);
    if (photoPreview) formData.set('photoData', photoPreview);

    setSaving(true);
    try {
      const res = await updateAthleteAction(formData);
      if (res.success && res.athlete) {
        onSaved(res.athlete);
      } else {
        setError(res.error || 'Failed to update athlete.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update athlete.');
    } finally {
      setSaving(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const currentPhoto = photoPreview || athlete.photo_url;

  return createPortal(
    <div
      id="modal-edit-athlete-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: 'clamp(0.5rem, 3vw, 1.5rem)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-athlete-title"
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'var(--bg-primary, #fff)',
          borderRadius: 'var(--radius-md, 12px)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
          padding: 'clamp(1rem, 4vw, 1.75rem)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h2 id="edit-athlete-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Edit Athlete Bio-data
            </h2>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Correct identification details. To change events, remove the athlete and register again.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: 'var(--danger, #dc2626)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} id="form-edit-athlete" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div
              style={{
                width: 84,
                height: 104,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                overflow: 'hidden',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
              }}
            >
              {currentPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentPhoto} alt="Athlete photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                'No photo'
              )}
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={labelStyle} htmlFor="edit-photo">Replace Photo (optional)</label>
              <input id="edit-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} style={{ fontSize: '0.85rem' }} />
            </div>
          </div>

          <div>
            <label style={labelStyle} htmlFor="edit-name">Full Name (as per SSLC) *</label>
            <input id="edit-name" value={sslcName} onChange={(e) => setSslcName(e.target.value)} style={inputStyle} required />
          </div>

          <div style={gridStyle}>
            <div>
              <label style={labelStyle} htmlFor="edit-usn">USN *</label>
              <input
                id="edit-usn"
                value={usn}
                onChange={(e) => setUsn(e.target.value.toUpperCase())}
                style={{ ...inputStyle, textTransform: 'uppercase' }}
                required
              />
            </div>
            <div>
              <label style={labelStyle} htmlFor="edit-sem">Current Semester *</label>
              <select id="edit-sem" value={semester} onChange={(e) => setSemester(e.target.value)} style={inputStyle}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={gridStyle}>
            <div>
              <label style={labelStyle} htmlFor="edit-blood">Blood Group *</label>
              <select id="edit-blood" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} style={inputStyle}>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="edit-aadhaar">Aadhaar Number *</label>
              <input
                id="edit-aadhaar"
                value={aadhaarNumber}
                onChange={(e) => setAadhaarNumber(e.target.value.replace(/[^\d\s-]/g, ''))}
                inputMode="numeric"
                maxLength={14}
                style={inputStyle}
                required
              />
            </div>
          </div>

          <div>
            <label style={labelStyle} htmlFor="edit-dob">Date of Birth (as per SSLC) *</label>
            <input
              id="edit-dob"
              type="date"
              min={EARLIEST_DOB}
              max={today}
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <div style={gridStyle}>
            <div>
              <label style={labelStyle} htmlFor="edit-join">College Joining Date *</label>
              <input id="edit-join" type="date" max={today} value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle} htmlFor="edit-semstart">Current Sem Start Date *</label>
              <input id="edit-semstart" type="date" min={joiningDate || undefined} value={semStartDate} onChange={(e) => setSemStartDate(e.target.value)} style={inputStyle} required />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                background: 'none',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '0.7rem 1.25rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-save-athlete-edit"
              disabled={saving}
              style={{
                background: 'var(--accent-primary)',
                color: '#fff',
                border: 'none',
                padding: '0.7rem 1.5rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 800,
                cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '0.75rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: '0.35rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.95rem',
  outline: 'none',
  boxSizing: 'border-box',
};
