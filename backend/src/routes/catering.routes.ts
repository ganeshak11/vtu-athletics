import { Router, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';

export const cateringRouter = Router();

cateringRouter.use(authenticate);
cateringRouter.use(requireRole(['food_volunteer', 'meet_admin']));

/**
 * POST /api/catering/scan
 * Food volunteers scan athlete QR at breakfast, lunch, dinner
 */
cateringRouter.post('/scan', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { athleteId, mealType = 'LUNCH', clientScanUuid = Date.now().toString() } = req.body;

    if (!athleteId) {
      return res.status(400).json({ error: 'athleteId is required.' });
    }

    const validMeals = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];
    const normalizedMeal = mealType.toUpperCase();
    if (!validMeals.includes(normalizedMeal)) {
      return res.status(400).json({ error: `Invalid mealType. Must be one of: ${validMeals.join(', ')}` });
    }

    const { data, error } = await supabase.rpc('scan_meal_coupon', {
      p_client_uuid: clientScanUuid,
      p_profile_id: athleteId,
      p_meal_type: normalizedMeal,
      p_volunteer_id: req.user!.entityId,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/catering/stats
 * Real-time counts of meals served today
 */
cateringRouter.get('/stats', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase.rpc('get_meal_stats');
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
