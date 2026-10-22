import { Router, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { invalidateCache } from '../middleware/cache';

export const fieldRouter = Router();

fieldRouter.use(authenticate);
fieldRouter.use(requireRole(['meet_admin', 'referee']));

/**
 * GET /api/field/heats/:heatId
 * Fetches field flight athletes and all recorded attempts
 */
fieldRouter.get('/heats/:heatId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { heatId } = req.params;

    const { data: heat, error: heatErr } = await supabase
      .from('heats')
      .select('id, heat_number, stage, status, events(id, name, code, gender, category, measurement_unit)')
      .eq('id', heatId)
      .single();

    if (heatErr) return res.status(400).json({ error: heatErr.message });

    const isVertical = (heat.events as any)?.category === 'field_vertical_jump';

    let athletesQuery = supabase
      .from('heat_athletes')
      .select(`
        id,
        lane_number,
        profiles(id, sslc_name, usn, bid_number, squads(colleges(name, code))),
        ${isVertical ? 'vertical_jump_attempts(*)' : 'field_attempts(*)'}
      `)
      .eq('heat_id', heatId)
      .order('lane_number', { ascending: true });

    const { data: athletes, error: athErr } = await athletesQuery;
    if (athErr) return res.status(400).json({ error: athErr.message });

    return res.json({
      heat,
      isVertical,
      athletes: athletes || [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/field/attempt
 * Record a horizontal jump / throw attempt (Rounds 1–6)
 */
fieldRouter.post('/attempt', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      heatAthleteId,
      roundNumber,
      attemptType, // 'VALID', 'FOUL', 'PASS'
      markMeters,
      windReading,
    } = req.body;

    if (!heatAthleteId || !roundNumber || !attemptType) {
      return res.status(400).json({
        error: 'heatAthleteId, roundNumber, and attemptType are required.',
      });
    }

    const { data, error } = await supabase.rpc('submit_field_attempt', {
      p_heat_athlete_id: heatAthleteId,
      p_round_number: parseInt(roundNumber, 10),
      p_attempt_type: attemptType,
      p_mark_meters: markMeters ? parseFloat(markMeters) : null,
      p_wind: windReading ? parseFloat(windReading) : null,
      p_official_id: req.user!.entityId,
    });

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true, result: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/field/vertical-attempt
 * Record a vertical jump attempt for High Jump / Pole Vault ('O', 'X', '-')
 */
fieldRouter.post('/vertical-attempt', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      heatAthleteId,
      barHeight,
      attemptNumber,
      result, // 'O', 'X', '-'
    } = req.body;

    if (!heatAthleteId || !barHeight || !attemptNumber || !result) {
      return res.status(400).json({
        error: 'heatAthleteId, barHeight, attemptNumber, and result are required.',
      });
    }

    const { data, error } = await supabase.rpc('submit_vertical_jump_attempt', {
      p_heat_athlete_id: heatAthleteId,
      p_bar_height: parseFloat(barHeight),
      p_attempt_number: parseInt(attemptNumber, 10),
      p_result: result,
      p_official_id: req.user!.entityId,
    });

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true, result: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/field/standings/:heatId
 * Returns computed standings with Rule TR 26.8 countback tie-breakers
 */
fieldRouter.get('/standings/:heatId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { heatId } = req.params;

    const { data, error } = await supabase.rpc('compute_field_standings', {
      p_heat_id: heatId,
    });

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/field/finalize
 * Finalize field flight, mark heat COMPLETED, and award points if FINAL stage
 */
fieldRouter.post('/finalize', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { heatId, eventId, stage } = req.body;

    if (!heatId || !eventId) {
      return res.status(400).json({ error: 'heatId and eventId are required.' });
    }

    const { error: heatErr } = await supabase
      .from('heats')
      .update({ status: 'COMPLETED' })
      .eq('id', heatId);

    if (heatErr) {
      return res.status(400).json({ error: `Failed to mark flight as completed: ${heatErr.message}` });
    }

    let pointsAwarded = null;
    if (stage === 'FINAL') {
      const { data: ptsData, error: ptsErr } = await supabase.rpc('allocate_event_points', {
        p_event_id: eventId,
        p_heat_id: heatId,
      });

      if (ptsErr) {
        return res.status(400).json({ error: `Flight marked completed, but points allocation failed: ${ptsErr.message}` });
      }
      pointsAwarded = ptsData;
    }

    invalidateCache('live');
    invalidateCache('leaderboard');
    invalidateCache('schedule');

    return res.json({ success: true, heatId, status: 'COMPLETED', pointsAwarded });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
