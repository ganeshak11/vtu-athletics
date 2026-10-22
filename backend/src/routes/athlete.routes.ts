import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate, requireRole, generateToken, AuthenticatedRequest } from '../middleware/auth';
import { cacheResponse } from '../middleware/cache';

export const athleteRouter = Router();

/**
 * POST /api/athlete/login
 * Athlete logs in with their USN or Chest/Bib Number
 */
athleteRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body; // USN or Chest Number

    if (!identifier || typeof identifier !== 'string') {
      return res.status(400).json({ error: 'Please enter your USN or Chest/Bib number.' });
    }

    const trimmed = identifier.trim().toUpperCase();

    // Search by USN or by bid_number
    let query = supabase
      .from('profiles')
      .select(`
        id,
        sslc_name,
        usn,
        bid_number,
        blood_group,
        accreditation_status,
        squads (
          id,
          squad_code,
          gender,
          colleges (
            id,
            name,
            code
          )
        )
      `);

    // If identifier is numeric, search bid_number or USN
    if (/^\d+$/.test(trimmed)) {
      query = query.or(`bid_number.eq.${parseInt(trimmed, 10)},usn.eq.${trimmed}`);
    } else {
      query = query.eq('usn', trimmed);
    }

    const { data: athletes, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!athletes || athletes.length === 0) {
      return res.status(404).json({
        error: `No athlete found with USN/Chest number "${trimmed}". Please contact your college team manager.`,
      });
    }

    const athlete = athletes[0];

    const token = generateToken({
      role: 'athlete',
      entityId: athlete.id,
      displayName: athlete.sslc_name,
      collegeId: (athlete.squads as any)?.colleges?.id,
    });

    return res.json({
      success: true,
      token,
      athlete: {
        id: athlete.id,
        name: athlete.sslc_name,
        usn: athlete.usn,
        bidNumber: athlete.bid_number,
        bloodGroup: athlete.blood_group,
        accreditationStatus: athlete.accreditation_status,
        college: (athlete.squads as any)?.colleges,
        qrPayload: `vtu-athlete:${athlete.id}`,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/athlete/me
 * Full athlete profile, dynamic QR code payload, registered events, upcoming heats, and results
 */
athleteRouter.get('/me', authenticate, requireRole(['athlete']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const athleteId = req.user!.entityId;

    // 1. Fetch Profile
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select(`
        id,
        sslc_name,
        usn,
        bid_number,
        blood_group,
        accreditation_status,
        accredited_at,
        squads (
          id,
          squad_code,
          gender,
          colleges (id, name, code, district)
        )
      `)
      .eq('id', athleteId)
      .single();

    if (profErr || !profile) {
      return res.status(404).json({ error: 'Athlete profile not found.' });
    }

    // 2. Fetch Registrations
    const { data: registrations, error: regErr } = await supabase
      .from('registrations')
      .select(`
        id,
        kind,
        events (
          id,
          name,
          code,
          gender,
          category,
          measurement_unit,
          start_type
        )
      `)
      .eq('profile_id', athleteId);

    if (regErr) {
      return res.status(400).json({ error: regErr.message });
    }

    // 3. Fetch Heat & Lane Assignments with Live Status & Results
    const { data: heatAssignments, error: heatErr } = await supabase
      .from('heat_athletes')
      .select(`
        id,
        lane_number,
        call_room_reported,
        call_room_reported_at,
        heats (
          id,
          stage,
          heat_number,
          status,
          wind_reading,
          schedule_item_id,
          events (id, name, code, category),
          schedule_items (
            scheduled_time,
            call_room_time,
            status,
            session_id,
            schedule_sessions (session_name, session_date)
          )
        ),
        track_results (
          id,
          time_seconds,
          reaction_time_ms,
          status,
          dq_rule
        ),
        field_attempts (
          id,
          round_number,
          attempt_type,
          mark_meters,
          wind_reading
        ),
        vertical_jump_attempts (
          id,
          bar_height_meters,
          attempt_number,
          result
        )
      `)
      .eq('profile_id', athleteId);

    if (heatErr) {
      return res.status(400).json({ error: heatErr.message });
    }

    // 4. Generate Real-Time Event Alerts & Notifications
    const notifications: Array<{ id: string; type: 'URGENT' | 'INFO' | 'SUCCESS'; title: string; message: string; timestamp: string }> = [];

    (heatAssignments || []).forEach((ha: any) => {
      const heat = ha.heats;
      const eventName = heat?.events?.name || 'Event';

      if (heat?.status === 'CALL_ROOM') {
        notifications.push({
          id: `callroom-${heat.id}`,
          type: 'URGENT',
          title: '🚨 Call Room Open!',
          message: `Please report to the Call Room immediately for ${eventName} (Heat ${heat.heat_number}, Lane ${ha.lane_number}). Ensure your spikes are ≤ 9mm.`,
          timestamp: new Date().toISOString(),
        });
      } else if (heat?.status === 'ON_TRACK') {
        notifications.push({
          id: `ontrack-${heat.id}`,
          type: 'URGENT',
          title: '🏃 Heat On Track!',
          message: `${eventName} (Heat ${heat.heat_number}) is moving to starting blocks/field runway now.`,
          timestamp: new Date().toISOString(),
        });
      } else if (heat?.status === 'COMPLETED') {
        notifications.push({
          id: `completed-${heat.id}`,
          type: 'SUCCESS',
          title: '🏁 Heat Completed',
          message: `Official results for ${eventName} (Heat ${heat.heat_number}) have been recorded.`,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // 4. Fetch Today's Claimed Meals
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: todayMeals } = await supabase
      .from('meal_logs')
      .select('meal_type, scanned_at')
      .eq('profile_id', athleteId)
      .eq('meal_date', todayStr);

    const mealsClaimed = {
      breakfast: todayMeals?.some((m) => m.meal_type === 'BREAKFAST') || false,
      lunch: todayMeals?.some((m) => m.meal_type === 'LUNCH') || false,
      snacks: todayMeals?.some((m) => m.meal_type === 'SNACKS') || false,
      dinner: todayMeals?.some((m) => m.meal_type === 'DINNER') || false,
      logs: todayMeals || [],
    };

    return res.json({
      athlete: {
        id: profile.id,
        name: profile.sslc_name,
        usn: profile.usn,
        bidNumber: profile.bid_number,
        gender: (profile.squads as any)?.gender,
        bloodGroup: profile.blood_group,
        accreditationStatus: profile.accreditation_status,
        accreditedAt: profile.accredited_at,
        college: (profile.squads as any)?.colleges,
        qrPayload: `vtu-athlete:${profile.id}`,
      },
      events: registrations?.map((r: any) => r.events) || [],
      heatAssignments: heatAssignments || [],
      todayMeals: mealsClaimed,
      notifications,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
