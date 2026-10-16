import { createClient } from '@supabase/supabase-js';

// Polyfill WebSocket in Node environment if missing (required for Supabase JS in Node < 22)
if (typeof window === 'undefined' && !globalThis.WebSocket) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ws = require('ws');
    globalThis.WebSocket = ws;
  } catch {
    // ignore if ws is unavailable
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Standard anonymous Supabase client.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Privileged Service-Role Supabase client for Server Actions.
 * Bypasses RLS to execute administrative mutations securely.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
