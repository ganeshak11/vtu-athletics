/**
 * Brute-force throttling for web logins, backed by the `login_attempts` table (migration 0016).
 *
 * Server-only helper (deliberately NOT a 'use server' module, so it can't be called from the browser).
 * Only FAILED attempts are stored; a successful login clears that account's failures.
 * If the table is missing (migration not yet applied) or the DB errors, it fails OPEN and
 * logs a warning — throttling must never lock everyone out of the portal.
 */
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

export type ThrottleScope = 'squad' | 'admin' | 'pin';

const WINDOW_MINUTES = 15;

/** Failures allowed per account (college+division / username / role) in the window */
const KEY_LIMIT: Record<ThrottleScope, number> = { squad: 8, admin: 8, pin: 15 };
/** Failures allowed per client IP in the window (college networks may share one IP) */
const IP_LIMIT: Record<ThrottleScope, number> = { squad: 40, admin: 20, pin: 20 };

export async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    const fwd = h.get('x-forwarded-for');
    if (fwd) return fwd.split(',')[0].trim().slice(0, 64);
    return (h.get('x-real-ip') || '').trim().slice(0, 64) || 'unknown';
  } catch {
    return 'unknown';
  }
}

function windowStartIso(): string {
  return new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
}

/**
 * Returns an error message when this login should be refused, or null to proceed.
 */
export async function checkLoginThrottle(scope: ThrottleScope, key: string, ip: string): Promise<string | null> {
  try {
    const since = windowStartIso();
    const [byKey, byIp] = await Promise.all([
      supabaseAdmin
        .from('login_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('scope', scope)
        .eq('key', key)
        .gte('created_at', since),
      supabaseAdmin
        .from('login_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('scope', scope)
        .eq('ip', ip)
        .gte('created_at', since),
    ]);

    if (byKey.error || byIp.error) {
      console.warn('Login throttle check skipped:', byKey.error?.message || byIp.error?.message);
      return null;
    }

    if ((byKey.count || 0) >= KEY_LIMIT[scope] || (ip !== 'unknown' && (byIp.count || 0) >= IP_LIMIT[scope])) {
      return `Too many failed login attempts. Please wait ${WINDOW_MINUTES} minutes and try again, or contact the VTU Directorate.`;
    }
    return null;
  } catch (err) {
    console.warn('Login throttle check skipped:', err);
    return null;
  }
}

export async function recordLoginFailure(scope: ThrottleScope, key: string, ip: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('login_attempts').insert({ scope, key, ip });
    if (error) console.warn('Login attempt not recorded:', error.message);

    // Occasional housekeeping: drop rows older than a day
    if (Math.random() < 0.02) {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await supabaseAdmin.from('login_attempts').delete().lt('created_at', dayAgo);
    }
  } catch (err) {
    console.warn('Login attempt not recorded:', err);
  }
}

export async function clearLoginFailures(scope: ThrottleScope, key: string): Promise<void> {
  try {
    await supabaseAdmin.from('login_attempts').delete().eq('scope', scope).eq('key', key);
  } catch {
    // non-fatal
  }
}
