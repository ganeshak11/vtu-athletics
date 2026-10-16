import ws from 'ws';
globalThis.WebSocket = ws;

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function runTest() {
  console.log('--- 1. Fetching Men Events ---');
  const { data: events, error: eErr } = await supabase
    .from('events')
    .select('id, name, code, category')
    .eq('gender', 'men');

  if (eErr) throw eErr;
  console.log(`✓ Fetched ${events.length} Men events.`);

  const ev100m = events.find(e => e.code === '100M-M');
  const ev200m = events.find(e => e.code === '200M-M');
  const evShotPut = events.find(e => e.code === 'SP-M');
  const ev400m = events.find(e => e.code === '400M-M');
  const evRelay = events.find(e => e.code === '4X100M-M');

  console.log('\n--- 2. Fetching Test Squad (MITM-M) ---');
  const { data: squad } = await supabase
    .from('squads')
    .select('id, squad_code')
    .eq('squad_code', 'MITM-M')
    .single();

  if (!squad) throw new Error('MITM-M squad not found');

  console.log('\n--- 3. Registering Test Athlete: PRAJWAL M ---');
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .insert({
      squad_id: squad.id,
      sslc_name: 'PRAJWAL M',
      usn: '4MT22CS085',
      semester: 4,
      blood_group: 'O+',
      college_joining_date: '2022-09-15',
      sem_start_date: '2026-08-01',
      accreditation_status: 'REGISTERED',
    })
    .select('id, sslc_name, usn')
    .single();

  if (pErr) throw pErr;
  console.log(`✓ Athlete created: ${profile.sslc_name} (${profile.usn})`);

  console.log('\n--- 4. Registering 2 Regular Events + 1 Reserve ---');
  const { error: rErr } = await supabase.from('registrations').insert([
    { profile_id: profile.id, event_id: ev100m.id, kind: 'regular' },
    { profile_id: profile.id, event_id: ev200m.id, kind: 'regular' },
    { profile_id: profile.id, event_id: evShotPut.id, kind: 'reserve' },
  ]);

  if (rErr) throw rErr;
  console.log('✓ Successfully registered 100m, 200m (regular) and Shot Put (reserve).');

  console.log('\n--- 5. Testing Database Quota Trigger (Max 2 Regular Events) ---');
  const { error: exceedErr } = await supabase.from('registrations').insert({
    profile_id: profile.id,
    event_id: ev400m.id,
    kind: 'regular',
  });

  if (exceedErr && exceedErr.message.includes('more than 2 regular events')) {
    console.log(`✓ Trigger successfully blocked 3rd regular event: "${exceedErr.message}"`);
  } else {
    throw new Error('Trigger FAILED to block 3rd regular event!');
  }

  console.log('\n--- 6. Testing Relay Team & Composition ---');
  let { data: relayTeam } = await supabase
    .from('relay_teams')
    .select('id')
    .eq('squad_id', squad.id)
    .eq('event_id', evRelay.id)
    .maybeSingle();

  if (!relayTeam) {
    const { data: newTeam } = await supabase
      .from('relay_teams')
      .insert({ squad_id: squad.id, event_id: evRelay.id })
      .select('id')
      .single();
    relayTeam = newTeam;
  }

  // Register PRAJWAL on Leg 1
  const { error: legErr } = await supabase.from('relay_members').insert({
    relay_team_id: relayTeam.id,
    profile_id: profile.id,
    leg_order: 1,
    is_reserve: false,
  });

  if (legErr) throw legErr;
  console.log('✓ Assigned PRAJWAL to 4x100m Leg 1.');

  console.log('\n🎉 ALL DAY 2 EVENTS & ATHLETE REGISTRATION TESTS PASSED CLEANLY!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
