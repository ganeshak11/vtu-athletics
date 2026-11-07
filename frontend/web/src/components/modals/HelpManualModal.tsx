'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface Step {
  id: string;
  title: string;
  icon: string;
  body: React.ReactNode;
}

const box: React.CSSProperties = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: '0.85rem 1rem',
  margin: '0.75rem 0',
  fontSize: '0.86rem',
  lineHeight: 1.6,
};

const warn: React.CSSProperties = {
  ...box,
  background: '#fffbeb',
  border: '1px solid #fcd34d',
  color: '#78350f',
};

const danger: React.CSSProperties = {
  ...box,
  background: '#fef2f2',
  border: '1px solid #fecaca',
  color: '#7f1d1d',
};

const tip: React.CSSProperties = {
  ...box,
  background: '#ecfdf5',
  border: '1px solid #a7f3d0',
  color: '#064e3b',
};

const table: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.84rem',
  margin: '0.6rem 0',
};

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.5rem 0.65rem',
  background: '#f1f5f9',
  borderBottom: '1px solid #e2e8f0',
  color: '#334155',
  fontWeight: 700,
};

const td: React.CSSProperties = {
  padding: '0.5rem 0.65rem',
  borderBottom: '1px solid #f1f5f9',
  verticalAlign: 'top',
  color: '#0f172a',
};

const ol: React.CSSProperties = { margin: '0.4rem 0', paddingLeft: '1.3rem', lineHeight: 1.75, fontSize: '0.88rem' };

const STEPS: Step[] = [
  {
    id: 'overview',
    title: 'Overview: the 6 stages',
    icon: '🧭',
    body: (
      <>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', lineHeight: 1.6 }}>
          Registration is done by the college PED (Physical Education Director). Follow the stages in this order:
        </p>
        <ol style={ol}>
          <li><strong>Sign in</strong> with your college code, division (Boys / Girls) and passphrase.</li>
          <li><strong>Register every athlete</strong> with their events (and relay nomination, if any).</li>
          <li><strong>Build your relay teams</strong> on the Relay Teams page, if you nominated anyone for a relay.</li>
          <li><strong>Check everything.</strong> The roster can&apos;t be changed after you pay.</li>
          <li><strong>Pay the entry fee</strong> and upload the receipt with the UTR number.</li>
          <li><strong>Wait for verification</strong> by the Finance Desk, then print ID badges.</li>
        </ol>
        <div style={danger}>
          🔒 <strong>Most important rule:</strong> once you submit a payment, your roster is <strong>LOCKED</strong>. You
          can&apos;t add or remove athletes or change relay teams after that. Finish stages 2–4 completely
          before paying.
        </div>
      </>
    ),
  },
  {
    id: 'prepare',
    title: 'Before you start: keep these ready',
    icon: '📋',
    body: (
      <>
        <p style={{ margin: 0, fontSize: '0.88rem' }}>For <strong>each athlete</strong>, collect:</p>
        <table style={table}>
          <thead>
            <tr><th style={th}>Detail</th><th style={th}>Rule</th></tr>
          </thead>
          <tbody>
            <tr><td style={td}>Full name</td><td style={td}>Exactly as printed on the SSLC (10th) marks card</td></tr>
            <tr><td style={td}>USN</td><td style={td}>Valid VTU USN, e.g. <code>1RV21CS001</code>. Each USN can be registered only once in the whole championship</td></tr>
            <tr><td style={td}>Aadhaar number</td><td style={td}>Exactly 12 digits. Each Aadhaar can be registered only once in the whole championship</td></tr>
            <tr><td style={td}>Semester</td><td style={td}>Current semester (1–10)</td></tr>
            <tr><td style={td}>Blood group</td><td style={td}>e.g. O+, B−</td></tr>
            <tr><td style={td}>College joining date</td><td style={td}>Can&apos;t be a future date</td></tr>
            <tr><td style={td}>Current semester start date</td><td style={td}>Can&apos;t be earlier than the joining date</td></tr>
            <tr><td style={td}>Passport-size photo</td><td style={td}>JPG, PNG or WebP, under 4 MB, face clearly visible. <em>iPhone HEIC photos must be converted to JPG first.</em></td></tr>
            <tr><td style={td}>Events</td><td style={td}>Decide each athlete&apos;s events and relay before you start (see stage 2)</td></tr>
          </tbody>
        </table>
        <div style={tip}>
          💡 Use a laptop or desktop for the smoothest experience. Keep the photos in one folder so uploading is quick.
        </div>
      </>
    ),
  },
  {
    id: 'login',
    title: 'Stage 1: Sign in',
    icon: '🔑',
    body: (
      <>
        <ol style={ol}>
          <li>Enter your <strong>College Code</strong>, the official code given by VTU (e.g. <code>ACSCE</code>).</li>
          <li>Choose the <strong>Division</strong>: <strong>Boys (Men)</strong> or <strong>Girls (Women)</strong>.</li>
          <li>Enter the <strong>Passphrase</strong> issued by the VTU Athletics Directorate (format like <code>swift-falcon-84</code>).</li>
          <li>Click <strong>Sign In to Institution Portal</strong>.</li>
        </ol>
        <div style={box}>
          👥 <strong>Boys and Girls are separate squads.</strong> Each has its own login, roster, fee and payment. To
          register girls, sign out and sign in again with <strong>Girls (Women)</strong> selected.
        </div>
        <div style={warn}>
          ⚠️ <strong>&quot;Invalid college code, division, or passphrase&quot;?</strong> Check the code spelling and that the
          right division is selected. The passphrase includes the hyphens. If it still fails, contact the VTU Directorate.
        </div>
      </>
    ),
  },
  {
    id: 'athletes',
    title: 'Stage 2: Register athletes & events',
    icon: '🏃',
    body: (
      <>
        <ol style={ol}>
          <li>Open <strong>Athlete Roster &amp; Events</strong> from the top menu.</li>
          <li>Click <strong>+ Register New Athlete</strong>.</li>
          <li>Fill in the student details and upload the photo.</li>
          <li>Choose the athlete&apos;s events (rules below). The fee for this athlete is shown on the right.</li>
          <li>Click <strong>Register Athlete</strong>. Repeat for every athlete.</li>
        </ol>

        <h4 style={{ margin: '1rem 0 0.25rem', fontSize: '0.95rem' }}>Event rules per athlete</h4>
        <table style={table}>
          <thead>
            <tr><th style={th}>Choice</th><th style={th}>Rule</th><th style={th}>Fee</th></tr>
          </thead>
          <tbody>
            <tr><td style={td}><strong>Event 1</strong></td><td style={td}>Required, unless the athlete is entered only for a relay or the Half Marathon</td><td style={td}>₹100</td></tr>
            <tr><td style={td}><strong>Event 2</strong></td><td style={td}>Optional; must be different from Event 1. <strong>Max 2 individual events</strong> per athlete</td><td style={td}>₹100</td></tr>
            <tr><td style={td}><strong>Reserve event</strong></td><td style={td}><strong>1 reserve allowed</strong> when the athlete has at least one individual event &mdash; <strong>even with 2 events</strong>. Must be a different event</td><td style={td}>Free</td></tr>
            <tr><td style={td}><strong>Divisional relay</strong></td><td style={td}>Choose <strong>4×100m OR 4×400m</strong>, never both. Max 6 athletes per relay (4 runners + 2 reserves)</td><td style={td}>₹400 per team</td></tr>
            <tr><td style={td}><strong>4×400m Mixed relay</strong></td><td style={td}>Optional tick box. Max 6 per college (Boys + Girls together); needs at least 2 girls and 2 boys</td><td style={td}>₹400 per team (once per college)</td></tr>
            <tr><td style={td}><strong>Half Marathon (21 km)</strong></td><td style={td}>Optional tick box; can be the only event</td><td style={td}>₹100</td></tr>
          </tbody>
        </table>

        <div style={box}>
          🏫 <strong>College limit:</strong> at most <strong>2 athletes per college in any individual event</strong>.
          When an event is full it shows <em>&quot;College quota full (2/2)&quot;</em> and can&apos;t be selected.
        </div>
        <div style={warn}>
          ✏️ <strong>Made a mistake?</strong> Athlete details can&apos;t be edited. Click <strong>✕ Remove</strong> on that
          athlete and register them again. You can only do this <strong>before payment</strong>. Removing an athlete also removes them
          from all events and relay teams.
        </div>
      </>
    ),
  },
  {
    id: 'relay',
    title: 'Stage 3: Build relay teams',
    icon: '🎽',
    body: (
      <>
        <p style={{ margin: '0 0 0.4rem', fontSize: '0.88rem', lineHeight: 1.6 }}>
          Do this only if you nominated athletes for a relay in stage 2. <strong>Only nominated athletes appear here.</strong>
          Example: if 6 athletes chose 4×100m, you pick the 4 runners and up to 2 reserves from those 6. Nobody else can be added.
        </p>
        <ol style={ol}>
          <li>Open <strong>Relay Teams</strong> from the top menu.</li>
          <li>For each relay card, select a runner for <strong>all 4 legs</strong> (Leg 1 to Leg 4).</li>
          <li>Optionally select up to <strong>2 reserves</strong>.</li>
          <li>Click <strong>Save Relay Roster</strong> on that card and wait for the green &quot;saved&quot; message.</li>
        </ol>
        <table style={table}>
          <thead>
            <tr><th style={th}>Rule</th><th style={th}>Details</th></tr>
          </thead>
          <tbody>
            <tr><td style={td}>Team size</td><td style={td}>Exactly 4 runners + up to 2 reserves (max 6). A team needs at least 4 nominated athletes</td></tr>
            <tr><td style={td}>One divisional relay</td><td style={td}>An athlete can run 4×100m <strong>or</strong> 4×400m, not both</td></tr>
            <tr><td style={td}>Mixed relay order</td><td style={td}><strong>Leg 1: Girl → Leg 2: Boy → Leg 3: Girl → Leg 4: Boy</strong></td></tr>
            <tr><td style={td}>Mixed relay team</td><td style={td}>Shared by the college; girls come from the Girls squad and boys from the Boys squad. Either PED can edit it</td></tr>
          </tbody>
        </table>
        <div style={danger}>
          🔒 <strong>The mixed relay locks when EITHER squad pays.</strong> Agree on the mixed team with the other division&apos;s
          PED and save it <strong>before either of you pays</strong>.
        </div>
        <div style={box}>
          ℹ️ The payment page won&apos;t let you pay until every relay you nominated athletes for has all 4 legs saved.
        </div>
      </>
    ),
  },
  {
    id: 'review',
    title: 'Stage 4: Review before paying',
    icon: '🔍',
    body: (
      <>
        <p style={{ margin: '0 0 0.4rem', fontSize: '0.88rem' }}>Before you pay, check:</p>
        <ul style={ol}>
          <li>☐ Every athlete who will compete is registered (names, USN and photos correct).</li>
          <li>☐ Each athlete&apos;s events are correct (max 2 events, reserve only with 1 event).</li>
          <li>☐ All relay teams have 4 legs saved; the mixed relay is agreed with the other division.</li>
          <li>☐ You downloaded the <strong>Registration Report (PDF)</strong> from the Athlete Roster page for your records.</li>
        </ul>
        <h4 style={{ margin: '1rem 0 0.25rem', fontSize: '0.95rem' }}>How the fee is calculated</h4>
        <table style={table}>
          <thead>
            <tr><th style={th}>Item</th><th style={th}>Fee</th></tr>
          </thead>
          <tbody>
            <tr><td style={td}>Each individual event entry (Event 1 / Event 2)</td><td style={td}>₹100</td></tr>
            <tr><td style={td}>Reserve event</td><td style={td}>Free</td></tr>
            <tr><td style={td}>Half Marathon (per athlete)</td><td style={td}>₹100</td></tr>
            <tr><td style={td}>Each relay team (4 or 6 members, same price)</td><td style={td}>₹400 flat</td></tr>
          </tbody>
        </table>
        <div style={box}>
          🧮 <strong>Example:</strong> 10 athletes with 15 individual event entries, 4 reserves, 2 Half Marathon runners and
          a 4×100m + 4×400m team = 15×100 + 0 + 2×100 + 2×400 = <strong>₹2,500</strong>.
        </div>
      </>
    ),
  },
  {
    id: 'pay',
    title: 'Stage 5: Pay the entry fee',
    icon: '💳',
    body: (
      <>
        <ol style={ol}>
          <li>Open <strong>Fee Settlement</strong>. Note the <strong>Net Balance Due</strong>.</li>
          <li><strong>Scan the QR code</strong> shown on the page with any UPI app (GPay, PhonePe, Paytm, BHIM or your bank app), or pay to the UPI ID <code>ACSCOLLEGEOFENGINEERING@icici</code>.</li>
          <li>Type in <strong>exactly the balance amount</strong> yourself (the QR doesn&apos;t fill it in) and write your <strong>squad code</strong> in the payment note/remarks.</li>
          <li>Copy the <strong>UTR / transaction reference number</strong> from the payment receipt.</li>
          <li>On the right, fill in <strong>Amount Transferred</strong>, the <strong>UTR</strong> and upload a screenshot of the receipt.</li>
          <li>Click <strong>Submit Payment for Verification</strong> and confirm.</li>
        </ol>
        <table style={table}>
          <thead>
            <tr><th style={th}>Field</th><th style={th}>Rule</th></tr>
          </thead>
          <tbody>
            <tr><td style={td}>Amount</td><td style={td}>Whole rupees. If it doesn&apos;t match the balance you&apos;ll be warned: a short payment leaves a balance to pay later; <strong>extra payments are not refunded</strong></td></tr>
            <tr><td style={td}>UTR</td><td style={td}>8 to 30 letters/digits. Each UTR can be used only once in the whole championship</td></tr>
            <tr><td style={td}>Receipt</td><td style={td}>JPG, PNG, WebP or PDF, under 5 MB</td></tr>
          </tbody>
        </table>
        <div style={danger}>
          🔒 <strong>Your roster locks the moment you submit.</strong> You can submit only <strong>one payment at a time</strong>;
          wait for the Finance Desk to verify or reject it before submitting another.
        </div>
      </>
    ),
  },
  {
    id: 'after',
    title: 'Stage 6: After paying (status meanings)',
    icon: '✅',
    body: (
      <>
        <table style={table}>
          <thead>
            <tr><th style={th}>Status shown</th><th style={th}>Meaning</th><th style={th}>What you do</th></tr>
          </thead>
          <tbody>
            <tr><td style={td}><strong>DRAFT</strong></td><td style={td}>Not paid yet. Roster open</td><td style={td}>Finish registration, then pay</td></tr>
            <tr><td style={td}><strong>SUBMITTED</strong> 🔒</td><td style={td}>Receipt sent, waiting for the Finance Desk. Roster locked</td><td style={td}>Wait. Check this page again later</td></tr>
            <tr><td style={td}><strong>SUBMITTED</strong> with balance due</td><td style={td}>Payment verified, but it was less than the total</td><td style={td}>Pay the remaining balance and submit a new receipt</td></tr>
            <tr><td style={td}><strong>REJECTED</strong></td><td style={td}>Receipt/UTR didn&apos;t match. The reason is shown on the page</td><td style={td}>Submit again with the correct UTR and receipt. The roster stays locked</td></tr>
            <tr><td style={td}><strong>VERIFIED</strong> 🔒</td><td style={td}>Fee fully received. Registration complete</td><td style={td}>Nothing more. Print ID badges</td></tr>
          </tbody>
        </table>
        <div style={box}>
          🪪 <strong>ID Badges:</strong> open <strong>ID Badges</strong> in the top menu to print accreditation cards. Chest/bib
          numbers are given after VTU officially closes registration.
        </div>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Need a change after paying?',
    icon: '🆘',
    body: (
      <>
        <ol style={ol}>
          <li>Contact the <strong>VTU Athletics Directorate</strong> and explain the change (e.g. a missed athlete).</li>
          <li>If approved, the Directorate will do an <strong>emergency unlock</strong> of your roster.</li>
          <li>Make the change, then pay any <strong>extra balance</strong> shown on the Fee Settlement page. That payment locks the roster again.</li>
        </ol>
        <div style={warn}>
          ⏰ Once VTU <strong>closes registration</strong> for the championship, no roster changes are possible from this
          portal. Withdrawals or substitutions are handled only by the Directorate. You can still submit a pending payment.
        </div>
      </>
    ),
  },
  {
    id: 'faq',
    title: 'Common messages & fixes',
    icon: '❓',
    body: (
      <table style={table}>
        <thead>
          <tr><th style={th}>Message</th><th style={th}>What to do</th></tr>
        </thead>
        <tbody>
          <tr><td style={td}>&quot;Invalid USN&quot;</td><td style={td}>Use the full VTU USN without spaces, e.g. <code>1RV21CS001</code></td></tr>
          <tr><td style={td}>&quot;…USN / Aadhaar is already registered&quot;</td><td style={td}>This student is already registered (possibly by another college). Check the number; contact the Directorate if it&apos;s wrong</td></tr>
          <tr><td style={td}>&quot;VTU Quota Exceeded … maximum of 2 athletes&quot;</td><td style={td}>Your college already has 2 athletes in that event. Choose another event</td></tr>
          <tr><td style={td}>&quot;Quota full (6/6)&quot; on a relay</td><td style={td}>6 athletes are already nominated for that relay</td></tr>
          <tr><td style={td}>&quot;Not nominated for … Relay&quot;</td><td style={td}>Only athletes who chose that relay at registration can be placed in the team</td></tr>
          <tr><td style={td}>&quot;Complete your relay teams before paying&quot;</td><td style={td}>Go to Relay Teams and save all 4 legs for each listed relay (or remove the nominations)</td></tr>
          <tr><td style={td}>&quot;Roster Locked &amp; Payment Submitted&quot;</td><td style={td}>You already paid. Changes need an emergency unlock from the Directorate</td></tr>
          <tr><td style={td}>&quot;UTR … has already been submitted&quot;</td><td style={td}>That UTR was already used. Check you copied the correct number from <em>this</em> payment</td></tr>
          <tr><td style={td}>&quot;Invalid photo format&quot;</td><td style={td}>Convert the photo to JPG/PNG (iPhone: share the photo as JPG) and keep it under 4 MB</td></tr>
        </tbody>
      </table>
    ),
  },
];

export default function HelpManualModal({ isOpen, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [openId, setOpenId] = useState<string>('overview');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-manual-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="help-manual-modal"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #0b2545 0%, #1e3a8a 100%)', color: '#ffffff', padding: '1.35rem 1.6rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block' }}>
                PED Registration Guide
              </span>
              <h2 id="help-manual-title" style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0.2rem 0 0', color: '#ffffff' }}>
                📘 Help Manual: How to Register Your Squad
              </h2>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#cbd5e1' }}>
                Step-by-step instructions, from sign-in to verified payment. Click a section to open it.
              </p>
            </div>
            <button
              onClick={onClose}
              type="button"
              aria-label="Close help manual"
              style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: '#ffffff', width: '36px', height: '36px', borderRadius: '8px', fontSize: '1.1rem', cursor: 'pointer', flexShrink: 0 }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '1rem 1.25rem 1.25rem', color: '#0f172a' }}>
          {STEPS.map((step) => {
            const open = openId === step.id;
            return (
              <div
                key={step.id}
                style={{ border: `1px solid ${open ? '#93c5fd' : '#e2e8f0'}`, borderRadius: '12px', marginBottom: '0.65rem', overflow: 'hidden', background: '#ffffff' }}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? '' : step.id)}
                  aria-expanded={open}
                  id={`help-section-${step.id}`}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    background: open ? '#eff6ff' : '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.95rem',
                    fontWeight: 750,
                    color: '#0f172a',
                  }}
                >
                  <span style={{ width: '30px', height: '30px', borderRadius: '8px', background: open ? '#dbeafe' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                    {step.icon}
                  </span>
                  <span style={{ flex: 1 }}>{step.title}</span>
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{open ? '▲' : '▼'}</span>
                </button>
                {open && <div style={{ padding: '0.25rem 1.1rem 1rem' }}>{step.body}</div>}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #e2e8f0', padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', background: '#f8fafc' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Still stuck? Contact the VTU Athletics Directorate.
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{ background: '#0b2545', border: 'none', padding: '0.55rem 1.25rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', cursor: 'pointer' }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
