import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET: string = process.env.JWT_SECRET || '';
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is required. Set it in backend/.env');
  } else {
    console.warn('Warning: JWT_SECRET environment variable is not set. Using dev fallback.');
  }
}
const EFFECTIVE_JWT_SECRET: string = JWT_SECRET || 'vtu-athletics-dev-secret-change-in-production';

export type UserRole =
  | 'squad_manager'
  | 'meet_admin'
  | 'finance_desk'
  | 'accreditation_volunteer'
  | 'warden'
  | 'call_room_official'
  | 'referee'
  | 'spectator'
  | 'athlete'
  | 'food_volunteer';

export interface TokenPayload {
  role: UserRole;
  entityId: string; // squad.id or staff.id
  displayName: string;
  squadId?: string;
  collegeId?: string;
  gender?: 'men' | 'women';
  squadCode?: string;
  scopeEventIds?: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, EFFECTIVE_JWT_SECRET, { expiresIn: '7d' });
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or invalid.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, EFFECTIVE_JWT_SECRET) as unknown as TokenPayload;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token is expired or invalid.' });
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: requires one of [${allowedRoles.join(', ')}] role.` });
    }

    next();
  };
}
