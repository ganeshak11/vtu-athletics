import { Router, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';

export const accreditationRouter = Router();

accreditationRouter.use(authenticate);
accreditationRouter.use(requireRole(['meet_admin', 'accreditation_volunteer']));

/**
 * POST /api/accreditation/scan
 * Body: { clientScanUuid: string, athleteId: string, deviceTimestamp?: string }
 */
accreditationRouter.post('/scan', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { clientScanUuid, athleteId, deviceTimestamp } = req.body;

    if (!clientScanUuid || !athleteId) {
      return res.status(400).json({ error: 'clientScanUuid and athleteId are required.' });
    }

    const { data, error } = await supabase.rpc('process_accreditation_scan', {
      p_client_uuid: clientScanUuid,
      p_profile_id: athleteId,
      p_volunteer_id: req.user!.entityId,
      p_device_timestamp: deviceTimestamp || new Date().toISOString(),
    });

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true, result: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/accreditation/stats
 */
accreditationRouter.get('/stats', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: athletes, error } = await supabase
      .from('profiles')
      .select('id, accreditation_status, squad_id, squads(colleges(name))');

    if (error) return res.status(400).json({ error: error.message });

    const total = (athletes || []).length;
    const accredited = (athletes || []).filter((a) => a.accreditation_status === 'ACCREDITED').length;

    return res.json({
      totalAthletes: total,
      accreditedAthletes: accredited,
      pendingAccreditation: total - accredited,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
