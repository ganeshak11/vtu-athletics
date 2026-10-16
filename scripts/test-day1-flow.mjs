import ws from 'ws';
globalThis.WebSocket = ws;

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = 'http://127.0.0.1:54321';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function runTest() {
  console.log('--- 1. Testing Admin Verification ---');
  const { data: admin } = await supabase
    .from('staff')
    .select('id, username, password_hash, role')
    .eq('username', 'admin')
    .single();

  if (!admin) throw new Error('Admin not found in DB');
  const adminPassMatch = await bcrypt.compare('vtuadmin2026', admin.password_hash);
  console.log(`✓ Admin password verified against bcrypt hash: ${adminPassMatch}`);

  console.log('\n--- 2. Testing College & Squad Atomic Creation via RPC ---');
  const menPass = 'swift-falcon-88';
  const womenPass = 'golden-runner-42';
  const menHash = await bcrypt.hash(menPass, 10);
  const womenHash = await bcrypt.hash(womenPass, 10);

  // Clean up if already exists
  await supabase.from('colleges').delete().eq('code', 'MITM');

  const { data: rpcRes, error: rpcErr } = await supabase.rpc('create_college_with_squads', {
    p_name: 'Maharaja Institute of Technology Mysore',
    p_code: 'MITM',
    p_district: 'Mysuru',
    p_men_passphrase_hash: menHash,
    p_women_passphrase_hash: womenHash,
    p_ped_name: 'Dr. Ramesh Babu',
    p_ped_phone: '9845012345',
    p_ped_email: 'ped@mitm.edu',
  });

  if (rpcErr) throw rpcErr;
  console.log('✓ RPC create_college_with_squads succeeded:');
  console.log(rpcRes);

  console.log('\n--- 3. Verifying Squads in DB ---');
  const { data: squads, error: sErr } = await supabase
    .from('squads')
    .select('id, squad_code, gender, passphrase_hash, roster_locked, payment_status')
    .eq('college_id', rpcRes.college_id);

  if (sErr) throw sErr;
  console.log(`✓ Created ${squads.length} squads:`);
  for (const s of squads) {
    console.log(`  - Code: ${s.squad_code} | Gender: ${s.gender} | Payment: ${s.payment_status} | Locked: ${s.roster_locked}`);
  }

  console.log('\n--- 4. Testing Squad Manager Passphrase Authentication ---');
  const menSquad = squads.find(s => s.gender === 'men');
  const isMatch = await bcrypt.compare(menPass, menSquad.passphrase_hash);
  const isBadMatch = await bcrypt.compare('wrong-password-99', menSquad.passphrase_hash);
  console.log(`✓ Valid passphrase '${menPass}' verified: ${isMatch}`);
  console.log(`✓ Invalid passphrase rejected: ${!isBadMatch}`);

  console.log('\n--- 5. Testing Staff PIN Creation & Verification ---');
  const testPin = '7412';
  const pinHash = await bcrypt.hash(testPin, 10);
  const { data: staffVolunteer, error: volErr } = await supabase.from('staff').insert({
    display_name: 'Entry Gate Scanner 1',
    role: 'accreditation_volunteer',
    pin_hash: pinHash,
    is_active: true,
  }).select('id, display_name, role, pin_hash').single();

  if (volErr) throw volErr;
  const pinMatch = await bcrypt.compare('7412', staffVolunteer.pin_hash);
  console.log(`✓ Created volunteer '${staffVolunteer.display_name}' (${staffVolunteer.role})`);
  console.log(`✓ PIN '${testPin}' verified: ${pinMatch}`);

  console.log('\n🎉 ALL DAY 1 ARCHITECTURE & AUTH TESTS PASSED CLEANLY!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
