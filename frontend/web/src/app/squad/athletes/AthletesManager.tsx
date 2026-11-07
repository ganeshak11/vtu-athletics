'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { addAthleteAction, deleteAthleteAction } from '@/app/actions/athletes';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatBox } from '@/components/ui/StatBox';
import { Button } from '@/components/ui/Button';
import { DB_CODE_TO_OFFICIAL_MAP } from '@/lib/championship-events';
import RegistrationReportModal from '@/components/invoice/RegistrationReportModal';
import EditAthleteModal from './EditAthleteModal';
import Link from 'next/link';
import Image from 'next/image';

interface EventItem {
  id: string;
  name: string;
  code: string;
  category: string;
}

interface RegistrationItem {
  id: string;
  kind: 'regular' | 'reserve' | 'relay' | 'half_marathon';
  event_id: string;
  events?: EventItem;
}

interface AthleteItem {
  id: string;
  sslc_name: string;
  usn: string;
  semester: number;
  blood_group: string;
  college_joining_date: string;
  sem_start_date: string;
  aadhaar_number?: string;
  photo_url?: string;
  bid_number?: number;
  accreditation_status: string;
  registrations: RegistrationItem[];
}

interface Props {
  initialAthletes: AthleteItem[];
  availableEvents: EventItem[];
  rosterLocked: boolean;
  squadCode: string;
  gender: 'men' | 'women';
  relayCount?: number;
  collegeName?: string;
  paymentStatus?: string;
  registrationClosed?: boolean;
  lateEntryOpen?: boolean;
}

/** Official VTU USN pattern, e.g. 1RV21CS001, 4MT22MBA05 (mirrors server validation) */
const VTU_USN_REGEX = /^[1-4][A-Z]{2}\d{2}[A-Z]{2,3}\d{2,3}$/;

export default function AthletesManager({
  initialAthletes,
  availableEvents,
  rosterLocked,
  squadCode,
  gender,
  relayCount: initialRelayCount = 0,
  collegeName = 'Affiliated Institution',
  paymentStatus = 'DRAFT',
  registrationClosed = false,
  lateEntryOpen = false,
}: Props) {
  const [athletes, setAthletes] = useState<AthleteItem[]>(initialAthletes);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<AthleteItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (showAddModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showAddModal]);

  // Form selections for dynamic filtering & live pricing
  const [sslcName, setSslcName] = useState('');
  const [usn, setUsn] = useState('');
  const [semester, setSemester] = useState('3');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [joiningDate, setJoiningDate] = useState('');
  const [semStartDate, setSemStartDate] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [event1, setEvent1] = useState('');
  const [event2, setEvent2] = useState('');
  const [reserveEvent, setReserveEvent] = useState('');
  const [relayChoice, setRelayChoice] = useState<'none' | '4x100' | '4x400'>('none');
  const [isMixedRelay, setIsMixedRelay] = useState(false);
  const [isHalfMarathon, setIsHalfMarathon] = useState(false);

  // Filter and sort individual events by official Code from Order of Events PDF (Codes 1–19, 23, 24/25)
  const individualEvents = useMemo(() => {
    return availableEvents
      .filter(
        (e) =>
          !e.category?.toLowerCase().includes('relay') &&
          e.category?.toLowerCase() !== 'road' &&
          !e.code?.includes('4X100') &&
          !e.code?.includes('4X400') &&
          !e.code?.toUpperCase().startsWith('HM-')
      )
      .map((ev) => {
        const meta = DB_CODE_TO_OFFICIAL_MAP[ev.code];
        return {
          ...ev,
          codeNum: meta?.codeNum || 99,
          officialName: meta?.officialName || ev.name,
          categoryGroup: meta?.categoryGroup || ev.category?.toUpperCase(),
        };
      })
      .sort((a, b) => a.codeNum - b.codeNum);
  }, [availableEvents]);

  // College quota: max 2 athletes per individual event (regular entries only)
  const regularCountByEvent = useMemo(() => {
    const counts: Record<string, number> = {};
    athletes.forEach((a) =>
      a.registrations
        .filter((r) => r.kind === 'regular')
        .forEach((r) => {
          counts[r.event_id] = (counts[r.event_id] || 0) + 1;
        })
    );
    return counts;
  }, [athletes]);
  const isEventFull = (eventId: string) => (regularCountByEvent[eventId] || 0) >= 2;

  // Live relay squad counts strictly derived from current squad roster (6 members per relay team)
  const registered100mRelay = athletes.filter((a) =>
    a.registrations.some((r) => r.events?.code?.includes('4X100'))
  ).length;
  const is100mRelayFull = registered100mRelay >= 6;

  const registered400mRelay = athletes.filter((a) =>
    a.registrations.some((r) => r.events?.code?.includes('4X400M-M') || r.events?.code?.includes('4X400M-W'))
  ).length;
  const is400mRelayFull = registered400mRelay >= 6;

  const registeredMixedRelay = athletes.filter((a) =>
    a.registrations.some((r) => r.events?.code?.includes('4X400M-MIX'))
  ).length;

  // Real-time fee calculation for current athlete modal:
  // ₹100 per regular event / HM. Reserve is FREE (₹0).
  // For relays, a team is ₹400 for 4 active legs (reserves 5 & 6 are FREE).
  const modalFee = useMemo(() => {
    let fee = 0;
    if (event1) fee += 100;
    if (event2) fee += 100;
    if (isHalfMarathon) fee += 100;
    // Relay: flat ₹400 per TEAM, charged once when the first athlete is nominated
    if (relayChoice === '4x100') {
      fee += registered100mRelay === 0 ? 400 : 0;
    } else if (relayChoice === '4x400') {
      fee += registered400mRelay === 0 ? 400 : 0;
    }
    if (isMixedRelay) {
      // Mixed team is shared by the college; may already be billed to the other squad
      fee += registeredMixedRelay === 0 ? 400 : 0;
    }
    return fee;
  }, [event1, event2, relayChoice, isMixedRelay, isHalfMarathon, registered100mRelay, registered400mRelay, registeredMixedRelay]);

  // Squad total computed fee:
  // Regular events (@ ₹100) + Half Marathon (@ ₹100) + Relay Teams (@ ₹400 flat per team, covering up to 6 members)
  const totalSquadFee = useMemo(() => {
    const regularEntries = athletes.reduce((acc, a) => {
      return acc + a.registrations.filter((r) => r.kind === 'regular').length;
    }, 0);
    const hmEntries = athletes.reduce((acc, a) => {
      return acc + a.registrations.filter((r) => r.kind === 'half_marathon').length;
    }, 0);

    const enteredRelays = new Set<string>();
    athletes.forEach((a) => {
      a.registrations
        .filter((r) => r.kind === 'relay')
        .forEach((r) => {
          if (r.event_id) enteredRelays.add(r.event_id);
        });
    });

    return (regularEntries * 100) + (hmEntries * 100) + (enteredRelays.size * 400);
  }, [athletes]);

  const totalBillableEntries = useMemo(() => {
    return athletes.reduce((acc, athlete) => {
      const billable = athlete.registrations.filter((r) => r.kind !== 'reserve').length;
      return acc + billable;
    }, 0);
  }, [athletes]);

  const confirmedCount = paymentStatus === 'VERIFIED' ? athletes.length : 0;
  const pendingCount = paymentStatus !== 'VERIFIED' ? athletes.length : 0;

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const okTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!okTypes.includes(file.type.toLowerCase())) {
      alert('Invalid photo format. Please upload a JPG, PNG or WebP image (iPhone HEIC photos must be converted first).');
      e.target.value = '';
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      alert('Photo must be less than 4MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function resetModalForm() {
    setSslcName('');
    setUsn('');
    setSemester('3');
    setBloodGroup('O+');
    setJoiningDate('');
    setSemStartDate('');
    setAadhaarNumber('');
    setPhotoPreview(null);
    setEvent1('');
    setEvent2('');
    setReserveEvent('');
    setRelayChoice('none');
    setIsMixedRelay(false);
    setIsHalfMarathon(false);
    setError(null);
  }

  async function handleAddAthlete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Validate mandatory identification fields
    if (!sslcName.trim()) {
      setError('Student Name as per SSLC Marks Card is required.');
      setLoading(false);
      return;
    }

    const cleanUsn = usn.trim().toUpperCase();
    if (!cleanUsn) {
      setError('USN is required.');
      setLoading(false);
      return;
    }

    if (!VTU_USN_REGEX.test(cleanUsn)) {
      setError(`Invalid USN '${cleanUsn}'. Enter a valid VTU USN (e.g. 1RV21CS001).`);
      setLoading(false);
      return;
    }

    // Check duplicate USN in local roster
    if (athletes.some((a) => a.usn.toUpperCase() === cleanUsn)) {
      setError(`An athlete with USN '${cleanUsn}' is already registered in this squad roster.`);
      setLoading(false);
      return;
    }

    // 2. Validate Aadhaar
    const cleanAadhaar = aadhaarNumber.trim().replace(/[\s-]/g, '');
    if (!/^\d{12}$/.test(cleanAadhaar)) {
      setError('Aadhaar Number must be exactly 12 numeric digits.');
      setLoading(false);
      return;
    }

    // Check duplicate Aadhaar in local roster
    if (athletes.some((a) => a.aadhaar_number === cleanAadhaar)) {
      setError(`An athlete with Aadhaar '${cleanAadhaar}' is already registered in this squad roster.`);
      setLoading(false);
      return;
    }

    // 3. Validate Date Sequence
    const joiningDateObj = new Date(joiningDate);
    const semStartDateObj = new Date(semStartDate);
    const now = new Date();

    if (joiningDateObj > now) {
      setError('College joining date cannot be in the future.');
      setLoading(false);
      return;
    }

    if (semStartDateObj < joiningDateObj) {
      setError('Current semester start date cannot be earlier than college joining date.');
      setLoading(false);
      return;
    }

    // 4. Validate Event Selection
    // Every kind of relay (4x100m, 4x400m, Mixed Relay) and Half Marathon can be standalone
    const isRelaySelected = Boolean(relayChoice === '4x100' || relayChoice === '4x400' || isMixedRelay);
    const isStandaloneAllowed = Boolean(isRelaySelected || isHalfMarathon);

    if (!event1 && !isStandaloneAllowed) {
      setError('Event 1 is compulsory unless registering for a Relay (4x100m, 4x400m, Mixed) or Half Marathon.');
      setLoading(false);
      return;
    }

    if (!event1 && !event2 && !isStandaloneAllowed) {
      setError('Please select at least one event or relay discipline.');
      setLoading(false);
      return;
    }

    if (event2 && event1 === event2) {
      setError('Event 2 cannot be the same as Event 1.');
      setLoading(false);
      return;
    }

    // Rule: If athlete chooses both Event 1 and Event 2, reserve cannot be nominated
    if (event1 && event2 && reserveEvent) {
      setError('VTU Regulation: An athlete registered for both Event 1 and Event 2 cannot nominate a reserve event.');
      setLoading(false);
      return;
    }

    // Rule 36: A reserve participant must also be a participant of one of the regular events
    if (!event1 && !event2 && reserveEvent) {
      setError('VTU Regulation (Rule 36): A reserve event can only be nominated if the athlete is registered for an individual regular event.');
      setLoading(false);
      return;
    }

    if (reserveEvent && (reserveEvent === event1 || reserveEvent === event2)) {
      setError('Reserve Event must be different from regular registered events.');
      setLoading(false);
      return;
    }

    // 5. Check Official Relay Quotas (Max 6 athletes per relay team)
    if (relayChoice === '4x100' && is100mRelayFull) {
      setError('4x100m Relay quota is full. Maximum 6 athletes per college division are allowed (4 runners + 2 reserves).');
      setLoading(false);
      return;
    }
    if (relayChoice === '4x400' && is400mRelayFull) {
      setError('4x400m Relay quota is full. Maximum 6 athletes per college division are allowed (4 runners + 2 reserves).');
      setLoading(false);
      return;
    }
    // Mixed Relay nominations are capped at 6 per college on the server; Half Marathon is unrestricted.

    // 6. Photo is strongly required for official VTU call room & ID badge issuance
    if (!photoPreview) {
      setError('Please upload a passport-size student photograph for official accreditation ID card printing.');
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set('sslcName', sslcName.trim());
    formData.set('usn', cleanUsn);
    formData.set('semester', semester);
    formData.set('bloodGroup', bloodGroup);
    formData.set('collegeJoiningDate', joiningDate);
    formData.set('semStartDate', semStartDate);
    formData.set('aadhaarNumber', cleanAadhaar);
    formData.set('event1Id', event1);
    if (event2) formData.set('event2Id', event2);
    if (reserveEvent) formData.set('reserveEventId', reserveEvent);
    formData.set('relayChoice', relayChoice);
    formData.set('isRelay', relayChoice === '4x100' ? 'true' : 'false');
    formData.set('isRelay400', relayChoice === '4x400' ? 'true' : 'false');
    formData.set('isMixedRelay', isMixedRelay ? 'true' : 'false');
    formData.set('isHalfMarathon', isHalfMarathon ? 'true' : 'false');
    if (photoPreview) {
      formData.set('photoData', photoPreview);
    }

    try {
      const res = await addAthleteAction(formData);
      if (res.success) {
        setShowAddModal(false);
        resetModalForm();
        window.location.reload();
      } else {
        setError(res.error || 'Failed to add athlete.');
      }
    } catch {
      setError('An unexpected network error occurred.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(athleteId: string, name: string) {
    if (rosterLocked) {
      alert('Roster Locked & Payment Submitted: athletes can no longer be removed.');
      return;
    }
    if (!confirm(`Are you sure you want to remove ${name} from the squad roster?`)) return;

    const res = await deleteAthleteAction(athleteId);
    if (res.success) {
      setAthletes((prev) => prev.filter((a) => a.id !== athleteId));
    } else {
      alert(`Error: ${res.error}`);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Title & Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <Link href="/squad/dashboard" style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              &larr; Back to Contingent Overview
            </Link>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            {gender === 'men' ? "Men's Athletics Contingent" : "Women's Athletics Contingent"}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            Official registration portal for {collegeName} ({squadCode}) &bull; Dr. ACS College of Engineering Meet
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            id="btn-download-reg-report-top"
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: '1px solid #334155',
              padding: '0.75rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'all 0.2s ease',
            }}
          >
            <span>📋</span> Registration Report (PDF)
          </button>

          <button
            type="button"
            onClick={() => {
              if (rosterLocked) return;
              resetModalForm();
              setShowAddModal(true);
            }}
            disabled={rosterLocked}
            title={rosterLocked ? 'Roster is locked — athletes cannot be added' : undefined}
            id="btn-register-new-student"
            style={{
              background: rosterLocked ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
              color: rosterLocked ? 'var(--text-muted)' : '#fff',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: rosterLocked ? 'not-allowed' : 'pointer',
              opacity: rosterLocked ? 0.6 : 1,
              boxShadow: rosterLocked ? 'none' : '0 4px 14px var(--accent-glow)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
            }}
          >
            {rosterLocked ? '🔒 Roster Locked' : '+ Register New Athlete'}
          </button>

          <Link href="/squad/payment">
            <button
              type="button"
              id="btn-proceed-payment-top"
              disabled={athletes.length === 0}
              style={{
                background: athletes.length === 0 ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                color: athletes.length === 0 ? 'var(--text-muted)' : 'var(--accent-primary)',
                border: '1px solid var(--border-color)',
                padding: '0.75rem 1.25rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: athletes.length === 0 ? 'not-allowed' : 'pointer',
                opacity: athletes.length === 0 ? 0.6 : 1,
                transition: 'all 0.2s ease',
              }}
            >
              Fee Settlement &amp; Invoice &rarr;
            </button>
          </Link>
        </div>
      </div>

      {rosterLocked && (
        <div id="banner-athletes-roster-locked" style={{
          padding: '0.85rem 1.25rem',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          color: 'var(--danger)',
          fontSize: '0.875rem',
          lineHeight: 1.5,
        }}>
          🔒 <strong>
            {registrationClosed
              ? 'Registration Closed:'
              : paymentStatus === 'VERIFIED'
                ? 'Roster Locked — Payment Verified:'
                : 'Roster Locked & Payment Submitted:'}
          </strong>{' '}
          Athletes can no longer be added or removed. Contact the VTU Directorate if an emergency unlock is required.
        </div>
      )}

      {lateEntryOpen && !rosterLocked && (
        <div
          id="banner-late-entry-window"
          style={{
            padding: '0.85rem 1.25rem',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '12px',
            color: '#92400e',
            fontSize: '0.875rem',
            lineHeight: 1.5,
          }}
        >
          ⏱️ <strong>Late Entry Window Open:</strong> Registration is closed, but the VTU Directorate has allowed your college to make late entries.
          Add the athletes, then pay the additional fee on the Fee Settlement page (this locks the roster again). New athletes receive bib numbers
          once the payment is verified; existing bib numbers do not change.
        </div>
      )}

      {paymentStatus === 'VERIFIED' && !rosterLocked && !lateEntryOpen && (
        <div style={{
          padding: '0.85rem 1.25rem',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '12px',
          color: '#065f46',
          fontSize: '0.875rem',
          lineHeight: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>✓</span>
            <span>
              <strong>Emergency Unlock Active:</strong> The VTU Directorate has temporarily unlocked your roster. Any differential fee for newly added athletes must be paid on the Fee Settlement page, which will lock the roster again.
            </span>
          </div>
          <Link href="/squad/payment" style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.85rem' }}>
            View Payment &amp; Invoice &rarr;
          </Link>
        </div>
      )}

      {/* Metrics Row (Identical to Prototype) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <StatBox
          title="Total Registered"
          value={athletes.length.toString()}
          accent="blue"
        />
        <StatBox
          title="Confirmed & Paid"
          value={confirmedCount.toString()}
          accent="emerald"
        />
        <StatBox
          title="Payment Pending"
          value={pendingCount.toString()}
          accent="amber"
        />
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Relay Squad Roster
          </span>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline', marginTop: '0.25rem' }}>
            <div>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: registered100mRelay >= 4 ? 'var(--success)' : 'var(--accent-primary)' }}>{registered100mRelay}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>/6 (4x100)</span>
            </div>
            <span style={{ color: 'var(--border-color)' }}>&bull;</span>
            <div>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: registered400mRelay >= 4 ? 'var(--success)' : 'var(--accent-primary)' }}>{registered400mRelay}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>/6 (4x400)</span>
            </div>
            <span style={{ color: 'var(--border-color)' }}>&bull;</span>
            <div>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: registeredMixedRelay >= 2 ? 'var(--success)' : 'var(--accent-primary)' }}>{registeredMixedRelay}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>/6 (Mixed)</span>
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Up to 6 members/relay (4 active + 2 reserves free) &bull; Flat ₹400/team
          </span>
        </div>
      </div>

      {/* Athletes Roster Card (Identical to Prototype Roster Table) */}
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <CardTitle>Registered Athletes Roster</CardTitle>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Showing {athletes.length} athletes &bull; Total Dues: <strong style={{ color: 'var(--accent-primary)' }}>₹{totalSquadFee}</strong>
            </span>
          </div>
        </CardHeader>
        <CardContent style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }} id="athletes-table">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>Bib / Status</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>Athlete Name (SSLC)</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>USN &amp; Sem</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>Aadhaar</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>Blood</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>Events Registered</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>Reserve Event</th>
                  <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {athletes.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                      No students registered yet in this college division. Click &quot;+ Register New Athlete&quot; to begin.
                    </td>
                  </tr>
                ) : (
                  athletes.map((athlete) => {
                    const regularRegs = athlete.registrations.filter((r) => r.kind === 'regular');
                    const reserveRegs = athlete.registrations.filter((r) => r.kind === 'reserve');
                    const relay100Regs = athlete.registrations.filter((r) => r.events?.code?.includes('4X100'));
                    const relay400Regs = athlete.registrations.filter((r) => r.events?.code?.includes('4X400M-M') || r.events?.code?.includes('4X400M-W'));
                    const mixedRelayRegs = athlete.registrations.filter((r) => r.events?.code?.includes('4X400M-MIX'));
                    const otherRelayRegs = athlete.registrations.filter((r) => r.kind === 'relay' && !r.events?.code?.includes('4X'));
                    const hmRegs = athlete.registrations.filter((r) => r.kind === 'half_marathon');

                    return (
                      <tr
                        key={athlete.id}
                        id={`row-athlete-${athlete.id}`}
                        style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s ease' }}
                      >
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-start' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                              #{athlete.bid_number || 'TBD'}
                            </span>
                            <Badge
                              variant={athlete.accreditation_status === 'ACCREDITED' ? 'success' : 'default'}
                              style={{ fontSize: '0.7rem' }}
                            >
                              {athlete.accreditation_status}
                            </Badge>
                          </div>
                        </td>

                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {athlete.photo_url ? (
                              <div style={{ position: 'relative', width: '38px', height: '38px', flexShrink: 0 }}>
                                <Image
                                  src={athlete.photo_url}
                                  alt={athlete.sslc_name}
                                  fill
                                  unoptimized
                                  style={{ objectFit: 'cover', borderRadius: '50%', border: '1px solid var(--border-color)' }}
                                />
                              </div>
                            ) : (
                              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-primary)', flexShrink: 0 }}>
                                {athlete.sslc_name?.charAt(0) || 'A'}
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                                {athlete.sslc_name}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }} suppressHydrationWarning>
                                Joined: {new Date(athlete.college_joining_date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                            {athlete.usn}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Semester {athlete.semester}
                          </div>
                        </td>

                        <td style={{ padding: '1rem' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                            {athlete.aadhaar_number ? `•••• •••• ${athlete.aadhaar_number.slice(-4)}` : '—'}
                          </span>
                        </td>

                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: 'rgba(239, 68, 68, 0.08)',
                            color: '#e11d48',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            border: '1px solid rgba(239, 68, 68, 0.2)'
                          }}>
                            {athlete.blood_group}
                          </span>
                        </td>

                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                            {regularRegs.map((r) => {
                              const meta = r.events?.code ? DB_CODE_TO_OFFICIAL_MAP[r.events.code] : null;
                              return (
                                <span
                                  key={r.id}
                                  style={{
                                    padding: '0.25rem 0.55rem',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'var(--bg-tertiary)',
                                    color: 'var(--accent-primary)',
                                    border: '1px solid var(--border-color)',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                  }}
                                >
                                  {meta ? `Code ${meta.codeNum}: ${meta.officialName}` : (r.events?.name || 'Regular Event')}
                                </span>
                              );
                            })}
                            {relay100Regs.length > 0 && (
                              <span
                                style={{
                                  padding: '0.25rem 0.55rem',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  color: '#059669',
                                  border: '1px solid rgba(16, 185, 129, 0.25)',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                }}
                              >
                                🤝 Code 20: 4x100m Relay
                              </span>
                            )}
                            {relay400Regs.length > 0 && (
                              <span
                                style={{
                                  padding: '0.25rem 0.55rem',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'rgba(59, 130, 246, 0.1)',
                                  color: '#2563eb',
                                  border: '1px solid rgba(59, 130, 246, 0.25)',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                }}
                              >
                                ⚡ Code 21: 4x400m Relay
                              </span>
                            )}
                            {mixedRelayRegs.length > 0 && (
                              <span
                                style={{
                                  padding: '0.25rem 0.55rem',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'rgba(139, 92, 246, 0.1)',
                                  color: '#7c3aed',
                                  border: '1px solid rgba(139, 92, 246, 0.25)',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                }}
                              >
                                ✨ Code 22: Mixed Relay
                              </span>
                            )}
                            {otherRelayRegs.length > 0 && (
                              <span
                                style={{
                                  padding: '0.25rem 0.55rem',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  color: '#059669',
                                  border: '1px solid rgba(16, 185, 129, 0.25)',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                }}
                              >
                                🤝 Relay Squad
                              </span>
                            )}
                            {hmRegs.length > 0 && (
                              <span
                                style={{
                                  padding: '0.25rem 0.55rem',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'rgba(217, 119, 6, 0.1)',
                                  color: '#d97706',
                                  border: '1px solid rgba(217, 119, 6, 0.25)',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                }}
                              >
                                🏃 Code 23: Half Marathon
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: '1rem' }}>
                          {reserveRegs.length > 0 ? (
                            <span
                              style={{
                                padding: '0.25rem 0.55rem',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(16, 185, 129, 0.08)',
                                color: '#10b981',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              {(() => {
                                const meta = reserveRegs[0].events?.code ? DB_CODE_TO_OFFICIAL_MAP[reserveRegs[0].events.code] : null;
                                return meta ? `Code ${meta.codeNum}: ${meta.officialName} (FREE)` : `${reserveRegs[0].events?.name} (FREE)`;
                              })()}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>
                          )}
                        </td>

                        <td style={{ padding: '1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {!rosterLocked && (
                            <button
                              type="button"
                              onClick={() => setEditingAthlete(athlete)}
                              id={`btn-edit-${athlete.id}`}
                              style={{
                                background: 'none',
                                border: '1px solid var(--border-color)',
                                color: 'var(--accent-primary)',
                                padding: '0.35rem 0.75rem',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                marginRight: '0.5rem',
                              }}
                            >
                              ✎ Edit
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(athlete.id, athlete.sslc_name)}
                            id={`btn-delete-${athlete.id}`}
                            disabled={rosterLocked}
                            title={rosterLocked ? 'Roster is locked' : undefined}
                            style={{
                              opacity: rosterLocked ? 0.4 : 1,
                              background: 'none',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: 'var(--danger)',
                              padding: '0.35rem 0.75rem',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: rosterLocked ? 'not-allowed' : 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {rosterLocked ? '🔒 Locked' : '✕ Remove'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Payment Callout Banner */}
      {athletes.length > 0 && (
        <Card style={{ border: '2px solid var(--accent-primary)', background: 'linear-gradient(to right, #ffffff, #eff6ff)' }}>
          <CardContent style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Squad Entry Fee Ready for Settlement
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                {athletes.length} students registered &bull; {totalBillableEntries} billable entries @ ₹100 &bull; All reserve disciplines free (₹0)
              </div>
            </div>

            <Link href="/squad/payment">
              <button
                type="button"
                id="btn-proceed-to-payment"
                style={{
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.85rem 2rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '1rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px var(--accent-glow)',
                }}
              >
                Proceed to Payment (₹{totalSquadFee}) &rarr;
              </button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* =========================================================================
          REGISTER NEW STUDENT / ATHLETE MODAL (EXACT PROTOTYPE REGISTERCLIENT UI)
          ========================================================================= */}
      {mounted && editingAthlete && !rosterLocked && (
        <EditAthleteModal
          athlete={editingAthlete}
          onClose={() => setEditingAthlete(null)}
          onSaved={(updated) => {
            setAthletes((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
            setEditingAthlete(null);
          }}
        />
      )}

      {mounted && showAddModal && !rosterLocked && createPortal(
        <div
          className="athlete-modal-overlay"
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
          id="modal-add-athlete-overlay"
        >
          <div
            className="athlete-modal-dialog"
            style={{
              position: 'relative',
              zIndex: 1000000,
              width: '100%',
              maxWidth: '960px',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: 'clamp(1rem, 3.5vw, 2rem)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              color: 'var(--text-primary)',
            }}
            id="modal-add-athlete"
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Dr. ACS College of Engineering Athletics Meet 2026
                </span>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  Register Athlete ({gender === 'men' ? "Boys Division" : "Girls Division"})
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {collegeName} &bull; Code: <strong>{squadCode}</strong> &bull; Official Registration Form
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.75rem',
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                ✕
              </button>
            </div>

            {error && (
              <div
                style={{
                  padding: '0.85rem 1.25rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--danger)',
                  fontSize: '0.9rem',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  marginBottom: '1.5rem'
                }}
                id="add-athlete-error"
              >
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleAddAthlete} id="form-add-athlete">
              <div className="athlete-modal-grid">

                {/* Left Column: Form Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                  {/* Card 1: Student Identity (as per SSLC) */}
                  <Card>
                    <CardHeader>
                      <CardTitle style={{ fontSize: '1.1rem' }}>
                        1. Student Identity (as per SSLC Marks Card)
                      </CardTitle>
                    </CardHeader>
                    <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                      {/* Full Name */}
                      <div>
                        <label style={labelStyle}>Full Name (as per SSLC Marks Card) *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. RAJESH KUMAR S"
                          value={sslcName}
                          onChange={(e) => setSslcName(e.target.value)}
                          style={inputStyle}
                          autoComplete="off"
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                          Exact name will be printed on the official Bib number and Certificates.
                        </span>
                      </div>

                      {/* USN & Current Semester */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label style={labelStyle}>USN (University Seat No) *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 1ME21CS045"
                            value={usn}
                            onChange={(e) => setUsn(e.target.value.toUpperCase())}
                            style={{ ...inputStyle, textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}
                            autoComplete="off"
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Current Semester *</label>
                          <select
                            value={semester}
                            onChange={(e) => setSemester(e.target.value)}
                            style={inputStyle}
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                              <option key={s} value={s}>Semester {s}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Blood Group, Joining Date, Sem Start Date */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={labelStyle}>Blood Group *</label>
                          <select
                            value={bloodGroup}
                            onChange={(e) => setBloodGroup(e.target.value)}
                            style={inputStyle}
                          >
                            {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                              <option key={bg} value={bg}>{bg}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>College Joining *</label>
                          <input
                            type="date"
                            required
                            value={joiningDate}
                            onChange={(e) => setJoiningDate(e.target.value)}
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Sem Start Date *</label>
                          <input
                            type="date"
                            required
                            value={semStartDate}
                            onChange={(e) => setSemStartDate(e.target.value)}
                            style={inputStyle}
                          />
                        </div>
                      </div>

                      {/* Aadhaar Number & Student Photo Upload */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', alignItems: 'flex-start', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                        <div>
                          <label style={labelStyle}>Aadhaar Number (12 Digits) *</label>
                          <input
                            type="text"
                            required
                            maxLength={12}
                            pattern="\d{12}"
                            placeholder="123456789012"
                            value={aadhaarNumber}
                            onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
                            style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.08em', fontWeight: 700 }}
                            autoComplete="off"
                          />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                            12 digits. Unique per championship athlete.
                          </span>
                        </div>

                        <div>
                          <label style={labelStyle}>Student Photo (Portrait) *</label>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handlePhotoSelect}
                            style={{ ...inputStyle, padding: '0.5rem', fontSize: '0.85rem' }}
                          />
                          {photoPreview ? (
                            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ position: 'relative', width: '36px', height: '36px', flexShrink: 0 }}>
                                <Image
                                  src={photoPreview}
                                  alt="Preview"
                                  fill
                                  unoptimized
                                  style={{ objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--accent-primary)' }}
                                />
                              </div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700 }}>✓ Photo Selected</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                              Required for official bib card &amp; call room badge
                            </span>
                          )}
                        </div>
                      </div>

                    </CardContent>
                  </Card>

                  {/* Card 2: Event Selection & Disciplines (Exact Prototype UI) */}
                  <Card>
                    <CardHeader>
                      <CardTitle style={{ fontSize: '1.1rem' }}>
                        2. Event Selection &amp; Disciplines
                      </CardTitle>
                    </CardHeader>
                    <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                      {/* Event 1 (Compulsory unless any relay or marathon selected) */}
                      {(() => {
                        const isRelaySelected = Boolean(relayChoice === '4x100' || relayChoice === '4x400' || isMixedRelay);
                        const isStandaloneAllowed = Boolean(isRelaySelected || isHalfMarathon);
                        const isReserveDisabled = Boolean(event1 && event2);
                        const isReserveNotApplicable = !event1 && !event2;
                        const isReserveBlocked = isReserveDisabled || isReserveNotApplicable;

                        return (
                          <>
                            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--accent-primary)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <label style={{ ...labelStyle, marginBottom: 0, fontWeight: 700 }}>
                                  Event 1 {!isStandaloneAllowed ? '(Compulsory) *' : '(Optional — Standalone Relay/Marathon active)'}
                                </label>
                                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent-primary)' }}>₹100</span>
                              </div>
                              <select
                                required={!isStandaloneAllowed}
                                value={event1}
                                onChange={(e) => {
                                  setEvent1(e.target.value);
                                  if (e.target.value === event2) setEvent2('');
                                  if (e.target.value && event2) setReserveEvent('');
                                  else if (e.target.value === reserveEvent) setReserveEvent('');
                                }}
                                style={inputStyle}
                              >
                                <option value="">-- Choose Individual Event 1 --</option>
                                {individualEvents.map((ev) => (
                                  <option key={ev.id} value={ev.id} disabled={isEventFull(ev.id)}>
                                    [Code {ev.codeNum}] {ev.officialName} ({ev.categoryGroup}){isEventFull(ev.id) ? ' — College quota full (2/2)' : ''}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Event 2 (Optional) */}
                            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--accent-secondary)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <label style={{ ...labelStyle, marginBottom: 0, fontWeight: 700 }}>Event 2 (Optional)</label>
                                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>+₹100</span>
                              </div>
                              <select
                                value={event2}
                                onChange={(e) => {
                                  setEvent2(e.target.value);
                                  if (e.target.value && event1) setReserveEvent('');
                                  else if (e.target.value === reserveEvent) setReserveEvent('');
                                }}
                                style={inputStyle}
                              >
                                <option value="">-- None (Single Event Only) --</option>
                                {individualEvents
                                  .filter((ev) => ev.id !== event1)
                                  .map((ev) => (
                                    <option key={ev.id} value={ev.id} disabled={isEventFull(ev.id)}>
                                      [Code {ev.codeNum}] {ev.officialName} ({ev.categoryGroup}){isEventFull(ev.id) ? ' — College quota full (2/2)' : ''}
                                    </option>
                                  ))}
                              </select>
                            </div>

                            {/* Reserve Event (Optional — Disabled if both Event 1 & 2 selected or no event selected) */}
                            <div style={{
                              background: 'var(--bg-tertiary)',
                              padding: '1rem',
                              borderRadius: 'var(--radius-sm)',
                              borderLeft: `4px solid ${isReserveBlocked ? 'var(--border-color)' : 'var(--warning)'}`,
                              opacity: isReserveBlocked ? 0.7 : 1,
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                                <label style={{ ...labelStyle, marginBottom: 0, fontWeight: 700 }}>
                                  Reserve Event {isReserveDisabled ? '(Disabled — 2 Individual Events Chosen)' : isReserveNotApplicable ? '(Requires Event 1 Selection — Rule 36)' : '(Optional)'}
                                </label>
                                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: isReserveBlocked ? 'var(--text-muted)' : 'var(--success)' }}>
                                  {isReserveBlocked ? 'N/A' : 'FREE'}
                                </span>
                              </div>
                              <select
                                value={reserveEvent}
                                disabled={isReserveBlocked}
                                onChange={(e) => setReserveEvent(e.target.value)}
                                style={{
                                  ...inputStyle,
                                  cursor: isReserveBlocked ? 'not-allowed' : 'pointer',
                                  background: isReserveBlocked ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                                }}
                              >
                                <option value="">
                                  {isReserveDisabled
                                    ? '-- Reserve Blocked When 2 Events Selected --'
                                    : isReserveNotApplicable
                                      ? '-- Select Event 1 First to Nominate Reserve (Rule 36) --'
                                      : '-- None (No Reserve Discipline) --'}
                                </option>
                                {!isReserveBlocked && individualEvents
                                  .filter((ev) => ev.id !== event1 && ev.id !== event2)
                                  .map((ev) => (
                                    <option key={ev.id} value={ev.id}>
                                      [Code {ev.codeNum}] {ev.officialName} ({ev.categoryGroup})
                                    </option>
                                  ))}
                              </select>
                              <span style={{ fontSize: '0.75rem', color: isReserveBlocked ? 'var(--danger)' : 'var(--text-secondary)', display: 'block', marginTop: '0.35rem' }}>
                                {isReserveDisabled
                                  ? 'Per VTU regulations, reserve events cannot be nominated when an athlete competes in two individual disciplines.'
                                  : isReserveNotApplicable
                                    ? 'Per VTU Rule 36: A reserve participant must also be a participant in at least one individual regular event.'
                                    : 'If the athlete is unable to compete in Event 1, they can be substituted into their reserve event during call room.'}
                              </span>
                            </div>
                          </>
                        );
                      })()}

                      {/* Official Relays & Common Events (per VTU Rule 3) */}
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                        {/* Divisional Relay Radio Options */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                            <label style={{ ...labelStyle, marginBottom: 0, fontWeight: 700 }}>
                              3. Divisional Relay Nomination (VTU Rule 3: Max 1 Relay)
                            </label>
                            <span style={{ fontSize: '0.8rem', color: relayChoice !== 'none' ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: 750 }}>
                              {relayChoice !== 'none' ? '+₹100' : 'None Selected'}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.65rem' }}>
                            Athletes can participate in any 2 individual events + 1 relay event (4x100m or 4x400m).
                          </p>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
                            {/* None */}
                            <label style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.65rem 0.85rem',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid',
                              borderColor: relayChoice === 'none' ? 'var(--accent-primary)' : 'var(--border-color)',
                              background: relayChoice === 'none' ? 'rgba(37, 99, 235, 0.05)' : 'var(--bg-tertiary)',
                              cursor: 'pointer',
                            }}>
                              <input
                                type="radio"
                                name="relayChoiceRadio"
                                value="none"
                                checked={relayChoice === 'none'}
                                onChange={() => setRelayChoice('none')}
                              />
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>None</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>No divisional relay</div>
                              </div>
                            </label>

                            {/* 4x100m */}
                            <label style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.65rem 0.85rem',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid',
                              borderColor: relayChoice === '4x100' ? 'var(--accent-primary)' : 'var(--border-color)',
                              background: relayChoice === '4x100' ? 'rgba(37, 99, 235, 0.05)' : 'var(--bg-tertiary)',
                              cursor: is100mRelayFull && relayChoice !== '4x100' ? 'not-allowed' : 'pointer',
                              opacity: is100mRelayFull && relayChoice !== '4x100' ? 0.6 : 1,
                            }}>
                              <input
                                type="radio"
                                name="relayChoiceRadio"
                                value="4x100"
                                checked={relayChoice === '4x100'}
                                disabled={is100mRelayFull && relayChoice !== '4x100'}
                                onChange={() => setRelayChoice('4x100')}
                              />
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Code 20: 4x100m</div>
                                <div style={{ fontSize: '0.7rem', color: is100mRelayFull ? 'var(--danger)' : 'var(--text-secondary)' }}>
                                  {is100mRelayFull ? 'Quota full (6/6)' : `${registered100mRelay}/6 registered`}
                                </div>
                              </div>
                            </label>

                            {/* 4x400m */}
                            <label style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.65rem 0.85rem',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid',
                              borderColor: relayChoice === '4x400' ? 'var(--accent-primary)' : 'var(--border-color)',
                              background: relayChoice === '4x400' ? 'rgba(37, 99, 235, 0.05)' : 'var(--bg-tertiary)',
                              cursor: is400mRelayFull && relayChoice !== '4x400' ? 'not-allowed' : 'pointer',
                              opacity: is400mRelayFull && relayChoice !== '4x400' ? 0.6 : 1,
                            }}>
                              <input
                                type="radio"
                                name="relayChoiceRadio"
                                value="4x400"
                                checked={relayChoice === '4x400'}
                                disabled={is400mRelayFull && relayChoice !== '4x400'}
                                onChange={() => setRelayChoice('4x400')}
                              />
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Code 21: 4x400m</div>
                                <div style={{ fontSize: '0.7rem', color: is400mRelayFull ? 'var(--danger)' : 'var(--text-secondary)' }}>
                                  {is400mRelayFull ? 'Quota full (6/6)' : `${registered400mRelay}/6 registered`}
                                </div>
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* Mixed Relay & Half Marathon Checkboxes */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          {/* 4x400m Mixed Relay */}
                          <label style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                            padding: '0.75rem 0.9rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid',
                            borderColor: isMixedRelay ? 'var(--accent-primary)' : 'var(--border-color)',
                            background: isMixedRelay ? 'rgba(139, 92, 246, 0.06)' : 'var(--bg-tertiary)',
                            cursor: 'pointer',
                          }}>
                            <input
                              type="checkbox"
                              checked={isMixedRelay}
                              onChange={(e) => setIsMixedRelay(e.target.checked)}
                              style={{ marginTop: '0.25rem', transform: 'scale(1.2)' }}
                            />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                Code 22: 4x400m Mixed Relay Pool (₹400 per college team)
                              </div>
                              <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                                Can be combined with other entries. Max 6 nominations per college (Men + Women). Order: Leg 1: W • Leg 2: M • Leg 3: W • Leg 4: M
                              </div>
                            </div>
                          </label>

                          {/* Half Marathon */}
                          <label style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                            padding: '0.75rem 0.9rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-tertiary)',
                            cursor: 'pointer',
                          }}>
                            <input
                              type="checkbox"
                              checked={isHalfMarathon}
                              onChange={(e) => setIsHalfMarathon(e.target.checked)}
                              style={{ marginTop: '0.25rem', transform: 'scale(1.2)' }}
                            />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                Code 23: 21 km Half Marathon Participant (+₹100) — Standalone &amp; Unrestricted
                              </div>
                              <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                                Standalone &amp; unrestricted entry: can be registered alone or added to any event roster. Scheduled Day 3 morning.
                              </div>
                              {isHalfMarathon && (
                                <div style={{ fontSize: '0.725rem', color: '#b45309', fontWeight: 700, marginTop: '0.35rem' }}>
                                  ⚠️ Note: Medical Fitness Certificate is mandatory for 21km Road Half Marathon participants and must be submitted during reporting (VTU Rule 48).
                                </div>
                              )}
                            </div>
                          </label>
                        </div>

                      </div>

                    </CardContent>
                  </Card>

                </div>

                {/* Right Column: Dynamic Fee Summary Sticky Sidebar */}
                <div>
                  <div style={{ position: 'sticky', top: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    <Card style={{ border: '2px solid var(--accent-primary)', boxShadow: '0 4px 20px var(--accent-glow)' }}>
                      <CardHeader>
                        <CardTitle style={{ fontSize: '1.15rem', color: 'var(--accent-primary)' }}>
                          Registration Fee Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                          <span>Event 1 (Regular):</span>
                          <span style={{ fontWeight: 700 }}>{event1 ? '₹100' : '₹0'}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                          <span>Event 2 (Regular):</span>
                          <span style={{ fontWeight: 700 }}>{event2 ? '₹100' : '₹0'}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                          <span>Divisional Relay:</span>
                          <span style={{ fontWeight: 700 }}>
                            {relayChoice === 'none'
                              ? '₹0'
                              : (relayChoice === '4x100' ? registered100mRelay : registered400mRelay) === 0
                                ? '₹400 (team fee)'
                                : '₹0 (team already billed)'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                          <span>Mixed Relay Pool:</span>
                          <span style={{ fontWeight: 700 }}>
                            {!isMixedRelay ? '₹0' : registeredMixedRelay === 0 ? '₹400 (college team fee)' : '₹0 (team already billed)'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                          <span>Half Marathon:</span>
                          <span style={{ fontWeight: 700 }}>{isHalfMarathon ? '₹100' : '₹0'}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          <span>Reserve Event:</span>
                          <span style={{ color: 'var(--success)', fontWeight: 700 }}>{reserveEvent ? 'FREE (₹0)' : '-'}</span>
                        </div>

                        <div style={{ borderTop: '2px dashed var(--border-color)', margin: '0.25rem 0' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>Total Payable:</span>
                          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                            ₹{modalFee}
                          </span>
                        </div>

                        {(() => {
                          const isRelaySelected = Boolean(relayChoice === '4x100' || relayChoice === '4x400' || isMixedRelay);
                          const isStandaloneAllowed = Boolean(isRelaySelected || isHalfMarathon);
                          const hasDisciplineSelected = Boolean(event1 || event2 || isStandaloneAllowed);
                          const isSubmitDisabled = loading || !hasDisciplineSelected;

                          return (
                            <button
                              type="submit"
                              disabled={isSubmitDisabled}
                              id="btn-save-athlete"
                              style={{
                                width: '100%',
                                marginTop: '0.5rem',
                                background: 'var(--accent-primary)',
                                color: '#fff',
                                border: 'none',
                                padding: '0.9rem',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '1rem',
                                fontWeight: 800,
                                cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
                                opacity: isSubmitDisabled ? 0.6 : 1,
                                boxShadow: '0 4px 14px var(--accent-glow)'
                              }}
                            >
                              {loading ? 'Registering Student...' : `Register Athlete (${modalFee > 0 ? `₹${modalFee}` : 'Included in Squad/Relay Fee'}) →`}
                            </button>
                          );
                        })()}

                        <button
                          type="button"
                          onClick={() => setShowAddModal(false)}
                          disabled={loading}
                          style={{
                            width: '100%',
                            background: 'none',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-secondary)',
                            padding: '0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>

                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.4, marginTop: '0.25rem' }}>
                          Registration confirms with instant server validation. All reserve disciplines are free of charge.
                        </p>

                      </CardContent>
                    </Card>

                  </div>
                </div>

              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Official Contingent Registration Report & Eligibility Proforma Modal */}
      <RegistrationReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        squad={{
          squadCode,
          collegeName,
          gender,
        }}
        athletes={athletes}
      />

    </div>
  );
}

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
