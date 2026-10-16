import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const publicRouter = Router();

/**
 * GET /api/events
 */
publicRouter.get('/events', async (_req: Request, res: Response) => {
  try {
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .order('name', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ events });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/live/results
 */
publicRouter.get('/live/results', async (_req: Request, res: Response) => {
  try {
    return res.json({
      status: 'REGISTRATION_PHASE',
      message: 'Heats will appear here upon completion of seeding.',
      results: [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/live/leaderboard
 */
publicRouter.get('/live/leaderboard', async (_req: Request, res: Response) => {
  try {
    return res.json({
      status: 'PENDING_EVENT_FINALS',
      collegeStandings: [],
      bestAthletes: [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
