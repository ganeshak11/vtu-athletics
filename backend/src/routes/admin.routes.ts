import { Router, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { generateSquadPassphrase, hashPassword } from '../utils/passphrase';

export const adminRouter = Router();

// Require meet_admin role for all routes in admin router
adminRouter.use(authenticate);
adminRouter.use(requireRole(['meet_admin']));

/**
 * POST /api/admin/colleges
 */
adminRouter.post('/colleges', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, code, district, pedName, pedPhone, pedEmail } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'College name and code are required.' });
    }

    const menPass = generateSquadPassphrase();
    const womenPass = generateSquadPassphrase();
    const menHash = await hashPassword(menPass);
    const womenHash = await hashPassword(womenPass);

    const { data, error } = await supabase.rpc('create_college_with_squads', {
      p_name: name.trim(),
      p_code: code.trim().toUpperCase(),
      p_district: district || 'Karnataka',
      p_men_passphrase_hash: menHash,
      p_women_passphrase_hash: womenHash,
      p_ped_name: pedName || '',
      p_ped_phone: pedPhone || '',
      p_ped_email: pedEmail || null,
    });

    if (error) return res.status(400).json({ error: error.message });

    return res.status(201).json({
      success: true,
      college: {
        id: data.college_id,
        name,
        code: data.college_code,
      },
      menSquad: {
        id: data.men_squad_id,
        squadCode: data.men_squad_code,
        passphrase: menPass,
      },
      womenSquad: {
        id: data.women_squad_id,
        squadCode: data.women_squad_code,
        passphrase: womenPass,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/colleges
 */
adminRouter.get('/colleges', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: colleges, error } = await supabase
      .from('colleges')
      .select('id, name, code, district, squads(*)')
      .order('name', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ colleges });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/close-registration
 */
adminRouter.post('/close-registration', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase.rpc('close_registration_and_generate_bids');
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true, result: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/bids
 */
adminRouter.get('/bids', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: squads, error } = await supabase
      .from('squads')
      .select(`
        id,
        squad_code,
        gender,
        bid_block_start,
        bid_block_end,
        payment_status,
        colleges (name, code),
        profiles (id, sslc_name, usn, bid_number, accreditation_status)
      `)
      .order('squad_code', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ squads });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/amendments/withdraw
 */
adminRouter.post('/amendments/withdraw', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { profileId, reason } = req.body;
    if (!profileId || !reason) {
      return res.status(400).json({ error: 'Profile ID and reason are required.' });
    }

    const { data, error } = await supabase.rpc('withdraw_athlete', {
      p_profile_id: profileId,
      p_reason: reason.trim(),
      p_admin_id: req.user!.entityId,
    });

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true, result: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/amendments/substitute
 */
adminRouter.post('/amendments/substitute', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      withdrawnProfileId,
      newName,
      newUsn,
      newSemester,
      newBloodGroup,
      newJoiningDate,
      newSemStartDate,
      reason,
    } = req.body;

    const { data, error } = await supabase.rpc('substitute_athlete', {
      p_withdrawn_profile_id: withdrawnProfileId,
      p_new_sslc_name: newName,
      p_new_usn: newUsn,
      p_new_semester: Number(newSemester),
      p_new_blood_group: newBloodGroup,
      p_new_joining_date: newJoiningDate,
      p_new_sem_start_date: newSemStartDate || '2026-08-01',
      p_reason: reason,
      p_admin_id: req.user!.entityId,
    });

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true, result: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/amendments
 */
adminRouter.get('/amendments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: amendments, error } = await supabase
      .from('roster_amendments')
      .select(`
        id,
        amendment_type,
        bid_number,
        reason,
        created_at,
        squads (squad_code, colleges(name)),
        staff (display_name)
      `)
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ amendments });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
