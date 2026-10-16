import bcrypt from 'bcryptjs';

const ADJECTIVES = [
  'swift', 'bold', 'brave', 'sharp', 'rapid', 'stellar', 'golden', 'silver',
  'mighty', 'noble', 'agile', 'prime', 'blazing', 'zenith', 'apex', 'vivid',
  'iron', 'falcon', 'titan', 'stellar', 'radiant', 'dynamic', 'crest', 'beacon'
];

const NOUNS = [
  'runner', 'stride', 'track', 'sprint', 'hurdle', 'relay', 'jumper', 'thrower',
  'champion', 'falcon', 'tiger', 'leopard', 'panther', 'eagle', 'storm', 'victory',
  'stadium', 'flame', 'medal', 'record', 'spirit', 'shield', 'stride', 'vector'
];

/**
 * Generates a clean, memorable, secure passphrase for a squad.
 * Format: adjective-noun-number (e.g. "swift-falcon-84")
 */
export function generateSquadPassphrase(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${adj}-${noun}-${num}`;
}

/**
 * Hashes a plaintext passphrase using bcrypt.
 */
export async function hashPassphrase(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

/**
 * Compares a plaintext passphrase against a stored hash.
 */
export async function verifyPassphrase(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Hashes a 4-6 digit numeric PIN using bcrypt.
 */
export async function hashPin(pin: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pin.trim(), salt);
}

/**
 * Verifies a 4-6 digit numeric PIN against a stored hash.
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin.trim(), hash);
}
