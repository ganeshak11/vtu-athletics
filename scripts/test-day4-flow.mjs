import ws from 'ws';
globalThis.WebSocket = ws;

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function runTest() {
  console.log('--- 1. Testing Registration Closure & Contiguous Bid Generation RPC ---');
  const { data: res, error: cErr } = await supabase.rpc('close_registration_and_generate_bids');

  if (cErr) throw cErr;
  console.log('✓ close_registration_and_generate_bids succeeded:');
  console.log(res);

  console.log('\n--- 2. Verifying Meet Settings & Squad Bid Blocks ---');
  const { data: settings } = await supabase
    .from('meet_settings')
    .select('registration_open, registration_closed_at')
    .single();

  console.log(`✓ registration_open: ${settings.registration_open} (Expected: false)`);
  if (settings.registration_open !== false) throw new Error('registration_open was not set to false!');

  const { data: squad } = await supabase
    .from('squads')
    .select('id, squad_code, bid_block_start, bid_block_end, roster_locked')
    .eq('squad_code', 'MITM-M')
    .single();

  console.log(`✓ MITM-M bid block: ${squad.bid_block_start} to ${squad.bid_block_end}`);
  if (squad.bid_block_start !== 100) throw new Error('Men bid blocks must start from 100!');

  console.log('\n--- 3. Verifying Athlete Bid Numbers ---');
  const { data: athletes } = await supabase
    .from('profiles')
    .select('id, sslc_name, bid_number, accreditation_status')
    .eq('squad_id', squad.id);

  console.log(`✓ Found ${athletes.length} athletes with assigned bids:`);
  for (const a of athletes) {
    console.log(`  - Chest #${a.bid_number}: ${a.sslc_name} (${a.accreditation_status})`);
  }

  const athleteToWithdraw = athletes[0];

  console.log(`\n--- 4. Testing Athlete Withdrawal (Chest #${athleteToWithdraw.bid_number}) ---`);
  const { data: withdrawRes, error: wErr } = await supabase.rpc('withdraw_athlete', {
    p_profile_id: athleteToWithdraw.id,
    p_reason: 'Hamstring tear during warm-up; certified by meet doctor.',
    p_admin_id: null,
  });

  if (wErr) throw wErr;
  console.log('✓ withdraw_athlete succeeded:');
  console.log(withdrawRes);

  const { data: withdrawnAthlete } = await supabase
    .from('profiles')
    .select('accreditation_status, bid_number')
    .eq('id', athleteToWithdraw.id)
    .single();

  console.log(`✓ Withdrawn athlete status: ${withdrawnAthlete.accreditation_status}`);
  console.log(`✓ Bid number retained to preserve gap: #${withdrawnAthlete.bid_number}`);

  console.log('\n--- 5. Testing Athlete Substitution (Inheriting Bid Gap) ---');
  const { data: subRes, error: sErr } = await supabase.rpc('substitute_athlete', {
    p_withdrawn_profile_id: athleteToWithdraw.id,
    p_new_sslc_name: 'NAVEEN K',
    p_new_usn: '4MT22CS099',
    p_new_semester: 4,
    p_new_blood_group: 'B+',
    p_new_joining_date: '2022-09-15',
    p_new_sem_start_date: '2026-08-01',
    p_reason: 'Official medical replacement.',
    p_admin_id: null,
  });

  if (sErr) throw sErr;
  console.log('✓ substitute_athlete succeeded:');
  console.log(subRes);

  const { data: newAthlete } = await supabase
    .from('profiles')
    .select('sslc_name, usn, bid_number, accreditation_status')
    .eq('id', subRes.new_profile_id)
    .single();

  console.log(`✓ New athlete: ${newAthlete.sslc_name} (${newAthlete.usn})`);
  console.log(`✓ Inherited Bid Number: #${newAthlete.bid_number} (Matched: ${newAthlete.bid_number === athleteToWithdraw.bid_number})`);

  if (newAthlete.bid_number !== athleteToWithdraw.bid_number) {
    throw new Error('Substitute athlete failed to inherit original bid number!');
  }

  console.log('\n--- 6. Verifying Amendments Audit Trail ---');
  const { data: amendments } = await supabase
    .from('roster_amendments')
    .select('*')
    .order('created_at', { ascending: false });

  console.log(`✓ Total amendments logged in audit table: ${amendments.length}`);
  for (const am of amendments) {
    console.log(`  - [${am.amendment_type.toUpperCase()}] Chest #${am.bid_number}: "${am.reason}"`);
  }

  console.log('\n🎉 ALL DAY 4 BID GENERATION & AMENDMENT TESTS PASSED CLEANLY!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
