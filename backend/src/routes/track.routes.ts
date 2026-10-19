import { Router, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';

export const trackRouter = Router();

trackRouter.use(authenticate);
trackRouter.use(requireRole(['meet_admin', 'referee']));

/**
 * GET /api/track/heats/:heatId
 * Fetches track heat athletes with recorded times and results
 */
trackRouter.get('/heats/:heatId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { heatId } = req.params;

    const { data: heat, error: heatErr } = await supabase
      .from('heats')
      .select('id, heat_number, stage, status, wind_reading, events(id, name, code, gender, category, start_type)')
      .eq('id', heatId)
      .single();

    if (heatErr) return res.status(400).json({ error: heatErr.message });

    const { data: athletes, error: athErr } = await supabase
      .from('heat_athletes')
      .select(`
        id,
        lane_number,
        profiles(id, sslc_name, usn, bid_number, squads(colleges(name, code))),
        relay_teams(id, squads(colleges(name, code))),
        track_results(
          id,
          time_seconds,
          reaction_time_ms,
          wind_reading,
          status,
          dq_rule,
          photo_finish_url
        )
      `)
      .eq('heat_id', heatId)
      .order('lane_number', { ascending: true });

    if (athErr) return res.status(400).json({ error: athErr.message });

    return res.json({
      heat,
      athletes: athletes || [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/track/result
 * Submit electronic finish time (down to 1/1000s) and reaction time
 */
trackRouter.post('/result', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      heatAthleteId,
      timeSeconds,
      reactionTimeMs,
      windReading,
      status = 'FINISHED',
      dqRule = '',
    } = req.body;

    if (!heatAthleteId) {
      return res.status(400).json({ error: 'heatAthleteId is required.' });
    }

    const { data, error } = await supabase.rpc('submit_track_result', {
      p_heat_athlete_id: heatAthleteId,
      p_time_seconds: timeSeconds ? parseFloat(timeSeconds) : null,
      p_reaction_ms: reactionTimeMs ? parseInt(reactionTimeMs, 10) : null,
      p_wind: windReading ? parseFloat(windReading) : null,
      p_status: status,
      p_dq_rule: dqRule,
      p_official_id: req.user!.entityId,
    });

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true, result: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/track/qualify
 * Run automatic round progression ('Q' top per heat + 'q' fastest times overall)
 */
trackRouter.post('/qualify', requireRole(['meet_admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      eventId,
      currentStage = 'HEATS',
      nextStage = 'FINAL',
      autoQPerHeat = 3,
      timeQTotal = 2,
    } = req.body;

    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required.' });
    }

    const { data, error } = await supabase.rpc('qualify_next_round', {
      p_event_id: eventId,
      p_current_stage: currentStage,
      p_next_stage: nextStage,
      p_auto_q_per_heat: parseInt(autoQPerHeat, 10),
      p_time_q_total: parseInt(timeQTotal, 10),
    });

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true, result: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/track/finalize
 * Finalize heat, mark status COMPLETED, and award championship points if Final stage
 */
trackRouter.post('/finalize', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { heatId, eventId, stage } = req.body;

    if (!heatId || !eventId) {
      return res.status(400).json({ error: 'heatId and eventId are required.' });
    }

    // 1. Mark heat as completed
    await supabase.from('heats').update({ status: 'COMPLETED' }).eq('id', heatId);

    // 2. If it is a final, automatically award team championship points (7-5-4-3-2-1)
    let pointsAwarded = null;
    if (stage === 'FINAL') {
      const { data: ptsData } = await supabase.rpc('allocate_event_points', {
        p_event_id: eventId,
        p_heat_id: heatId,
      });
      pointsAwarded = ptsData;
    }

    return res.json({ success: true, heatId, status: 'COMPLETED', pointsAwarded });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
