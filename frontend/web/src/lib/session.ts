import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';

export type UserRole =
  | 'squad_manager'
  | 'meet_admin'
  | 'finance_desk'
  | 'accreditation_volunteer'
  | 'warden'
  | 'call_room_official'
  | 'referee'
  | 'spectator';

export interface SessionData {
  isLoggedIn: boolean;
  role: UserRole;
  entityId: string; // squad.id or staff.id
  displayName: string;
  // Specific to squad_manager
  collegeId?: string;
  collegeName?: string;
  collegeCode?: string;
  squadId?: string;
  squadCode?: string;
  gender?: 'men' | 'women';
  // Specific to referee
  scopeEventIds?: string[];
}

const defaultSession: SessionData = {
  isLoggedIn: false,
  role: 'spectator',
  entityId: '',
  displayName: '',
};

function getSessionPassword(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL SECURITY ERROR: SESSION_SECRET environment variable is missing in production!');
    }
    return 'cf004dbdc69afa4adebc452cd9cf29b6d164dfd7296f857ab9a1c9c64e087ee7';
  }
  if (secret.length < 32) {
    throw new Error('CRITICAL SECURITY ERROR: SESSION_SECRET must be at least 32 characters long.');
  }
  return secret;
}

const getSessionOptions = () => ({
  password: getSessionPassword(),
  cookieName: 'vtu_sportos_session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax' as const,
    path: '/',
  },
});

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, getSessionOptions());
  if (!session.isLoggedIn) {
    session.isLoggedIn = defaultSession.isLoggedIn;
    session.role = defaultSession.role;
    session.entityId = defaultSession.entityId;
    session.displayName = defaultSession.displayName;
  }
  return session;
}

export async function destroySession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}
