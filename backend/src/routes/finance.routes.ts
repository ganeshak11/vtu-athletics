import { Router, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';

export const financeRouter = Router();

financeRouter.use(authenticate);
financeRouter.use(requireRole(['meet_admin', 'finance_desk']));

/**
 * GET /api/finance/payments
 */
financeRouter.get('/payments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        id,
        amount_submitted,
        amount_expected,
        utr_number,
        screenshot_url,
        status,
        rejection_reason,
        created_at,
        verified_at,
        squads (
          id,
          squad_code,
          gender,
          ped_name,
          ped_phone,
          colleges (
            name,
            code
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ payments });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/finance/verify
 * Body: { paymentId: string, status: 'VERIFIED' | 'REJECTED', reason?: string }
 */
financeRouter.post('/verify', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { paymentId, status, reason } = req.body;

    if (!paymentId || !status || !['VERIFIED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Valid paymentId and status (VERIFIED/REJECTED) are required.' });
    }

    if (status === 'REJECTED' && !reason?.trim()) {
      return res.status(400).json({ error: 'Rejection reason is mandatory when rejecting payments.' });
    }

    const { error } = await supabase
      .from('payments')
      .update({
        status,
        rejection_reason: status === 'REJECTED' ? reason.trim() : null,
        verified_by: req.user!.entityId,
        verified_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
