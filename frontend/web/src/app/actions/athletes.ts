'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { requireSquad } from '@/lib/auth-guard';
import { revalidatePath } from 'next/cache';

export interface AddAthleteResult {
  success: boolean;
  error?: string;
  athleteId?: string;
}

/**
 * Registers a new student-athlete for the current squad.
 * Validates individual event quotas, Aadhaar format, photo upload to Supabase storage,
 * and relay team squad limits (max 4 per college division).
 */
export async function addAthleteAction(formData: FormData): Promise<AddAthleteResult> {
  try {
    const session = await requireSquad();

    // Check if registration is globally closed
    const { data: meetSettings } = await supabaseAdmin
      .from('meet_settings')
      .select('registration_open')
      .limit(1)
      .maybeSingle();

    if (meetSettings && meetSettings.registration_open === false) {
      return { success: false, error: 'Championship registrations are officially closed by the VTU Directorate.' };
    }

    // Check if squad roster is locked
    const { data: squad } = await supabaseAdmin
      .from('squads')
      .select('roster_locked')
      .eq('id', session.squadId)
      .single();

    if (squad?.roster_locked) {
      return { success: false, error: 'Roster is locked post-payment. Contact the Meet Director to request changes.' };
    }

  const sslcName = (formData.get('sslcName') as string || '').trim();
  const usn = (formData.get('usn') as string || '').trim().toUpperCase();
  const semester = parseInt(formData.get('semester') as string, 10);
  const bloodGroup = (formData.get('bloodGroup') as string || '').trim();
  const collegeJoiningDate = formData.get('collegeJoiningDate') as string;
  const semStartDate = formData.get('semStartDate') as string;
  const aadhaarNumber = (formData.get('aadhaarNumber') as string || '').trim().replace(/[\s-]/g, '');

  const event1Id = formData.get('event1Id') as string;
  const event2Id = formData.get('event2Id') as string;
  const reserveEventId = formData.get('reserveEventId') as string;
  const isRelay = formData.get('isRelay') === 'true' || formData.get('isRelay') === 'on';
  const isHalfMarathon = formData.get('isHalfMarathon') === 'true' || formData.get('isHalfMarathon') === 'on';

  // Identification Validation
  if (!sslcName || !usn || !semester || !bloodGroup || !collegeJoiningDate || !semStartDate || !aadhaarNumber) {
    return { success: false, error: 'All student identification fields (including 12-digit Aadhaar Number) are mandatory.' };
  }

  if (!/^\d{12}$/.test(aadhaarNumber)) {
    return { success: false, error: 'Aadhaar Number must be exactly 12 numeric digits.' };
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
  if (!event1Id) {
    return { success: false, error: 'Event 1 is compulsory. Please select at least one primary event.' };
  }

  if (event2Id && event1Id === event2Id) {
    return { success: false, error: 'Event 1 and Event 2 cannot be the same event.' };
  }

  if (reserveEventId && (reserveEventId === event1Id || reserveEventId === event2Id)) {
    return { success: false, error: 'Reserve event must be distinct from regular events.' };
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

  // 4x100m Relay Quota Enforcement (Max 4 athletes per college squad)
  let relayEventId: string | null = null;
  if (isRelay) {
    const relayCode = session.gender === 'men' ? '4X100M-M' : '4X100M-W';
    const { data: relayEvent } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('code', relayCode)
      .maybeSingle();

    if (relayEvent) {
      relayEventId = relayEvent.id;
      if (squadProfileIds.length > 0) {
        const { count: relayCount } = await supabaseAdmin
          .from('registrations')
          .select('id', { count: 'exact', head: true })
          .in('profile_id', squadProfileIds)
          .eq('event_id', relayEvent.id);

        if ((relayCount || 0) >= 4) {
          return {
            success: false,
            error: 'Your college squad has already reached the maximum quota of 4 athletes for the 4x100m relay.',
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

        if (!uploadErr && uploadResult) {
          const { data: pubData } = supabaseAdmin.storage
            .from('athlete-photos')
            .getPublicUrl(uploadResult.path);
          photoUrl = pubData.publicUrl;
        }
      }
    }
  } catch (storageErr) {
    console.error('Storage bucket upload warning:', storageErr);
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
  const registrationInserts: { profile_id: string; event_id: string; kind: RegKind }[] = [
    { profile_id: profile.id, event_id: event1Id, kind: 'regular' },
  ];

  if (event2Id) {
    registrationInserts.push({ profile_id: profile.id, event_id: event2Id, kind: 'regular' });
  }

  if (reserveEventId) {
    registrationInserts.push({ profile_id: profile.id, event_id: reserveEventId, kind: 'reserve' });
  }

  if (isRelay && relayEventId) {
    registrationInserts.push({ profile_id: profile.id, event_id: relayEventId, kind: 'relay' });
  }

  // If half-marathon selected, register in the gender-appropriate HM event
  if (isHalfMarathon) {
    const { data: hmEvent } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('code', session.gender === 'men' ? 'HM-M' : 'HM-W')
      .maybeSingle();

    if (hmEvent) {
      registrationInserts.push({ profile_id: profile.id, event_id: hmEvent.id, kind: 'half_marathon' });
    }
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

  // Check if registration is globally closed
  const { data: meetSettings } = await supabaseAdmin
    .from('meet_settings')
    .select('registration_open')
    .limit(1)
    .maybeSingle();

  if (meetSettings && meetSettings.registration_open === false) {
    return { success: false, error: 'Registration is officially closed. Contact the Meet Director to request athlete removals.' };
  }

  const { data: squad } = await supabaseAdmin
    .from('squads')
    .select('roster_locked')
    .eq('id', session.squadId)
    .single();

  if (squad?.roster_locked) {
    return { success: false, error: 'Cannot remove athletes while roster is locked.' };
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', profileId)
    .eq('squad_id', session.squadId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/squad/athletes');
  revalidatePath('/squad/dashboard');
  revalidatePath('/squad/payment');
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
      photo_url,
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
  return athletes || [];
}

/**
 * Fetches count of athletes registered for 4x100m relay in the current squad.
 */
export async function getSquadRelayCountAction(): Promise<number> {
  const session = await requireSquad();
  const relayCode = session.gender === 'men' ? '4X100M-M' : '4X100M-W';

  const { data: relayEvent } = await supabaseAdmin
    .from('events')
    .select('id')
    .eq('code', relayCode)
    .maybeSingle();

  if (!relayEvent) return 0;

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
    .eq('event_id', relayEvent.id);

  return count || 0;
}

/**
 * Fetches events available for the current squad's gender division.
 */
export async function getAvailableEventsAction() {
  const session = await requireSquad();

  const { data: events, error } = await supabaseAdmin
    .from('events')
    .select('id, name, code, category, start_type, has_rounds')
    .eq('gender', session.gender)
    .neq('category', 'relay')
    .not('code', 'ilike', '4X%')
    .not('code', 'ilike', 'HM%')
    .not('name', 'ilike', '%Half Marathon%')
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return events || [];
}
