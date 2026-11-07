'use client';

import React, { useState } from 'react';
import { updatePedContactAction } from '@/app/actions/squad';

interface Props {
  initialName: string;
  initialPhone: string;
  initialEmail: string;
}

/**
 * PED / Sports Director contact details for this squad. Shown expanded (with a warning)
 * until name + phone are filled, because the invoice, registration report and the
 * Finance Desk all rely on them — payment submission is blocked without them.
 */
export default function PedContactCard({ initialName, initialPhone, initialEmail }: Props) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState(initialEmail);
  const [saved, setSaved] = useState({ name: initialName, phone: initialPhone, email: initialEmail });
  const isComplete = Boolean(saved.name && saved.phone);
  const [editing, setEditing] = useState(!isComplete);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set('pedName', name);
      fd.set('pedPhone', phone);
      fd.set('pedEmail', email);
      const res = await updatePedContactAction(fd);
      if (res.success && res.contact) {
        const next = { name: res.contact.pedName, phone: res.contact.pedPhone, email: res.contact.pedEmail };
        setSaved(next);
        setName(next.name);
        setPhone(next.phone);
        setEmail(next.email);
        setEditing(false);
        setNotice('Contact details saved.');
      } else {
        setError(res.error || 'Failed to save contact details.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save contact details.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      id="ped-contact-card"
      style={{
        background: '#fff',
        border: `1px solid ${isComplete ? '#e2e8f0' : '#f59e0b'}`,
        borderLeft: `4px solid ${isComplete ? '#2563eb' : '#f59e0b'}`,
        borderRadius: '12px',
        padding: 'clamp(1rem, 3vw, 1.5rem)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
            PED / Sports Director Contact
          </h2>
          {!isComplete && (
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: '#b45309', fontWeight: 600 }}>
              ⚠️ Required before fee payment — used on your invoice, registration report and by the Finance Desk.
            </p>
          )}
        </div>
        {isComplete && !editing && (
          <button
            type="button"
            id="btn-edit-ped-contact"
            onClick={() => {
              setEditing(true);
              setNotice(null);
            }}
            style={{
              background: 'none',
              border: '1px solid #cbd5e1',
              color: '#2563eb',
              padding: '0.4rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ✎ Edit
          </button>
        )}
      </div>

      {notice && !editing && (
        <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#059669', fontWeight: 600 }}>{notice}</div>
      )}

      {!editing ? (
        <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', margin: '1rem 0 0' }}>
          <Field label="Name" value={saved.name} />
          <Field label="Mobile" value={saved.phone} />
          <Field label="Email" value={saved.email || '—'} />
        </dl>
      ) : (
        <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
          {error && (
            <div
              role="alert"
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#dc2626',
                padding: '0.65rem 0.9rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '0.75rem',
              }}
            >
              {error}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle} htmlFor="ped-name">Full Name *</label>
              <input id="ped-name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} autoComplete="name" required />
            </div>
            <div>
              <label style={labelStyle} htmlFor="ped-phone">Mobile Number *</label>
              <input
                id="ped-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
                inputMode="tel"
                autoComplete="tel"
                placeholder="10-digit mobile"
                required
              />
            </div>
            <div>
              <label style={labelStyle} htmlFor="ped-email">Email (optional)</label>
              <input id="ped-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} autoComplete="email" />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.9rem', flexWrap: 'wrap' }}>
            {isComplete && (
              <button
                type="button"
                onClick={() => {
                  setName(saved.name);
                  setPhone(saved.phone);
                  setEmail(saved.email);
                  setError(null);
                  setEditing(false);
                }}
                disabled={saving}
                style={{ background: 'none', border: '1px solid #cbd5e1', color: '#0f172a', padding: '0.6rem 1.1rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              id="btn-save-ped-contact"
              disabled={saving}
              style={{
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                padding: '0.6rem 1.4rem',
                borderRadius: '8px',
                fontWeight: 800,
                cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save Contact'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <dt style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</dt>
      <dd style={{ margin: '0.2rem 0 0', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', overflowWrap: 'anywhere' }}>{value}</dd>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#0f172a',
  marginBottom: '0.3rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.9rem',
  background: '#f8fafc',
  color: '#0f172a',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  fontSize: '0.95rem',
  outline: 'none',
  boxSizing: 'border-box',
};
