'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireSquad } from '@/lib/auth-guard';
import { revalidatePath } from 'next/cache';
import { rosterEditBlockReason } from '@/lib/roster-window';
import { validateDateOfBirth } from '@/lib/eligibility';
import { makeAthleteQrToken } from '@/lib/athlete-qr';

export interface AddAthleteResult {
  success: boolean;
  error?: string;
  athleteId?: string;
}

/** Official VTU USN pattern, e.g. 1RV21CS001, 4MT22MBA05, 2KE20EC400 */
const VTU_USN_REGEX = /^[1-4][A-Z]{2}\d{2}[A-Z]{2,3}\d{2,3}$/;

/**
 * Roster mutation guard. Returns an error string when the squad's roster is frozen
 * (payment submitted / verified / admin lock) or championship registration is closed.
 */
async function getRosterMutationBlock(squadId: string): Promise<string | null> {
  // select('*') so this keeps working before migration 0017 adds late_entry_open
  const [{ data: meetSettings }, { data: squad, error: squadErr }] = await Promise.all([
    supabaseAdmin.from('meet_settings').select('registration_open').limit(1).maybeSingle(),
    supabaseAdmin.from('squads').select('*').eq('id', squadId).maybeSingle(),
  ]);

  if (squadErr || !squad) {
    return 'Unable to verify squad roster status. Please try again.';
  }
  // Registration closed → only an admin-opened late-entry window allows edits
  return rosterEditBlockReason(meetSettings?.registration_open !== false, squad);
}

/**
 * Registers a new student-athlete for the current squad.
 * Validates individual event quotas, Aadhaar format, photo upload to Supabase storage,
 * and relay team squad limits (max 4 per college division).
 */
export async function addAthleteAction(formData: FormData): Promise<AddAthleteResult> {
  try {
    const session = await requireSquad();

    // Roster lock + global registration window enforcement
    const lockError = await getRosterMutationBlock(session.squadId);
    if (lockError) {
      return { success: false, error: lockError };
    }

  const sslcName = (formData.get('sslcName') as string || '').trim();
  const usn = (formData.get('usn') as string || '').trim().toUpperCase();
  const semester = parseInt(formData.get('semester') as string, 10);
  const bloodGroup = (formData.get('bloodGroup') as string || '').trim();
  const collegeJoiningDate = formData.get('collegeJoiningDate') as string;
  const semStartDate = formData.get('semStartDate') as string;
  const aadhaarNumber = (formData.get('aadhaarNumber') as string || '').trim().replace(/[\s-]/g, '');
  const dateOfBirth = (formData.get('dateOfBirth') as string || '').trim();

  const event1Id = formData.get('event1Id') as string;
  const event2Id = formData.get('event2Id') as string;
  const reserveEventId = formData.get('reserveEventId') as string;
  
  // Relay nominations per official VTU Rule 3
  const relayChoice = (formData.get('relayChoice') as string || '').trim(); // '4x100' | '4x400' | 'none'
  const isRelay = relayChoice === '4x100' || formData.get('isRelay') === 'true' || formData.get('isRelay') === 'on';
  const isRelay400 = relayChoice === '4x400' || formData.get('isRelay400') === 'true' || formData.get('isRelay400') === 'on';
  const isMixedRelay = formData.get('isMixedRelay') === 'true' || formData.get('isMixedRelay') === 'on';
  const isHalfMarathon = formData.get('isHalfMarathon') === 'true' || formData.get('isHalfMarathon') === 'on';

  // Rule 3: Athletes can participate in at most one gender relay event (4x100m or 4x400m)
  if (isRelay && isRelay400) {
    return { success: false, error: 'VTU Rule 3: Athletes can participate in at most one divisional relay event (either 4x100m or 4x400m).' };
  }

  // Identification Validation
  if (!sslcName || !usn || !semester || !bloodGroup || !collegeJoiningDate || !semStartDate || !aadhaarNumber) {
    return { success: false, error: 'All student identification fields (including 12-digit Aadhaar Number) are mandatory.' };
  }

  if (!/^\d{12}$/.test(aadhaarNumber)) {
    return { success: false, error: 'Aadhaar Number must be exactly 12 numeric digits.' };
  }

  if (!VTU_USN_REGEX.test(usn)) {
    return { success: false, error: `Invalid USN '${usn}'. Enter a valid VTU USN (e.g. 1RV21CS001).` };
  }

  if (!Number.isInteger(semester) || semester < 1 || semester > 8) {
    return { success: false, error: 'Semester must be between 1 and 8.' };
  }

  const dobError = validateDateOfBirth(dateOfBirth);
  if (dobError) {
    return { success: false, error: dobError };
  }

  // Date Logic Validation: Semester start date cannot be before college joining date
  const joiningDateObj = new Date(collegeJoiningDate);
  const semStartDateObj = new Date(semStartDate);
  const now = new Date();

  if (joiningDateObj > now) {
    return { success: false, error: 'College joining date cannot be in the future.' };
  }
  if (semStartDateObj < joiningDateObj) {
    return { success: false, error: 'Current semester start date cannot be earlier than college joining date.' };
  }

  // Check for duplicate Aadhaar across the entire championship
  const { data: existingAadhaar } = await supabaseAdmin
    .from('profiles')
    .select('id, sslc_name')
    .eq('aadhaar_number', aadhaarNumber)
    .maybeSingle();

  if (existingAadhaar) {
    return {
      success: false,
      error: `An athlete with Aadhaar '${aadhaarNumber}' is already registered (${existingAadhaar.sslc_name}).`,
    };
  }

  // Check for duplicate USN across the championship
  const { data: existingUsn } = await supabaseAdmin
    .from('profiles')
    .select('id, sslc_name')
    .eq('usn', usn)
    .maybeSingle();

  if (existingUsn) {
    return {
      success: false,
      error: `An athlete with USN '${usn}' is already registered (${existingUsn.sslc_name}).`,
    };
  }

  // Event Selection Validation
  // Every kind of relay (4x100m, 4x400m, Mixed Relay) and Half Marathon can be standalone
  const isRelaySelected = Boolean(isRelay || isRelay400 || isMixedRelay);
  const isStandaloneAllowed = Boolean(isRelaySelected || isHalfMarathon);

  if (!event1Id && !isStandaloneAllowed) {
    return { 
      success: false, 
      error: 'Event 1 is compulsory unless registering for a Relay (4x100m, 4x400m, Mixed) or Half Marathon.' 
    };
  }

  if (!event1Id && !event2Id && !isStandaloneAllowed) {
    return { success: false, error: 'Please select at least one event or relay discipline.' };
  }

  if (event2Id && event1Id && event1Id === event2Id) {
    return { success: false, error: 'Event 1 and Event 2 cannot be the same event.' };
  }

  // Rule: If an athlete chooses both Event 1 and Event 2, they cannot nominate a reserve event
  if (event1Id && event2Id && reserveEventId) {
    return {
      success: false,
      error: 'VTU Regulation: An athlete registered for both Event 1 and Event 2 cannot nominate a reserve event.',
    };
  }

  // Rule 36: A reserve participant must also be a participant of one of the regular events
  if (!event1Id && !event2Id && reserveEventId) {
    return {
      success: false,
      error: 'VTU Regulation (Rule 36): A reserve event can only be nominated if the athlete is registered for an individual regular event.',
    };
  }

  if (reserveEventId && (reserveEventId === event1Id || reserveEventId === event2Id)) {
    return { success: false, error: 'Reserve event must be distinct from regular events.' };
  }

  // Every individual event (regular or reserve) must be a real individual event of THIS
  // squad's gender — never a relay, the Half Marathon (own checkbox) or the other division.
  const individualIds = [event1Id, event2Id, reserveEventId].filter(Boolean);
  if (individualIds.length > 0) {
    const { data: chosenEvents } = await supabaseAdmin
      .from('events')
      .select('id, code, gender, category')
      .in('id', individualIds);
    const byId = new Map((chosenEvents || []).map((ev: any) => [ev.id, ev]));
    for (const id of individualIds) {
      const ev: any = byId.get(id);
      const code = String(ev?.code || '').toUpperCase();
      const invalid =
        !ev ||
        ev.gender !== session.gender ||
        ev.category === 'relay' ||
        ev.category === 'road' ||
        code.startsWith('4X') ||
        code.startsWith('HM-');
      if (invalid) {
        return { success: false, error: 'One of the selected events is not a valid individual event for your division. Please re-select the events.' };
      }
    }
  }

  // Fetch existing squad profiles for quota validations
  const { data: squadProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('squad_id', session.squadId);
  const squadProfileIds = (squadProfiles || []).map((p: any) => p.id);

  // Enforce VTU / AFI Rule: Max 2 athletes per college squad in any single regular event
  if (squadProfileIds.length > 0) {
    const regularEventIds = [event1Id, event2Id].filter(Boolean);
    for (const evId of regularEventIds) {
      const { count: evCount } = await supabaseAdmin
        .from('registrations')
        .select('id', { count: 'exact', head: true })
        .in('profile_id', squadProfileIds)
        .eq('event_id', evId)
        .eq('kind', 'regular');

      if ((evCount || 0) >= 2) {
        const { data: evDetail } = await supabaseAdmin
          .from('events')
          .select('name')
          .eq('id', evId)
          .single();
        return {
          success: false,
          error: `VTU Quota Exceeded: Your college already has the maximum of 2 athletes registered in '${evDetail?.name || 'this event'}'.`,
        };
      }
    }
  }

  // 4x100m Relay Quota Enforcement (Team consists of 6 members: 4 runners + 2 reserves)
  let relayEventId: string | null = null;
  if (isRelay) {
    const relayCode = session.gender === 'men' ? '4X100M-M' : '4X100M-W';
    const { data: relayEvent } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('code', relayCode)
      .maybeSingle();

    if (!relayEvent) {
      return { success: false, error: 'The 4x100m relay event is not configured in the championship catalogue. Please contact the VTU Directorate.' };
    }
    {
      relayEventId = relayEvent.id;
      if (squadProfileIds.length > 0) {
        const { count: relayCount } = await supabaseAdmin
          .from('registrations')
          .select('id', { count: 'exact', head: true })
          .in('profile_id', squadProfileIds)
          .eq('event_id', relayEvent.id);

        if ((relayCount || 0) >= 6) {
          return {
            success: false,
            error: 'Your college squad has already reached the maximum quota of 6 athletes for the 4x100m relay (4 active runners + 2 reserves).',
          };
        }
      }
    }
  }

  // 4x400m Relay Quota Enforcement (Team consists of 6 members: 4 runners + 2 reserves)
  let relay400EventId: string | null = null;
  if (isRelay400) {
    const relay400Code = session.gender === 'men' ? '4X400M-M' : '4X400M-W';
    const { data: relay400Event } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('code', relay400Code)
      .maybeSingle();

    if (!relay400Event) {
      return { success: false, error: 'The 4x400m relay event is not configured in the championship catalogue. Please contact the VTU Directorate.' };
    }
    {
      relay400EventId = relay400Event.id;
      if (squadProfileIds.length > 0) {
        const { count: relay400Count } = await supabaseAdmin
          .from('registrations')
          .select('id', { count: 'exact', head: true })
          .in('profile_id', squadProfileIds)
          .eq('event_id', relay400Event.id);

        if ((relay400Count || 0) >= 6) {
          return {
            success: false,
            error: 'Your college squad has already reached the maximum quota of 6 athletes for the 4x400m relay (4 active runners + 2 reserves).',
          };
        }
      }
    }
  }

  // 4x400m Mixed Relay: max 6 nominations per college (shared Men + Women team)
  let mixedRelayEventId: string | null = null;
  if (isMixedRelay) {
    const { data: mixedEvent } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('code', '4X400M-MIX')
      .maybeSingle();

    if (!mixedEvent) {
      return { success: false, error: 'The 4x400m Mixed Relay event is not configured in the championship catalogue. Please contact the VTU Directorate.' };
    }
    {
      mixedRelayEventId = mixedEvent.id;

      // The mixed team is shared by the college (both squads): max 6 nominations in total
      // (4 runners + 2 reserves) — the team is picked only from these nominees.
      const { data: collegeSquads } = await supabaseAdmin
        .from('squads')
        .select('id')
        .eq('college_id', session.collegeId);
      const collegeSquadIds = (collegeSquads || []).map((s: any) => s.id);
      const { data: collegeProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .in('squad_id', collegeSquadIds.length > 0 ? collegeSquadIds : [session.squadId]);
      const collegeProfileIds = (collegeProfiles || []).map((p: any) => p.id);

      if (collegeProfileIds.length > 0) {
        const { count: mixedCount } = await supabaseAdmin
          .from('registrations')
          .select('id', { count: 'exact', head: true })
          .in('profile_id', collegeProfileIds)
          .eq('event_id', mixedEvent.id);

        if ((mixedCount || 0) >= 6) {
          return {
            success: false,
            error: 'Your college has already reached the maximum of 6 nominations for the 4x400m Mixed Relay (4 runners + 2 reserves, across Men and Women squads).',
          };
        }
      }
    }
  }

  // Upload Student Photo to Supabase Storage Bucket ('athlete-photos') with strict validation
  let photoUrl: string | null = null;
  const photoFile = formData.get('photo') as File | null;
  const photoData = formData.get('photoData') as string | null;

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
  const ALLOWED_MIME_TYPES: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };

  try {
    // Ensure bucket exists
    await supabaseAdmin.storage.createBucket('athlete-photos', { public: true }).catch(() => {});

    if (photoFile && photoFile.size > 0 && typeof photoFile.arrayBuffer === 'function') {
      if (photoFile.size > MAX_FILE_SIZE) {
        return { success: false, error: 'Photo size exceeds the maximum limit of 5MB.' };
      }
      const rawMime = (photoFile.type || 'image/jpeg').toLowerCase();
      const safeExt = ALLOWED_MIME_TYPES[rawMime];
      if (!safeExt) {
        return { success: false, error: 'Invalid photo format. Only JPG, PNG, and WebP images are permitted.' };
      }

      const bytes = await photoFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const storagePath = `${session.squadId}/${Date.now()}_${usn}.${safeExt}`;

      const { data: uploadResult, error: uploadErr } = await supabaseAdmin.storage
        .from('athlete-photos')
        .upload(storagePath, buffer, {
          contentType: rawMime,
          upsert: true,
        });

      if (uploadErr) console.error('Storage upload error:', uploadErr.message);
      if (!uploadErr && uploadResult) {
        const { data: pubData } = supabaseAdmin.storage
          .from('athlete-photos')
          .getPublicUrl(uploadResult.path);
        photoUrl = pubData.publicUrl;
      }
    } else if (photoData && photoData.startsWith('data:image')) {
      const match = photoData.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mime = match[1].toLowerCase();
        const safeExt = ALLOWED_MIME_TYPES[mime];
        if (!safeExt) {
          return { success: false, error: 'Invalid photo format. Only JPG, PNG, and WebP images are permitted.' };
        }

        const buffer = Buffer.from(match[2], 'base64');
        if (buffer.length > MAX_FILE_SIZE) {
          return { success: false, error: 'Photo size exceeds the maximum limit of 5MB.' };
        }

        const storagePath = `${session.squadId}/${Date.now()}_${usn}.${safeExt}`;

        const { data: uploadResult, error: uploadErr } = await supabaseAdmin.storage
          .from('athlete-photos')
          .upload(storagePath, buffer, {
            contentType: mime,
            upsert: true,
          });

        if (uploadErr) console.error('Storage upload error:', uploadErr.message);
        if (!uploadErr && uploadResult) {
          const { data: pubData } = supabaseAdmin.storage
            .from('athlete-photos')
            .getPublicUrl(uploadResult.path);
          photoUrl = pubData.publicUrl;
        }
      }
    }
  } catch (storageErr) {
    console.error('Athlete photo upload failed:', storageErr);
    return { success: false, error: 'The athlete photo could not be uploaded. Please try again.' };
  }

  // Photo is mandatory for the accreditation ID card: never save an athlete without one
  if (!photoUrl) {
    const hadPhoto = Boolean((photoFile && photoFile.size > 0) || (photoData && photoData.startsWith('data:image')));
    return {
      success: false,
      error: hadPhoto
        ? 'The athlete photo could not be uploaded. Please try again.'
        : 'A passport-size photo (JPG, PNG or WebP, max 5MB) is mandatory for every athlete.',
    };
  }

  // Insert athlete profile
  let insertPayload: any = {
    squad_id: session.squadId,
    sslc_name: sslcName,
    usn,
    semester,
    blood_group: bloodGroup,
    college_joining_date: collegeJoiningDate,
    sem_start_date: semStartDate,
    aadhaar_number: aadhaarNumber || null,
    date_of_birth: dateOfBirth,
    photo_url: photoUrl,
    accreditation_status: 'REGISTERED',
  };

  let { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .insert(insertPayload)
    .select('id')
    .single();

  // Fallback if schema does not yet have aadhaar_number or photo_url columns
  if (profileErr && profileErr.message?.includes('does not exist')) {
    delete insertPayload.aadhaar_number;
    delete insertPayload.photo_url;
    const retry = await supabaseAdmin
      .from('profiles')
      .insert(insertPayload)
      .select('id')
      .single();
    profile = retry.data;
    profileErr = retry.error;
  }

  if (profileErr || !profile) {
    if (profileErr?.code === '23505') {
      return { success: false, error: `An athlete with USN '${usn}' is already registered in this squad.` };
    }
    return { success: false, error: profileErr?.message || 'Failed to save athlete profile.' };
  }

  // Build registration records
  type RegKind = 'regular' | 'reserve' | 'relay' | 'half_marathon';
  const registrationInserts: { profile_id: string; event_id: string; kind: RegKind }[] = [];

  if (event1Id) {
    registrationInserts.push({ profile_id: profile.id, event_id: event1Id, kind: 'regular' });
  }

  if (event2Id) {
    registrationInserts.push({ profile_id: profile.id, event_id: event2Id, kind: 'regular' });
  }

  if (reserveEventId) {
    registrationInserts.push({ profile_id: profile.id, event_id: reserveEventId, kind: 'reserve' });
  }

  if (isRelay && relayEventId) {
    registrationInserts.push({ profile_id: profile.id, event_id: relayEventId, kind: 'relay' });
  }

  if (isRelay400 && relay400EventId) {
    registrationInserts.push({ profile_id: profile.id, event_id: relay400EventId, kind: 'relay' });
  }

  if (isMixedRelay && mixedRelayEventId) {
    registrationInserts.push({ profile_id: profile.id, event_id: mixedRelayEventId, kind: 'relay' });
  }

  // If half-marathon selected, register in the gender-appropriate HM event
  if (isHalfMarathon) {
    const { data: hmEvent } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('code', session.gender === 'men' ? 'HM-M' : 'HM-W')
      .maybeSingle();

    if (!hmEvent) {
      await supabaseAdmin.from('profiles').delete().eq('id', profile.id);
      return { success: false, error: 'The Half Marathon event is not configured in the championship catalogue. Please contact the VTU Directorate.' };
    }
    if (!registrationInserts.some(r => r.event_id === hmEvent.id)) {
      registrationInserts.push({ profile_id: profile.id, event_id: hmEvent.id, kind: 'half_marathon' });
    }
  }

  if (registrationInserts.length === 0) {
    await supabaseAdmin.from('profiles').delete().eq('id', profile.id);
    return { success: false, error: 'No valid events were selected for this athlete registration.' };
  }

  // Insert event registrations
  const { error: regErr } = await supabaseAdmin
    .from('registrations')
    .insert(registrationInserts);

  if (regErr) {
    await supabaseAdmin.from('profiles').delete().eq('id', profile.id);
    return { success: false, error: regErr.message };
  }

    revalidatePath('/squad/athletes');
    revalidatePath('/squad/dashboard');
    revalidatePath('/squad/payment');

    return { success: true, athleteId: profile.id };
  } catch (err: any) {
    console.error('addAthleteAction error:', err);
    return { success: false, error: err?.message || 'Failed to save athlete profile.' };
  }
}

/**
 * Removes an athlete from the squad roster (allowed only while roster is unlocked).
 */
export async function deleteAthleteAction(profileId: string): Promise<{ success: boolean; error?: string }> {
  const session = await requireSquad();

  // Roster lock + global registration window enforcement
  const lockError = await getRosterMutationBlock(session.squadId);
  if (lockError) {
    return { success: false, error: lockError };
  }

  // IDOR protection: verify the athlete belongs to this squad BEFORE touching any child rows
  const { data: owned } = await supabaseAdmin
    .from('profiles')
    .select('id, bid_number')
    .eq('id', profileId)
    .eq('squad_id', session.squadId)
    .maybeSingle();

  if (!owned) {
    return { success: false, error: 'Athlete not found in your squad roster.' };
  }

  // A numbered athlete may already be on printed cards / heat sheets: removing them must go
  // through the Directorate's withdrawal (keeps the bib reserved and logs an amendment).
  if (owned.bid_number) {
    return {
      success: false,
      error: `This athlete already has bib number ${owned.bid_number}. Contact the VTU Directorate to withdraw or substitute them.`,
    };
  }

  // Clean up child rows first (registrations, relay memberships, heat slots) so the
  // profile delete never trips a foreign key, even on schemas without ON DELETE CASCADE.
  const { error: regDelErr } = await supabaseAdmin.from('registrations').delete().eq('profile_id', profileId);
  if (regDelErr) return { success: false, error: regDelErr.message };

  const { error: relayDelErr } = await supabaseAdmin.from('relay_members').delete().eq('profile_id', profileId);
  if (relayDelErr) return { success: false, error: relayDelErr.message };

  // heat_athletes may not exist before scheduling; ignore its errors (FK is ON DELETE CASCADE)
  await supabaseAdmin.from('heat_athletes').delete().eq('profile_id', profileId);

  const { error } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', profileId)
    .eq('squad_id', session.squadId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/squad/relay');

  revalidatePath('/squad/athletes');
  revalidatePath('/squad/dashboard');
  revalidatePath('/squad/payment');
  return { success: true };
}

export interface UpdateAthleteResult {
  success: boolean;
  error?: string;
  athlete?: {
    id: string;
    sslc_name: string;
    usn: string;
    semester: number;
    blood_group: string;
    college_joining_date: string;
    sem_start_date: string;
    aadhaar_number: string;
    date_of_birth: string;
    photo_url?: string;
  };
}

const BLOOD_GROUPS = new Set(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']);

/**
 * Corrects an athlete's identification bio-data (name, USN, semester, blood group, dates,
 * Aadhaar) and optionally replaces the photo. Event selections are NOT changed here:
 * quotas, fees and relay lineups depend on them, so event changes are remove + re-register.
 * Allowed only while the roster is unlocked (same guard as add/delete).
 */
export async function updateAthleteAction(formData: FormData): Promise<UpdateAthleteResult> {
  try {
    const session = await requireSquad();

    const lockError = await getRosterMutationBlock(session.squadId);
    if (lockError) return { success: false, error: lockError };

    const profileId = (formData.get('profileId') as string || '').trim();
    const sslcName = (formData.get('sslcName') as string || '').trim();
    const usn = (formData.get('usn') as string || '').trim().toUpperCase();
    const semester = parseInt(formData.get('semester') as string, 10);
    const bloodGroup = (formData.get('bloodGroup') as string || '').trim();
    const collegeJoiningDate = (formData.get('collegeJoiningDate') as string || '').trim();
    const semStartDate = (formData.get('semStartDate') as string || '').trim();
    const aadhaarNumber = (formData.get('aadhaarNumber') as string || '').trim().replace(/[\s-]/g, '');
    const dateOfBirth = (formData.get('dateOfBirth') as string || '').trim();
    const photoData = (formData.get('photoData') as string | null) || '';

    if (!profileId) return { success: false, error: 'Athlete not specified.' };

    // IDOR protection: athlete must belong to this squad
    const { data: owned } = await supabaseAdmin
      .from('profiles')
      .select('id, photo_url')
      .eq('id', profileId)
      .eq('squad_id', session.squadId)
      .maybeSingle();
    if (!owned) return { success: false, error: 'Athlete not found in your squad roster.' };

    if (!sslcName || !usn || !semester || !bloodGroup || !collegeJoiningDate || !semStartDate || !aadhaarNumber) {
      return { success: false, error: 'All student identification fields (including 12-digit Aadhaar Number) are mandatory.' };
    }
    if (!/^\d{12}$/.test(aadhaarNumber)) {
      return { success: false, error: 'Aadhaar Number must be exactly 12 numeric digits.' };
    }
    if (!VTU_USN_REGEX.test(usn)) {
      return { success: false, error: `Invalid USN '${usn}'. Enter a valid VTU USN (e.g. 1RV21CS001).` };
    }
    if (!Number.isInteger(semester) || semester < 1 || semester > 8) {
      return { success: false, error: 'Semester must be between 1 and 8.' };
    }
    if (!BLOOD_GROUPS.has(bloodGroup)) {
      return { success: false, error: 'Please select a valid blood group.' };
    }
    const dobError = validateDateOfBirth(dateOfBirth);
    if (dobError) {
      return { success: false, error: dobError };
    }
    const joiningDateObj = new Date(collegeJoiningDate);
    const semStartDateObj = new Date(semStartDate);
    if (isNaN(joiningDateObj.getTime()) || isNaN(semStartDateObj.getTime())) {
      return { success: false, error: 'Please enter valid dates.' };
    }
    if (joiningDateObj > new Date()) {
      return { success: false, error: 'College joining date cannot be in the future.' };
    }
    if (semStartDateObj < joiningDateObj) {
      return { success: false, error: 'Current semester start date cannot be earlier than college joining date.' };
    }

    // Championship-wide uniqueness, excluding this athlete
    const [{ data: aadhaarClash }, { data: usnClash }] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, sslc_name').eq('aadhaar_number', aadhaarNumber).neq('id', profileId).maybeSingle(),
      supabaseAdmin.from('profiles').select('id, sslc_name').eq('usn', usn).neq('id', profileId).maybeSingle(),
    ]);
    if (aadhaarClash) {
      return { success: false, error: `An athlete with Aadhaar '${aadhaarNumber}' is already registered (${aadhaarClash.sslc_name}).` };
    }
    if (usnClash) {
      return { success: false, error: `An athlete with USN '${usn}' is already registered (${usnClash.sslc_name}).` };
    }

    // Optional photo replacement
    let photoUrl: string | undefined;
    if (photoData) {
      const match = photoData.match(/^data:([^;]+);base64,(.+)$/);
      const ALLOWED: Record<string, string> = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
      const mime = match?.[1]?.toLowerCase() || '';
      const ext = ALLOWED[mime];
      if (!match || !ext) {
        return { success: false, error: 'Invalid photo format. Only JPG, PNG, and WebP images are permitted.' };
      }
      const buffer = Buffer.from(match[2], 'base64');
      if (buffer.length > 5 * 1024 * 1024) {
        return { success: false, error: 'Photo size exceeds the maximum limit of 5MB.' };
      }
      const storagePath = `${session.squadId}/${Date.now()}_${usn}.${ext}`;
      const { data: uploadResult, error: uploadErr } = await supabaseAdmin.storage
        .from('athlete-photos')
        .upload(storagePath, buffer, { contentType: mime, upsert: true });
      if (uploadErr || !uploadResult) {
        if (uploadErr) console.error('Storage upload error:', uploadErr.message);
        return { success: false, error: 'The athlete photo could not be uploaded. Please try again.' };
      }
      photoUrl = supabaseAdmin.storage.from('athlete-photos').getPublicUrl(uploadResult.path).data.publicUrl;
    }

    const updatePayload: Record<string, any> = {
      sslc_name: sslcName,
      usn,
      semester,
      blood_group: bloodGroup,
      college_joining_date: collegeJoiningDate,
      sem_start_date: semStartDate,
      aadhaar_number: aadhaarNumber,
      date_of_birth: dateOfBirth,
      updated_at: new Date().toISOString(),
    };
    if (photoUrl) updatePayload.photo_url = photoUrl;

    const { error: updErr } = await supabaseAdmin
      .from('profiles')
      .update(updatePayload)
      .eq('id', profileId)
      .eq('squad_id', session.squadId);

    if (updErr) {
      if (updErr.code === '23505') {
        return { success: false, error: 'Another athlete is already registered with this USN or Aadhaar number.' };
      }
      return { success: false, error: updErr.message };
    }

    revalidatePath('/squad/athletes');
    revalidatePath('/squad/dashboard');
    revalidatePath('/squad/relay');
    revalidatePath('/squad/cards');

    return {
      success: true,
      athlete: {
        id: profileId,
        sslc_name: sslcName,
        usn,
        semester,
        blood_group: bloodGroup,
        college_joining_date: collegeJoiningDate,
        sem_start_date: semStartDate,
        aadhaar_number: aadhaarNumber,
        date_of_birth: dateOfBirth,
        photo_url: photoUrl || owned.photo_url || undefined,
      },
    };
  } catch (err: any) {
    console.error('updateAthleteAction error:', err);
    return { success: false, error: err?.message || 'Failed to update athlete.' };
  }
}

/**
 * One-time date-of-birth fill for athletes registered before DOB was collected.
 * DOB affects neither events nor fees, so it is allowed even on a locked / paid roster —
 * but only while it is still empty. Changing an existing DOB needs the roster unlocked
 * (Edit), or the VTU Directorate.
 */
export async function setAthleteDateOfBirthAction(
  profileId: string,
  dateOfBirth: string
): Promise<{ success: boolean; error?: string }> {
  const session = await requireSquad();

  const dobError = validateDateOfBirth(dateOfBirth);
  if (dobError) return { success: false, error: dobError };

  const { data: owned } = await supabaseAdmin
    .from('profiles')
    .select('id, date_of_birth')
    .eq('id', profileId)
    .eq('squad_id', session.squadId)
    .maybeSingle();
  if (!owned) return { success: false, error: 'Athlete not found in your squad roster.' };
  if (owned.date_of_birth) {
    return { success: false, error: 'Date of birth is already recorded. To correct it, use Edit (roster unlocked) or contact the VTU Directorate.' };
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ date_of_birth: dateOfBirth, updated_at: new Date().toISOString() })
    .eq('id', profileId)
    .eq('squad_id', session.squadId)
    .is('date_of_birth', null);
  if (error) return { success: false, error: error.message };

  revalidatePath('/squad/athletes');
  revalidatePath('/squad/dashboard');
  return { success: true };
}

/**
 * Lists all athletes registered in the current squad with Aadhaar, photo, and event breakdown.
 */
export async function listSquadAthletesAction() {
  const session = await requireSquad();

  let { data: athletes, error } = await supabaseAdmin
    .from('profiles')
    .select(`
      id,
      sslc_name,
      usn,
      semester,
      blood_group,
      college_joining_date,
      sem_start_date,
      aadhaar_number,
      date_of_birth,
      photo_url,
      bid_number,
      accreditation_status,
      created_at,
      squads (
        id,
        gender,
        squad_code,
        payment_status,
        ped_name,
        ped_phone,
        colleges (
          name,
          code,
          district
        )
      ),
      registrations (
        id,
        kind,
        event_id,
        events (
          id,
          name,
          code,
          category
        )
      )
    `)
    .eq('squad_id', session.squadId)
    .order('created_at', { ascending: true });

  // Safe fallback if database columns haven't been added yet
  if (error && error.message?.includes('does not exist')) {
    const fallback = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        sslc_name,
        usn,
        semester,
        blood_group,
        college_joining_date,
        sem_start_date,
        bid_number,
        accreditation_status,
        created_at,
        registrations (
          id,
          kind,
          event_id,
          events (
            id,
            name,
            code,
            category
          )
        )
      `)
      .eq('squad_id', session.squadId)
      .order('created_at', { ascending: true });

    athletes = fallback.data as any;
    error = fallback.error;
  }

  if (error) throw new Error(error.message);
  // Signed QR for ID cards / AURA apps (secret stays on the server)
  return (athletes || []).map((a: any) => ({ ...a, qr_token: makeAthleteQrToken(a.id) }));
}

/**
 * Fetches count of athletes registered for 4x100m relay in the current squad.
 */
export async function getSquadRelayCountAction(): Promise<number> {
  const session = await requireSquad();
  const relayCodes = session.gender === 'men'
    ? ['4X100M-M', '4X400M-M', '4X400M-MIX']
    : ['4X100M-W', '4X400M-W', '4X400M-MIX'];

  const { data: relayEvents } = await supabaseAdmin
    .from('events')
    .select('id')
    .in('code', relayCodes);

  if (!relayEvents || relayEvents.length === 0) return 0;
  const relayEventIds = relayEvents.map((e: any) => e.id);

  const { data: squadProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('squad_id', session.squadId);
  const profileIds = (squadProfiles || []).map((p: any) => p.id);

  if (profileIds.length === 0) return 0;

  const { count } = await supabaseAdmin
    .from('registrations')
    .select('id', { count: 'exact', head: true })
    .in('profile_id', profileIds)
    .in('event_id', relayEventIds);

  return count || 0;
}

/**
 * Fetches events available for the current squad's gender division.
 * Exposes all official individual championship events from Order of Events PDF (Codes 1–19, 23, 24/25).
 */
export async function getAvailableEventsAction() {
  const session = await requireSquad();

  const { data: events, error } = await supabaseAdmin
    .from('events')
    .select('id, name, code, category, start_type, has_rounds')
    .eq('gender', session.gender)
    .neq('category', 'relay')
    .neq('category', 'road')
    .not('code', 'ilike', '4X%')
    .not('code', 'ilike', 'HM-%')
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return events || [];
}
