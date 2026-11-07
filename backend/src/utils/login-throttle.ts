/**
 * Brute-force throttling backed by the shared `login_attempts` table (migration 0016),
 * same scheme as the web app's src/lib/login-throttle.ts. Only failures are stored; a
 * successful login clears that account's failures. Fails OPEN on DB errors.
 */
import { supabase } from '../config/supabase';

const WINDOW_MINUTES = 15;

export async function isLoginThrottled(
  scope: string,
  key: string,
  ip: string,
  keyLimit: number,
  ipLimit: number
): Promise<boolean> {
  try {
    const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
    const [byKey, byIp] = await Promise.all([
      supabase.from('login_attempts').select('id', { count: 'exact', head: true }).eq('scope', scope).eq('key', key).gte('created_at', since),
      supabase.from('login_attempts').select('id', { count: 'exact', head: true }).eq('scope', scope).eq('ip', ip).gte('created_at', since),
    ]);
    if (byKey.error || byIp.error) return false;
    return (byKey.count || 0) >= keyLimit || (byIp.count || 0) >= ipLimit;
  } catch {
    return false;
  }
}

export async function recordLoginFailure(scope: string, key: string, ip: string): Promise<void> {
  try {
    await supabase.from('login_attempts').insert({ scope, key, ip });
  } catch {
    // non-fatal
  }
}

export async function clearLoginFailures(scope: string, key: string): Promise<void> {
  try {
    await supabase.from('login_attempts').delete().eq('scope', scope).eq('key', key);
  } catch {
    // non-fatal
  }
}

export const THROTTLE_MESSAGE = `Too many failed login attempts. Please wait ${WINDOW_MINUTES} minutes and try again.`;
