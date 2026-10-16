import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secure-vtu-athletics-jwt-secret-key-2026';

export type UserRole =
  | 'squad_manager'
  | 'meet_admin'
  | 'finance_desk'
  | 'accreditation_volunteer'
  | 'warden'
  | 'call_room_official'
  | 'referee'
  | 'spectator';

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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or invalid.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
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
