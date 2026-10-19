import { Router, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';

export const callRoomRouter = Router();

callRoomRouter.use(authenticate);
callRoomRouter.use(requireRole(['meet_admin', 'call_room_official']));

/**
 * GET /api/callroom/heats/:heatId
 * Fetches all athletes in heat with their current call room gear inspection status
 */
callRoomRouter.get('/heats/:heatId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { heatId } = req.params;

    const { data: heat, error: heatErr } = await supabase
      .from('heats')
      .select('id, heat_number, stage, status, events(id, name, code, gender, category)')
      .eq('id', heatId)
      .single();

    if (heatErr) return res.status(400).json({ error: heatErr.message });

    const { data: athletes, error: athErr } = await supabase
      .from('heat_athletes')
      .select(`
        id,
        lane_number,
        call_room_reported,
        call_room_reported_at,
        profiles(id, sslc_name, usn, bid_number, squads(colleges(name, code))),
        relay_teams(id, squads(colleges(name, code))),
        call_room_inspections(
          id,
          reported_status,
          bib_affixed,
          spike_length_mm,
          uniform_approved,
          notes,
          inspected_at
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
 * POST /api/callroom/inspect
 * Submit athlete gear inspection & attendance check
 */
callRoomRouter.post('/inspect', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      heatAthleteId,
      reportedStatus = 'REPORTED',
      bibAffixed = true,
      spikeLengthMm = 9.0,
      uniformApproved = true,
      notes = '',
    } = req.body;

    if (!heatAthleteId) {
      return res.status(400).json({ error: 'heatAthleteId is required.' });
    }

    const { data, error } = await supabase.rpc('record_call_room_inspection', {
      p_heat_athlete_id: heatAthleteId,
      p_official_id: req.user!.entityId,
      p_reported_status: reportedStatus,
      p_bib_affixed: bibAffixed,
      p_spike_length_mm: parseFloat(spikeLengthMm) || 9.0,
      p_uniform_approved: uniformApproved,
      p_notes: notes,
    });

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true, result: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/callroom/advance/:heatId
 * Closes call room and marshals heat to track (unreported athletes marked DNS)
 */
callRoomRouter.post('/advance/:heatId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { heatId } = req.params;

    const { data, error } = await supabase.rpc('advance_heat_to_track', {
      p_heat_id: heatId,
      p_official_id: req.user!.entityId,
    });

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true, result: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
