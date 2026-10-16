import { Router, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';

export const squadRouter = Router();

// Protect all squad routes to squad_manager role
squadRouter.use(authenticate);
squadRouter.use(requireRole(['squad_manager']));

/**
 * GET /api/squad/profile
 */
squadRouter.get('/profile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const squadId = req.user!.squadId!;
    const { data: squad, error } = await supabase
      .from('squads')
      .select('id, gender, squad_code, ped_name, ped_phone, ped_email, roster_locked, payment_status, bid_block_start, bid_block_end, colleges(*)')
      .eq('id', squadId)
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ squad });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/squad/athletes
 */
squadRouter.get('/athletes', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const squadId = req.user!.squadId!;
    const { data: athletes, error } = await supabase
      .from('profiles')
      .select(`
        id,
        sslc_name,
        usn,
        semester,
        blood_group,
        college_joining_date,
        sem_start_date,
        bid_number,
        accreditation_status,
        registrations (
          id,
          kind,
          event_id,
          events (
            id,
            name,
            code,
            category
          )
        )
      `)
      .eq('squad_id', squadId)
      .order('created_at', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ athletes: athletes || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/squad/athletes
 */
squadRouter.post('/athletes', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const squadId = req.user!.squadId!;
    const gender = req.user!.gender!;

    // Check lock
    const { data: squad } = await supabase
      .from('squads')
      .select('roster_locked')
      .eq('id', squadId)
      .single();

    if (squad?.roster_locked) {
      return res.status(403).json({ error: 'Roster is locked. Contact Meet Director for amendments.' });
    }

    const {
      sslcName,
      usn,
      semester,
      bloodGroup,
      collegeJoiningDate,
      semStartDate,
      event1Id,
      event2Id,
      reserveEventId,
      isHalfMarathon,
    } = req.body;

    if (!sslcName || !usn || !semester || !bloodGroup || !collegeJoiningDate || !semStartDate || !event1Id) {
      return res.status(400).json({ error: 'Missing mandatory athlete fields.' });
    }

    // Insert profile
    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .insert({
        squad_id: squadId,
        sslc_name: sslcName.trim(),
        usn: usn.trim().toUpperCase(),
        semester: Number(semester),
        blood_group: bloodGroup.trim(),
        college_joining_date: collegeJoiningDate,
        sem_start_date: semStartDate,
        accreditation_status: 'REGISTERED',
      })
      .select('id')
      .single();

    if (pErr) {
      if (pErr.code === '23505') {
        return res.status(400).json({ error: `USN '${usn}' is already registered in this squad.` });
      }
      return res.status(400).json({ error: pErr.message });
    }

    // Build registrations
    type RegKind = 'regular' | 'reserve' | 'relay' | 'half_marathon';
    const regInserts: { profile_id: string; event_id: string; kind: RegKind }[] = [
      { profile_id: profile.id, event_id: event1Id, kind: 'regular' },
    ];

    if (event2Id) {
      regInserts.push({ profile_id: profile.id, event_id: event2Id, kind: 'regular' });
    }

    if (reserveEventId) {
      regInserts.push({ profile_id: profile.id, event_id: reserveEventId, kind: 'reserve' });
    }

    if (isHalfMarathon) {
      const { data: hmEvent } = await supabase
        .from('events')
        .select('id')
        .eq('code', gender === 'men' ? 'HM-M' : 'HM-W')
        .single();

      if (hmEvent) {
        regInserts.push({ profile_id: profile.id, event_id: hmEvent.id, kind: 'half_marathon' });
      }
    }

    const { error: regErr } = await supabase.from('registrations').insert(regInserts);
    if (regErr) {
      await supabase.from('profiles').delete().eq('id', profile.id);
      return res.status(400).json({ error: regErr.message });
    }

    return res.status(201).json({ success: true, athleteId: profile.id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/squad/athletes/:id
 */
squadRouter.delete('/athletes/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const squadId = req.user!.squadId!;
    const athleteId = req.params.id;

    const { data: squad } = await supabase
      .from('squads')
      .select('roster_locked')
      .eq('id', squadId)
      .single();

    if (squad?.roster_locked) {
      return res.status(403).json({ error: 'Cannot remove athletes while roster is locked.' });
    }

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', athleteId)
      .eq('squad_id', squadId);

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/squad/payment/fee
 */
squadRouter.get('/payment/fee', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const squadId = req.user!.squadId!;

    const { data: feeData, error: fErr } = await supabase.rpc('compute_squad_fee', {
      p_squad_id: squadId,
    });

    if (fErr) return res.status(400).json({ error: fErr.message });

    const { data: settings } = await supabase
      .from('meet_settings')
      .select('host_upi_id, host_account_name')
      .single();

    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('squad_id', squadId)
      .order('created_at', { ascending: false });

    return res.json({
      breakdown: feeData,
      hostUpiId: settings?.host_upi_id || 'vtuathletics@upi',
      hostAccountName: settings?.host_account_name || 'VTU Sports Board',
      payments: payments || [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/squad/payment
 */
squadRouter.post('/payment', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const squadId = req.user!.squadId!;
    const { utrNumber, amountSubmitted, screenshotUrl } = req.body;

    if (!utrNumber || !amountSubmitted || !screenshotUrl) {
      return res.status(400).json({ error: 'UTR number, amount, and screenshot are required.' });
    }

    const { data: feeData } = await supabase.rpc('compute_squad_fee', {
      p_squad_id: squadId,
    });

    const { error } = await supabase.from('payments').insert({
      squad_id: squadId,
      amount_submitted: Number(amountSubmitted),
      amount_expected: feeData?.total_amount || 0,
      utr_number: utrNumber.trim(),
      screenshot_url: screenshotUrl,
      status: 'SUBMITTED',
    });

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: `UTR '${utrNumber}' has already been submitted.` });
      }
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
