/**
 * Signed athlete QR tokens — same algorithm as frontend/web/src/lib/athlete-qr.ts
 * (both must share ATHLETE_QR_SECRET).
 *
 * Format:  AURA26.<profile uuid>.<first 22 chars of base64url(HMAC-SHA256(secret, "AURA26.<uuid>"))>
 */
import { createHmac, timingSafeEqual } from 'crypto';

const PREFIX = 'AURA26';
const SIG_LEN = 22;

function getSecret(): string {
  const secret = process.env.ATHLETE_QR_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: ATHLETE_QR_SECRET environment variable is required in production.');
    }
    return 'dev-only-athlete-qr-secret-change-me-0123456789abcdef';
  }
  if (secret.length < 32) {
    throw new Error('FATAL: ATHLETE_QR_SECRET must be at least 32 characters long.');
  }
  return secret;
}

function sign(profileId: string): string {
  return createHmac('sha256', getSecret()).update(`${PREFIX}.${profileId}`).digest('base64url').slice(0, SIG_LEN);
}

export function makeAthleteQrToken(profileId: string): string {
  return `${PREFIX}.${profileId}.${sign(profileId)}`;
}

/** Returns the profile id when the token is genuine, otherwise null. */
export function verifyAthleteQrToken(token: string): string | null {
  const m = /^AURA26\.([0-9a-f-]{36})\.([A-Za-z0-9_-]{22})$/.exec(String(token || '').trim());
  if (!m) return null;
  const expected = Buffer.from(sign(m[1]));
  const given = Buffer.from(m[2]);
  return expected.length === given.length && timingSafeEqual(expected, given) ? m[1] : null;
}
