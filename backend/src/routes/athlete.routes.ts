import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { supabase } from '../config/supabase';
import { authenticate, requireRole, generateToken, AuthenticatedRequest } from '../middleware/auth';
import { makeAthleteQrToken, verifyAthleteQrToken } from '../utils/athlete-qr';
import { isLoginThrottled, recordLoginFailure, clearLoginFailures, THROTTLE_MESSAGE } from '../utils/login-throttle';

/**
 * AURA Athletes app API.
 *
 *   POST   /api/athlete/login        { bib, dob }  or  { qrToken }
 *   GET    /api/athlete/me           profile, photo, events, schedule (heat/lane/call room), hostel, meals
 *   POST   /api/athlete/push-token   { token, platform }  register this device for push notifications
 *   DELETE /api/athlete/push-token   { token }            unregister on logout
 *
 * All meet times are India Standard Time; the API returns absolute ISO timestamps
 * (with +05:30) so phones in any timezone schedule reminders correctly.
 */
export const athleteRouter = Router();

const IST_OFFSET = '+05:30';
/** Fallback when an event has no explicit call room time: report this long before the start */
const DEFAULT_CALL_ROOM_LEAD_MIN = 30;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts from this network. Please wait 15 minutes.' },
});

function istIso(date?: string | null, time?: string | null): string | null {
  if (!date || !time) return null;
  const t = String(time).slice(0, 8);
  const iso = `${date}T${t.length === 5 ? `${t}:00` : t}${IST_OFFSET}`;
  return isNaN(new Date(iso).getTime()) ? null : iso;
}

function istToday(): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

/**
 * POST /api/athlete/login
 * Body: { bib: number|string, dob: "YYYY-MM-DD" }  — or —  { qrToken: "AURA26.<id>.<sig>" }
 */
athleteRouter.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const ip = req.ip || 'unknown';
    const qrToken = typeof req.body?.qrToken === 'string' ? req.body.qrToken.trim() : '';
    let profileId: string | null = null;
    let throttleKey = '';

    if (qrToken) {
      profileId = verifyAthleteQrToken(qrToken);
      if (!profileId) {
        return res.status(401).json({ error: 'This QR code is not a valid AURA athlete ID card.' });
      }
    } else {
      const bibRaw = String(req.body?.bib ?? '').trim();
      const dob = String(req.body?.dob ?? '').trim();
      if (!/^\d{1,5}$/.test(bibRaw) || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
        return res.status(400).json({ error: 'Enter your bib number and date of birth.' });
      }
      const bib = parseInt(bibRaw, 10);
      throttleKey = String(bib);

      if (await isLoginThrottled('athlete', throttleKey, ip, 8, 40)) {
        return res.status(429).json({ error: THROTTLE_MESSAGE });
      }

      const { data: match, error } = await supabase
        .from('profiles')
        .select('id, date_of_birth')
        .eq('bid_number', bib)
        .neq('accreditation_status', 'WITHDrAWN')
        .maybeSingle();

      if (error) return res.status(500).json({ error: 'Login is temporarily unavailable. Please try again.' });

      if (match && !match.date_of_birth) {
        return res.status(409).json({
          error: 'Your date of birth has not been recorded yet. Ask your college PED to add it on the registration portal, or scan the QR on your ID card.',
        });
      }
      if (!match || match.date_of_birth !== dob) {
        await recordLoginFailure('athlete', throttleKey, ip);
        return res.status(401).json({ error: 'Bib number and date of birth do not match.' });
      }
      profileId = match.id;
    }

    const { data: athlete } = await supabase
      .from('profiles')
      .select('id, sslc_name, bid_number, accreditation_status, squads ( colleges ( id ) )')
      .eq('id', profileId)
      .maybeSingle();

    if (!athlete || athlete.accreditation_status === 'WITHDrAWN') {
      return res.status(404).json({ error: 'This athlete is not registered for the championship.' });
    }
    if (throttleKey) await clearLoginFailures('athlete', throttleKey);

    const token = generateToken({
      role: 'athlete',
      entityId: athlete.id,
      displayName: athlete.sslc_name,
      collegeId: (athlete.squads as any)?.colleges?.id,
    });

    return res.json({ success: true, token, athlete: { id: athlete.id, name: athlete.sslc_name, bibNumber: athlete.bid_number } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/athlete/me
 */
athleteRouter.get('/me', authenticate, requireRole(['athlete']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const athleteId = req.user!.entityId;

    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select(`
        id, sslc_name, usn, bid_number, blood_group, semester, photo_url,
        accreditation_status, accredited_at,
        squads ( id, squad_code, gender, colleges ( id, name, code, district ) )
      `)
      .eq('id', athleteId)
      .maybeSingle();

    if (profErr || !profile || profile.accreditation_status === 'WITHDrAWN') {
      return res.status(404).json({ error: 'Athlete profile not found.' });
    }
    const squad: any = profile.squads;

    // Registered events
    const { data: registrations } = await supabase
      .from('registrations')
      .select('kind, events ( id, name, code, category )')
      .eq('profile_id', athleteId);

    // Relay teams this athlete belongs to (leg or reserve)
    const { data: relayMemberships } = await supabase
      .from('relay_members')
      .select('relay_team_id, leg_order, is_reserve, relay_teams ( event_id )')
      .eq('profile_id', athleteId);
    const relayTeamIds = (relayMemberships || []).map((m: any) => m.relay_team_id);
    const relayByTeam = new Map((relayMemberships || []).map((m: any) => [m.relay_team_id, m]));

    // Heat assignments: individual + relay team entries
    const heatSelect = `
      id, lane_number, call_room_reported, call_room_reported_at, relay_team_id,
      heats (
        id, stage, heat_number, status,
        events ( id, name, code, category ),
        schedule_items ( scheduled_time, call_room_time, status, schedule_sessions ( session_date, session_name ) )
      )`;
    const [{ data: ownHeats }, { data: relayHeats }] = await Promise.all([
      supabase.from('heat_athletes').select(heatSelect).eq('profile_id', athleteId),
      relayTeamIds.length > 0
        ? supabase.from('heat_athletes').select(heatSelect).in('relay_team_id', relayTeamIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    type ScheduleEntry = {
      key: string;
      eventId: string;
      eventName: string;
      eventCode: string;
      category: string;
      kind: string;
      stage: string | null;
      heatNumber: number | null;
      lane: number | null;
      relayLeg: number | null;
      isRelayReserve: boolean;
      sessionName: string | null;
      startAt: string | null;
      callRoomAt: string | null;
      callRoomEstimated: boolean;
      status: string;
      reported: boolean;
    };
    const schedule: ScheduleEntry[] = [];
    const eventsWithHeats = new Set<string>();
    const kindByEvent = new Map<string, string>(
      (registrations || []).map((r: any) => [r.events?.id, r.kind])
    );

    for (const ha of [...(ownHeats || []), ...(relayHeats || [])] as any[]) {
      const heat = ha.heats;
      if (!heat?.events) continue;
      const si = heat.schedule_items;
      const date = si?.schedule_sessions?.session_date;
      const startAt = istIso(date, si?.scheduled_time);
      let callRoomAt = istIso(date, si?.call_room_time);
      const callRoomEstimated = !callRoomAt && !!startAt;
      if (!callRoomAt && startAt) {
        callRoomAt = new Date(new Date(startAt).getTime() - DEFAULT_CALL_ROOM_LEAD_MIN * 60000).toISOString();
      }
      const relay = ha.relay_team_id ? relayByTeam.get(ha.relay_team_id) : null;
      eventsWithHeats.add(heat.events.id);
      schedule.push({
        key: `heat-${ha.id}`,
        eventId: heat.events.id,
        eventName: heat.events.name,
        eventCode: heat.events.code,
        category: heat.events.category,
        kind: kindByEvent.get(heat.events.id) || (relay ? 'relay' : 'regular'),
        stage: heat.stage,
        heatNumber: heat.heat_number,
        lane: ha.lane_number,
        relayLeg: relay?.leg_order ?? null,
        isRelayReserve: !!relay?.is_reserve,
        sessionName: si?.schedule_sessions?.session_name || null,
        startAt,
        callRoomAt,
        callRoomEstimated,
        status: heat.status || si?.status || 'SCHEDULED',
        reported: !!ha.call_room_reported,
      });
    }

    // Registered events with no heat drawn yet: show the event's first scheduled round
    const pendingEventIds = (registrations || [])
      .map((r: any) => r.events?.id)
      .filter((id: string | undefined) => id && !eventsWithHeats.has(id));
    if (pendingEventIds.length > 0) {
      const { data: items } = await supabase
        .from('schedule_items')
        .select('event_id, stage, scheduled_time, call_room_time, status, schedule_sessions ( session_date, session_name )')
        .in('event_id', pendingEventIds);
      for (const r of (registrations || []) as any[]) {
        const ev = r.events;
        if (!ev || eventsWithHeats.has(ev.id)) continue;
        const rounds = (items || [])
          .filter((i: any) => i.event_id === ev.id)
          .map((i: any) => ({ i, startAt: istIso(i.schedule_sessions?.session_date, i.scheduled_time) }))
          .sort((a: any, b: any) => String(a.startAt).localeCompare(String(b.startAt)));
        const first = rounds[0];
        const startAt = first?.startAt || null;
        let callRoomAt = first ? istIso(first.i.schedule_sessions?.session_date, first.i.call_room_time) : null;
        const callRoomEstimated = !callRoomAt && !!startAt;
        if (!callRoomAt && startAt) {
          callRoomAt = new Date(new Date(startAt).getTime() - DEFAULT_CALL_ROOM_LEAD_MIN * 60000).toISOString();
        }
        schedule.push({
          key: `event-${ev.id}`,
          eventId: ev.id,
          eventName: ev.name,
          eventCode: ev.code,
          category: ev.category,
          kind: r.kind,
          stage: first?.i.stage || null,
          heatNumber: null,
          lane: null,
          relayLeg: null,
          isRelayReserve: false,
          sessionName: first?.i.schedule_sessions?.session_name || null,
          startAt,
          callRoomAt,
          callRoomEstimated,
          status: first?.i.status || 'SCHEDULED',
          reported: false,
        });
      }
    }

    schedule.sort((a, b) => {
      if (!a.startAt && !b.startAt) return a.eventName.localeCompare(b.eventName);
      if (!a.startAt) return 1;
      if (!b.startAt) return -1;
      return a.startAt.localeCompare(b.startAt);
    });

    // Hostel allocation (per squad) + this athlete's check-in
    const [{ data: hostelAlloc }, { data: checkin }] = await Promise.all([
      supabase.from('hostel_allocations').select('room_range, notes, hostels ( name )').eq('squad_id', squad?.id).maybeSingle(),
      supabase.from('accommodation_scans').select('room_assigned, synced_at').eq('profile_id', athleteId).order('synced_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    // Today's meals (India date)
    const today = istToday();
    const { data: todayMeals } = await supabase
      .from('meal_logs')
      .select('meal_type, scanned_at')
      .eq('profile_id', athleteId)
      .eq('meal_date', today);

    return res.json({
      serverTime: new Date().toISOString(),
      athlete: {
        id: profile.id,
        name: profile.sslc_name,
        usn: profile.usn,
        bibNumber: profile.bid_number,
        gender: squad?.gender || null,
        bloodGroup: profile.blood_group,
        semester: profile.semester,
        photoUrl: profile.photo_url || null,
        accreditationStatus: profile.accreditation_status,
        accreditedAt: profile.accredited_at,
        college: squad?.colleges || null,
        squadCode: squad?.squad_code || null,
        qrToken: makeAthleteQrToken(profile.id),
      },
      events: (registrations || [])
        .filter((r: any) => r.events)
        .map((r: any) => ({ kind: r.kind, id: r.events.id, name: r.events.name, code: r.events.code, category: r.events.category })),
      schedule,
      hostel: hostelAlloc
        ? {
            name: (hostelAlloc as any).hostels?.name || null,
            roomRange: hostelAlloc.room_range || null,
            notes: hostelAlloc.notes || null,
            checkedIn: !!checkin,
            room: checkin?.room_assigned || null,
            checkedInAt: checkin?.synced_at || null,
          }
        : null,
      meals: {
        date: today,
        claimed: (todayMeals || []).map((m: any) => ({ mealType: m.meal_type, at: m.scanned_at })),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/athlete/push-token  { token: "ExponentPushToken[...]", platform: "android"|"ios" }
 */
athleteRouter.post('/push-token', authenticate, requireRole(['athlete']), async (req: AuthenticatedRequest, res: Response) => {
  const token = String(req.body?.token || '').trim();
  const platform = req.body?.platform === 'ios' ? 'ios' : 'android';
  if (!/^Expo(nent)?PushToken\[[^\]]{10,}\]$/.test(token)) {
    return res.status(400).json({ error: 'Invalid push token.' });
  }
  const { error } = await supabase.from('device_push_tokens').upsert(
    {
      expo_push_token: token,
      app: 'athletes',
      profile_id: req.user!.entityId,
      staff_id: null,
      platform,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'expo_push_token' }
  );
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true });
});

/**
 * DELETE /api/athlete/push-token  { token }
 */
athleteRouter.delete('/push-token', authenticate, requireRole(['athlete']), async (req: AuthenticatedRequest, res: Response) => {
  const token = String(req.body?.token || '').trim();
  if (token) {
    await supabase.from('device_push_tokens').delete().eq('expo_push_token', token).eq('profile_id', req.user!.entityId);
  }
  return res.json({ success: true });
});
