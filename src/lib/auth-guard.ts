import { redirect } from 'next/navigation';
import { getSession, SessionData, UserRole } from './session';

/**
 * Server-side guard to ensure the user is logged in with one of the allowed roles.
 * If unauthorized, redirects to the designated login page or throws an error.
 */
export async function requireAuth(allowedRoles?: UserRole[]): Promise<SessionData> {
  const session = await getSession();

  if (!session.isLoggedIn || !session.entityId) {
    redirect('/login/squad');
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    // Redirect based on current role or send to home
    if (session.role === 'squad_manager') {
      redirect('/squad/dashboard');
    } else if (session.role === 'meet_admin') {
      redirect('/admin/dashboard');
    } else {
      redirect('/');
    }
  }

  return session;
}

/**
 * Guard specifically for Squad Managers.
 */
export async function requireSquad(): Promise<SessionData & { squadId: string; collegeId: string }> {
  const session = await requireAuth(['squad_manager']);
  if (!session.squadId || !session.collegeId) {
    redirect('/login/squad');
  }
  return session as SessionData & { squadId: string; collegeId: string };
}

/**
 * Guard specifically for Meet Admin.
 */
export async function requireAdmin(): Promise<SessionData> {
  return requireAuth(['meet_admin']);
}

/**
 * Guard for Staff roles (admin, finance, scanners, referee).
 */
export async function requireStaff(allowedRoles?: UserRole[]): Promise<SessionData> {
  const defaultStaffRoles: UserRole[] = [
    'meet_admin',
    'finance_desk',
    'accreditation_volunteer',
    'warden',
    'call_room_official',
    'referee',
  ];
  return requireAuth(allowedRoles || defaultStaffRoles);
}
