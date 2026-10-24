'use client';

import React, { useState, useMemo } from 'react';
import { addAthleteAction, deleteAthleteAction } from '@/app/actions/athletes';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatBox } from '@/components/ui/StatBox';
import { Button } from '@/components/ui/Button';
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
}

export default function AthletesManager({
  initialAthletes,
  availableEvents,
  rosterLocked,
  squadCode,
  gender,
  relayCount: initialRelayCount = 0,
  collegeName = 'Affiliated Institution',
  paymentStatus = 'DRAFT',
}: Props) {
  const [athletes, setAthletes] = useState<AthleteItem[]>(initialAthletes);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const [isRelay, setIsRelay] = useState(false);
  const [isHalfMarathon, setIsHalfMarathon] = useState(false);

  // Filter individual events (excluding relay events and half marathon from individual dropdowns)
  const individualEvents = useMemo(() => {
    return availableEvents.filter(
      (e) =>
        !e.category?.toLowerCase().includes('relay') &&
        !e.code?.includes('4X100') &&
        !e.code?.includes('4X400') &&
        !e.code?.startsWith('HM') &&
        !e.name?.toLowerCase().includes('half marathon') &&
        !e.category?.toLowerCase().includes('road')
    );
  }, [availableEvents]);

  // Live relay squad count strictly derived from current squad roster
  const registeredRelayMembers = athletes.filter((a) =>
    a.registrations.some((r) => r.kind === 'relay' || r.events?.code?.includes('4X100'))
  ).length;
  const currentRelayCount = registeredRelayMembers;
  const isRelayFull = currentRelayCount >= 4;

  // Real-time fee calculation for current athlete modal:
  // ₹100 per event, Reserve is FREE (₹0)
  const modalFee = useMemo(() => {
    let fee = 0;
    if (event1) fee += 100;
    if (event2) fee += 100;
    if (isRelay) fee += 100;
    if (isHalfMarathon) fee += 100;
    return fee;
  }, [event1, event2, isRelay, isHalfMarathon]);

  // Squad total computed fee:
  const totalBillableEntries = useMemo(() => {
    return athletes.reduce((acc, athlete) => {
      const billable = athlete.registrations.filter((r) => r.kind !== 'reserve').length;
      return acc + billable;
    }, 0);
  }, [athletes]);
  const totalSquadFee = totalBillableEntries * 100;

  const confirmedCount = paymentStatus === 'VERIFIED' ? athletes.length : 0;
  const pendingCount = paymentStatus !== 'VERIFIED' ? athletes.length : 0;

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert('Photo must be less than 4MB.');
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
    setIsRelay(false);
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
    if (!event1) {
      setError('Event 1 (Compulsory) must be selected.');
      setLoading(false);
      return;
    }

    if (event2 && event1 === event2) {
      setError('Event 2 cannot be the same as Event 1.');
      setLoading(false);
      return;
    }

    if (reserveEvent && (reserveEvent === event1 || reserveEvent === event2)) {
      setError('Reserve Event must be different from regular registered events.');
      setLoading(false);
      return;
    }

    // 5. Check Relay Limit
    if (isRelay && isRelayFull) {
      setError('Relay quota is full. Maximum 4 athletes per college division are allowed.');
      setLoading(false);
      return;
    }

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
    formData.set('isRelay', isRelay ? 'true' : 'false');
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
    if (!confirm(`Are you sure you want to remove ${name} from the squad roster?`)) return;

    const res = await deleteAthleteAction(athleteId);
    if (res.success) {
      setAthletes((prev) => prev.filter((a) => a.id !== athleteId));
    } else {
      alert(`Error: ${res.error}`);
    }
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Title & Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <Link href="/" style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', fontWeight: 600 }}>
              &larr; Championship Home
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
          {rosterLocked ? (
            <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: '0.9rem', fontWeight: 700 }}>
              🔒 Roster Locked (Post-Payment)
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  resetModalForm();
                  setShowAddModal(true);
                }}
                id="btn-register-new-student"
                style={{
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px var(--accent-glow)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease',
                }}
              >
                + Register New Athlete
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
                  Settle Entry Dues (₹{totalSquadFee}) &rarr;
                </button>
              </Link>
            </>
          )}
        </div>
      </div>

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
            Relay Squad Quota
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: currentRelayCount === 4 ? 'var(--success)' : 'var(--accent-primary)' }}>
            {currentRelayCount} <span style={{ fontSize: '1.125rem', color: 'var(--text-secondary)' }}>/ 4 Max</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: currentRelayCount === 4 ? 'var(--success)' : 'var(--text-secondary)' }}>
            {currentRelayCount === 4 ? 'Quota Complete' : `${4 - currentRelayCount} slots remaining`}
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
                  {!rosterLocked && <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {athletes.length === 0 ? (
                  <tr>
                    <td colSpan={rosterLocked ? 7 : 8} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                      No students registered yet in this college division. Click &quot;+ Register New Athlete&quot; to begin.
                    </td>
                  </tr>
                ) : (
                  athletes.map((athlete) => {
                    const regularRegs = athlete.registrations.filter((r) => r.kind === 'regular');
                    const reserveRegs = athlete.registrations.filter((r) => r.kind === 'reserve');
                    const relayRegs = athlete.registrations.filter((r) => r.kind === 'relay' || r.events?.code?.includes('4X100'));
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
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
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
                            {regularRegs.map((r) => (
                              <span
                                key={r.id}
                                style={{
                                  padding: '0.25rem 0.55rem',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'var(--bg-tertiary)',
                                  color: 'var(--accent-primary)',
                                  border: '1px solid var(--border-color)',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                }}
                              >
                                {r.events?.name || 'Regular Event'}
                              </span>
                            ))}
                            {relayRegs.length > 0 && (
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
                                🤝 4x100m Relay
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
                                🏃 Half Marathon
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
                                fontWeight: 600,
                              }}
                            >
                              {reserveRegs[0].events?.name} (FREE)
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>
                          )}
                        </td>

                        {!rosterLocked && (
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => handleDelete(athlete.id, athlete.sslc_name)}
                              id={`btn-delete-${athlete.id}`}
                              style={{
                                background: 'none',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: 'var(--danger)',
                                padding: '0.35rem 0.75rem',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              ✕ Remove
                            </button>
                          </td>
                        )}
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
      {athletes.length > 0 && !rosterLocked && (
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
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
          id="modal-add-athlete-overlay"
        >
          <div
            style={{
              width: '100%',
              maxWidth: '960px',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '2rem',
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
              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '1.5rem' }}>
                
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
                            accept="image/*"
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
                      
                      {/* Event 1 (Compulsory) */}
                      <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--accent-primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <label style={{ ...labelStyle, marginBottom: 0, fontWeight: 700 }}>Event 1 (Compulsory) *</label>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent-primary)' }}>₹100</span>
                        </div>
                        <select
                          required
                          value={event1}
                          onChange={(e) => {
                            setEvent1(e.target.value);
                            if (e.target.value === event2) setEvent2('');
                            if (e.target.value === reserveEvent) setReserveEvent('');
                          }}
                          style={inputStyle}
                        >
                          <option value="">-- Choose Individual Event 1 --</option>
                          {individualEvents.map((ev) => (
                            <option key={ev.id} value={ev.id}>
                              {ev.name} ({ev.category.toUpperCase()})
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
                            if (e.target.value === reserveEvent) setReserveEvent('');
                          }}
                          style={inputStyle}
                        >
                          <option value="">-- None (Single Event Only) --</option>
                          {individualEvents
                            .filter((ev) => ev.id !== event1)
                            .map((ev) => (
                              <option key={ev.id} value={ev.id}>
                                {ev.name} ({ev.category.toUpperCase()})
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Reserve Event (Optional) */}
                      <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--warning)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <label style={{ ...labelStyle, marginBottom: 0, fontWeight: 700 }}>Reserve Event (Optional)</label>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--success)' }}>FREE</span>
                        </div>
                        <select
                          value={reserveEvent}
                          onChange={(e) => setReserveEvent(e.target.value)}
                          style={inputStyle}
                        >
                          <option value="">-- None (No Reserve Discipline) --</option>
                          {individualEvents
                            .filter((ev) => ev.id !== event1 && ev.id !== event2)
                            .map((ev) => (
                              <option key={ev.id} value={ev.id}>
                                {ev.name} ({ev.category.toUpperCase()})
                              </option>
                            ))}
                        </select>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.35rem' }}>
                          If the athlete is unable to compete in Event 1 or 2, they can be substituted into their reserve event during call room.
                        </span>
                      </div>

                      {/* Relay & Half Marathon Checkboxes */}
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        
                        {/* Relay Checkbox */}
                        <label style={{ 
                          display: 'flex', 
                          alignItems: 'flex-start', 
                          gap: '0.75rem', 
                          cursor: isRelayFull ? 'not-allowed' : 'pointer',
                          opacity: isRelayFull ? 0.6 : 1,
                          background: 'var(--bg-tertiary)',
                          padding: '0.85rem 1rem',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          <input
                            type="checkbox"
                            checked={isRelay && !isRelayFull}
                            disabled={isRelayFull}
                            onChange={(e) => setIsRelay(e.target.checked)}
                            style={{ marginTop: '0.25rem', transform: 'scale(1.2)' }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                              Include in 4x100m Relay Squad (+₹100)
                            </div>
                            <div style={{ fontSize: '0.75rem', color: isRelayFull ? 'var(--danger)' : 'var(--text-secondary)' }}>
                              {isRelayFull 
                                ? 'Quota Full: Maximum 4 relay runners have already been registered for this college & division.' 
                                : `College quota: ${currentRelayCount}/4 runners registered so far.`}
                            </div>
                          </div>
                        </label>

                        {/* Half Marathon Checkbox */}
                        <label style={{ 
                          display: 'flex', 
                          alignItems: 'flex-start', 
                          gap: '0.75rem', 
                          cursor: 'pointer',
                          background: 'var(--bg-tertiary)',
                          padding: '0.85rem 1rem',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          <input
                            type="checkbox"
                            checked={isHalfMarathon}
                            onChange={(e) => setIsHalfMarathon(e.target.checked)}
                            style={{ marginTop: '0.25rem', transform: 'scale(1.2)' }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                              21 km Half Marathon Participant (+₹100)
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Open to all university participants with zero event limit restrictions.
                            </div>
                          </div>
                        </label>

                      </div>

                    </CardContent>
                  </Card>

                </div>

                {/* Right Column: Dynamic Fee Summary Sticky Sidebar (Exact Prototype UI) */}
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
                          <span>Relay Participant:</span>
                          <span style={{ fontWeight: 700 }}>{isRelay ? '₹100' : '₹0'}</span>
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

                        <button
                          type="submit"
                          disabled={loading || !event1 || modalFee === 0}
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
                            cursor: loading || !event1 ? 'not-allowed' : 'pointer',
                            opacity: loading || !event1 ? 0.6 : 1,
                            boxShadow: '0 4px 14px var(--accent-glow)'
                          }}
                        >
                          {loading ? 'Registering Student...' : `Register Athlete (₹${modalFee}) →`}
                        </button>

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
        </div>
      )}

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
