import ws from 'ws';
globalThis.WebSocket = ws;

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config({ path: 'frontend/web/.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:5000';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase credentials in frontend/web/.env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================================');
  console.log('🧪 VTU ATHLETICS PLATFORM — FULL COMPREHENSIVE LIVE SYSTEM AUDIT');
  console.log('======================================================================\n');

  // -------------------------------------------------------------------------
  // 1. FRONTEND SERVER ROUTE ACCESSIBILITY
  // -------------------------------------------------------------------------
  console.log('--- 1. Testing Next.js Frontend Routes ---');
  try {
    const resHome = await fetch(`${FRONTEND_URL}/`);
    assert(resHome.status === 200, 'Landing Page (GET /) responds with HTTP 200');

    const resSquadLogin = await fetch(`${FRONTEND_URL}/login/squad`);
    assert(resSquadLogin.status === 200, 'Squad Login Page (GET /login/squad) responds with HTTP 200');

    const resAdminLogin = await fetch(`${FRONTEND_URL}/login/admin`);
    assert(resAdminLogin.status === 200, 'Admin Login Page (GET /login/admin) responds with HTTP 200');

    // Unauthenticated access to protected routes must redirect
    const resProtectedAdmin = await fetch(`${FRONTEND_URL}/admin`, { redirect: 'manual' });
    assert(resProtectedAdmin.status === 307 || resProtectedAdmin.status === 302, 'Unauthenticated /admin redirects securely (HTTP 307/302)');

    const resProtectedSquad = await fetch(`${FRONTEND_URL}/squad/dashboard`, { redirect: 'manual' });
    assert(resProtectedSquad.status === 307 || resProtectedSquad.status === 302, 'Unauthenticated /squad/dashboard redirects securely (HTTP 307/302)');
  } catch (err) {
    console.error('Frontend connection failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------------------
  // 2. BACKEND API ROUTE ACCESSIBILITY
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing Backend API Health & Public Routes ---');
  try {
    const resHealth = await fetch(`${BACKEND_URL}/health`);
    const healthJson = await resHealth.json();
    assert(resHealth.status === 200 && healthJson.status === 'healthy', 'Backend Health (GET /health) returns status healthy');

    const resEvents = await fetch(`${BACKEND_URL}/api/events`);
    const eventsJson = await resEvents.json();
    assert(resEvents.status === 200 && Array.isArray(eventsJson.events) && eventsJson.events.length > 0, `Public Events API returned ${eventsJson.events?.length || 0} competitive events`);

    const resLeaderboard = await fetch(`${BACKEND_URL}/api/leaderboard/standings`);
    const leaderboardJson = await resLeaderboard.json();
    assert(resLeaderboard.status === 200 && leaderboardJson.success === true, 'Public Championship Leaderboard API (GET /api/leaderboard/standings) responds with HTTP 200');
  } catch (err) {
    console.error('Backend connection failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------------------
  // 3. DATABASE SCHEMA & DATA INTEGRITY
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing Database Schema & Data Integrity ---');

  // 3.1 Meet Settings Singleton Check
  const { data: meetSettings, error: msErr } = await supabase.from('meet_settings').select('*');
  assert(!msErr && meetSettings && meetSettings.length === 1, `meet_settings has exactly 1 master configuration record (found: ${meetSettings?.length || 0})`);
  assert(meetSettings?.[0]?.fee_per_regular_event === 100, 'Fee per regular event is set to ₹100');
  assert(meetSettings?.[0]?.fee_per_reserve_event === 0, 'Reserve athletes are free of nomination fees (₹0)');

  // 3.2 Colleges & Squads
  const { data: colleges } = await supabase.from('colleges').select('id, name, code');
  assert(colleges && colleges.length >= 3, `Affiliated participating colleges verified (found: ${colleges?.length || 0} colleges)`);

  const { data: squads } = await supabase.from('squads').select('id, squad_code, gender, college_id, payment_status, roster_locked');
  assert(squads && squads.length >= 4, `Institution squads configured (found: ${squads?.length || 0} squads)`);

  // Verify all squads have valid college_id
  const invalidSquads = squads?.filter(s => !s.college_id) || [];
  assert(invalidSquads.length === 0, 'All squads map strictly to valid parent institutions (zero orphaned squads)');

  // 3.3 Competitive Events
  const { data: events } = await supabase.from('events').select('id, name, code, category, gender');
  assert(events && events.length >= 10, `Events catalog seeded properly (${events?.length || 0} events found)`);

  const trackEvents = events?.filter(e => e.category?.startsWith('track') || e.category === 'road') || [];
  const fieldEvents = events?.filter(e => e.category?.startsWith('field')) || [];
  const relayEvents = events?.filter(e => e.category === 'relay') || [];
  assert(trackEvents.length > 0 && fieldEvents.length > 0 && relayEvents.length > 0, `Track (${trackEvents.length}), Field (${fieldEvents.length}), and Relay (${relayEvents.length}) events all configured`);

  // -------------------------------------------------------------------------
  // 4. BUSINESS LOGIC & RPC TESTING
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing Business Logic & PostgreSQL RPC Functions ---');

  // 4.1 Fee Computation RPC
  if (squads && squads.length > 0) {
    const testSquad = squads[0];
    const { data: feeBreakdown, error: feeErr } = await supabase.rpc('compute_squad_fee', {
      p_squad_id: testSquad.id,
    });
    assert(!feeErr && feeBreakdown !== null, `Fee computation RPC (compute_squad_fee) executed cleanly for squad ${testSquad.squad_code}: Expected ₹${feeBreakdown?.total_expected || 0}`);
  }

  // 4.2 Staff Authentication Hashes
  const { data: staffList } = await supabase.from('staff').select('id, username, role, password_hash, pin_hash, is_active');
  const adminStaff = staffList?.find(s => s.role === 'meet_admin');
  assert(adminStaff !== undefined, `Meet Administrator account exists (username: ${adminStaff?.username})`);
  if (adminStaff?.password_hash) {
    const isPwCorrect = await bcrypt.compare('admin123', adminStaff.password_hash);
    assert(isPwCorrect, 'Meet Administrator password matches "admin123"');
  }

  const volunteerStaff = staffList?.find(s => s.role === 'warden' || s.role === 'referee' || s.role === 'call_room_official');
  assert(volunteerStaff !== undefined, `Staff official accounts exist (e.g. role: ${volunteerStaff?.role})`);

  // 4.3 Safe Registration Toggle (WHERE Clause Verification)
  console.log('\n--- 5. Testing Registration Toggle & PostgREST WHERE clause ---');
  const originalState = meetSettings?.[0]?.registration_open ?? true;

  // Toggle to opposite state
  const { data: updatedMS1, error: msUpErr1 } = await supabase
    .from('meet_settings')
    .update({ registration_open: !originalState, updated_at: new Date().toISOString() })
    .not('id', 'is', null)
    .select();
  assert(!msUpErr1 && updatedMS1?.[0]?.registration_open === !originalState, `Toggled registration_open to ${!originalState} without WHERE clause errors`);

  // Toggle back to original state
  const { data: updatedMS2, error: msUpErr2 } = await supabase
    .from('meet_settings')
    .update({ registration_open: originalState, updated_at: new Date().toISOString() })
    .not('id', 'is', null)
    .select();
  assert(!msUpErr2 && updatedMS2?.[0]?.registration_open === originalState, `Restored registration_open back to ${originalState} cleanly`);

  // -------------------------------------------------------------------------
  // 6. ATHLETE & ACCREDITATION DATA
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Testing Athlete Profiles & Accreditation ---');
  const { data: athletes, count: totalAthletes } = await supabase
    .from('profiles')
    .select('id, sslc_name, usn, bid_number, accreditation_status, squad_id', { count: 'exact' });
  assert(athletes !== null, `Athlete profiles queried successfully (Total: ${totalAthletes || 0} registered)`);

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log(`🏁 AUDIT COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
