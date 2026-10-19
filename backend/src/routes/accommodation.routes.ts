import { Router, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';

export const accommodationRouter = Router();

accommodationRouter.use(authenticate);
accommodationRouter.use(requireRole(['meet_admin', 'warden']));

/**
 * GET /api/accommodation/hostels
 * Returns all hostels with total capacity, checked-in count, and remaining capacity
 */
accommodationRouter.get('/hostels', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: hostels, error: hostelErr } = await supabase
      .from('hostels')
      .select('*')
      .order('name');

    if (hostelErr) return res.status(400).json({ error: hostelErr.message });

    // Fetch scan counts per hostel
    const { data: scans, error: scanErr } = await supabase
      .from('accommodation_scans')
      .select('hostel_id');

    if (scanErr) return res.status(400).json({ error: scanErr.message });

    const countMap: Record<string, number> = {};
    (scans || []).forEach((s) => {
      countMap[s.hostel_id] = (countMap[s.hostel_id] || 0) + 1;
    });

    const enrichedHostels = (hostels || []).map((h) => {
      const occupied = countMap[h.id] || 0;
      return {
        ...h,
        occupied,
        available: Math.max(0, h.total_capacity - occupied),
      };
    });

    return res.json({ hostels: enrichedHostels });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/accommodation/checkin
 * Idempotent hostel check-in with caution deposit recording
 */
accommodationRouter.post('/checkin', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      clientScanUuid,
      athleteId,
      hostelId,
      roomAssigned,
      cautionDeposit,
      cautionReceiptNo,
      deviceTimestamp,
    } = req.body;

    if (!clientScanUuid || !athleteId || !hostelId) {
      return res.status(400).json({
        error: 'clientScanUuid, athleteId, and hostelId are required.',
      });
    }

    const { data, error } = await supabase.rpc('process_accommodation_checkin', {
      p_client_uuid: clientScanUuid,
      p_profile_id: athleteId,
      p_hostel_id: hostelId,
      p_warden_id: req.user!.entityId,
      p_room_assigned: roomAssigned || 'General Dorm',
      p_caution_deposit: cautionDeposit ? parseFloat(cautionDeposit) : 500.0,
      p_caution_receipt_no: cautionReceiptNo || '',
      p_device_timestamp: deviceTimestamp || new Date().toISOString(),
    });

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true, result: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/accommodation/stats
 * Aggregate dashboard stats for hostel administration
 */
accommodationRouter.get('/stats', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: athletes, error: athletesErr } = await supabase
      .from('profiles')
      .select('id, accommodation_checked_in, squad_id, squads(gender)');

    if (athletesErr) return res.status(400).json({ error: athletesErr.message });

    const total = athletes?.length || 0;
    const checkedIn = athletes?.filter((a) => a.accommodation_checked_in).length || 0;
    const menCheckedIn = athletes?.filter((a: any) => a.accommodation_checked_in && a.squads?.gender === 'men').length || 0;
    const womenCheckedIn = athletes?.filter((a: any) => a.accommodation_checked_in && a.squads?.gender === 'women').length || 0;

    // Caution deposit total
    const { data: scans, error: scansErr } = await supabase
      .from('accommodation_scans')
      .select('caution_deposit');

    if (scansErr) return res.status(400).json({ error: scansErr.message });

    const totalCautionCollected = (scans || []).reduce((acc, s) => acc + (parseFloat(s.caution_deposit) || 0), 0);

    return res.json({
      totalAthletes: total,
      checkedInAthletes: checkedIn,
      pendingCheckIn: total - checkedIn,
      menCheckedIn,
      womenCheckedIn,
      totalCautionCollected,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/accommodation/scans
 * Recent check-in scans audit log
 */
accommodationRouter.get('/scans', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const { data, error } = await supabase
      .from('accommodation_scans')
      .select(`
        id,
        client_scan_uuid,
        room_assigned,
        caution_deposit,
        caution_receipt_no,
        synced_at,
        device_timestamp,
        profiles(id, sslc_name, usn, bid_number, squads(gender, colleges(name))),
        hostels(id, name, gender)
      `)
      .order('synced_at', { ascending: false })
      .limit(limit);

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ scans: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
