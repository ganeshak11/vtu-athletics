import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { generateToken } from '../middleware/auth';
import { verifyPassword } from '../utils/passphrase';

export const authRouter = Router();

/**
 * POST /api/auth/squad/login
 * Body: { squadCode: string, passphrase: string }
 */
authRouter.post('/squad/login', async (req: Request, res: Response) => {
  try {
    const squadCode = (req.body.squadCode || '').trim().toUpperCase();
    const passphrase = (req.body.passphrase || '').trim();

    if (!squadCode || !passphrase) {
      return res.status(400).json({ error: 'Squad code and passphrase are required.' });
    }

    const { data: squad, error } = await supabase
      .from('squads')
      .select('id, college_id, gender, squad_code, passphrase_hash, colleges(id, name, code, district)')
      .eq('squad_code', squadCode)
      .single();

    if (error || !squad) {
      return res.status(401).json({ error: 'Invalid squad code or passphrase.' });
    }

    const isValid = await verifyPassword(passphrase, squad.passphrase_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid squad code or passphrase.' });
    }

    const college = Array.isArray(squad.colleges) ? squad.colleges[0] : squad.colleges;
    const collegeName = college?.name || squad.squad_code;

    const token = generateToken({
      role: 'squad_manager',
      entityId: squad.id,
      squadId: squad.id,
      collegeId: squad.college_id,
      gender: squad.gender as 'men' | 'women',
      squadCode: squad.squad_code,
      displayName: `${collegeName} (${squad.gender.toUpperCase()})`,
    });

    return res.json({
      success: true,
      token,
      squad: {
        id: squad.id,
        squadCode: squad.squad_code,
        gender: squad.gender,
        collegeId: squad.college_id,
        collegeName,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * POST /api/auth/staff/login
 * Body: { username: string, password: string }
 */
authRouter.post('/staff/login', async (req: Request, res: Response) => {
  try {
    const username = (req.body.username || '').trim();
    const password = (req.body.password || '').trim();

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const { data: staff, error } = await supabase
      .from('staff')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !staff) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (!staff.is_active) {
      return res.status(403).json({ error: 'Account is deactivated.' });
    }

    const isValid = await verifyPassword(password, staff.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = generateToken({
      role: staff.role,
      entityId: staff.id,
      displayName: staff.display_name,
    });

    return res.json({
      success: true,
      token,
      staff: {
        id: staff.id,
        username: staff.username,
        displayName: staff.display_name,
        role: staff.role,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * POST /api/auth/staff/pin-login
 * Body: { role: string, pin: string }
 */
authRouter.post('/staff/pin-login', async (req: Request, res: Response) => {
  try {
    const role = (req.body.role || '').trim();
    const pin = (req.body.pin || '').trim();

    if (!pin) {
      return res.status(400).json({ error: 'PIN is required.' });
    }

    const query = supabase
      .from('staff')
      .select('id, pin_hash, display_name, role, scope_event_ids, is_active')
      .eq('is_active', true)
      .not('pin_hash', 'is', null);

    if (role) {
      query.eq('role', role);
    }

    const { data: candidates, error } = await query;

    if (error || !candidates || candidates.length === 0) {
      return res.status(401).json({ error: 'Invalid PIN or unauthorized role.' });
    }

    let matchedStaff = null;
    for (const c of candidates) {
      if (c.pin_hash && (await verifyPassword(pin, c.pin_hash))) {
        matchedStaff = c;
        break;
      }
    }

    if (!matchedStaff) {
      return res.status(401).json({ error: 'Invalid PIN.' });
    }

    const token = generateToken({
      role: matchedStaff.role,
      entityId: matchedStaff.id,
      displayName: matchedStaff.display_name,
      scopeEventIds: matchedStaff.scope_event_ids || [],
    });

    return res.json({
      success: true,
      token,
      staff: {
        id: matchedStaff.id,
        displayName: matchedStaff.display_name,
        role: matchedStaff.role,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});
