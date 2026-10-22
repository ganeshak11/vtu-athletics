import { Router, Response } from 'express';
import { supabase } from '../config/supabase';
import { cacheResponse } from '../middleware/cache';

export const leaderboardRouter = Router();

/**
 * GET /api/leaderboard/standings
 * Public: Returns Men's, Women's, and Combined Overall championship standings with medal counts
 */
leaderboardRouter.get('/standings', cacheResponse(10), async (_req, res: Response) => {
  try {
    const { data, error } = await supabase.rpc('get_championship_standings');
    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/leaderboard/college/:collegeId
 * Public: Detailed points and medals breakdown for a college
 */
leaderboardRouter.get('/college/:collegeId', cacheResponse(15), async (req, res: Response) => {
  try {
    const { collegeId } = req.params;

    const { data: college, error: colErr } = await supabase
      .from('colleges')
      .select('id, name, code, district')
      .eq('id', collegeId)
      .single();

    if (colErr) return res.status(400).json({ error: colErr.message });

    const { data: points, error: ptsErr } = await supabase
      .from('team_points')
      .select(`
        id,
        place,
        points,
        events(name, code, gender, category),
        profiles(sslc_name, usn, bid_number),
        squads(gender)
      `)
      .eq('college_id', collegeId)
      .order('place', { ascending: true });

    if (ptsErr) return res.status(400).json({ error: ptsErr.message });

    const totalPoints = (points || []).reduce((acc, p) => acc + (parseFloat(p.points as any) || 0), 0);
    const golds = (points || []).filter((p) => p.place === 1).length;
    const silvers = (points || []).filter((p) => p.place === 2).length;
    const bronzes = (points || []).filter((p) => p.place === 3).length;

    return res.json({
      college,
      totalPoints,
      medals: { golds, silvers, bronzes },
      pointsBreakdown: points || [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
