import ws from 'ws';
globalThis.WebSocket = ws;

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function runTest() {
  console.log('--- 1. Testing Squad Fee Computation RPC ---');
  const { data: squad } = await supabase
    .from('squads')
    .select('id, squad_code')
    .eq('squad_code', 'MITM-M')
    .single();

  if (!squad) throw new Error('MITM-M squad not found');

  const { data: feeBreakdown, error: fErr } = await supabase.rpc('compute_squad_fee', {
    p_squad_id: squad.id,
  });

  if (fErr) throw fErr;
  console.log('✓ Computed fee breakdown for MITM-M:');
  console.log(feeBreakdown);

  console.log('\n--- 2. Submitting Payment Proof ---');
  const utr = 'UTR' + Math.floor(100000000000 + Math.random() * 900000000000);
  const { data: payment, error: pErr } = await supabase
    .from('payments')
    .insert({
      squad_id: squad.id,
      amount_submitted: feeBreakdown.total_amount,
      amount_expected: feeBreakdown.total_amount,
      utr_number: utr,
      screenshot_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      status: 'SUBMITTED',
    })
    .select('id, utr_number, status, amount_submitted')
    .single();

  if (pErr) throw pErr;
  console.log(`✓ Payment recorded with UTR ${payment.utr_number}:`);
  console.log(payment);

  console.log('\n--- 3. Verifying Roster Auto-Lock Trigger ---');
  const { data: updatedSquad } = await supabase
    .from('squads')
    .select('roster_locked, payment_status')
    .eq('id', squad.id)
    .single();

  console.log(`✓ Squad roster_locked: ${updatedSquad.roster_locked} (Expected: true)`);
  console.log(`✓ Squad payment_status: ${updatedSquad.payment_status} (Expected: SUBMITTED)`);
  if (!updatedSquad.roster_locked || updatedSquad.payment_status !== 'SUBMITTED') {
    throw new Error('Trigger FAILED to lock roster on payment submission!');
  }

  console.log('\n--- 4. Testing Unique UTR Constraint ---');
  const { error: dupErr } = await supabase.from('payments').insert({
    squad_id: squad.id,
    amount_submitted: 100,
    amount_expected: 100,
    utr_number: utr,
    screenshot_url: 'data:image/png;base64,...',
    status: 'SUBMITTED',
  });

  if (dupErr && dupErr.code === '23505') {
    console.log(`✓ Duplicate UTR '${utr}' successfully blocked by database constraint.`);
  } else {
    throw new Error('Unique constraint on UTR failed to trigger!');
  }

  console.log('\n--- 5. Approving Payment at Finance Desk ---');
  const { error: vErr } = await supabase
    .from('payments')
    .update({ status: 'VERIFIED', verified_at: new Date().toISOString() })
    .eq('id', payment.id);

  if (vErr) throw vErr;

  const { data: verifiedSquad } = await supabase
    .from('squads')
    .select('payment_status')
    .eq('id', squad.id)
    .single();

  console.log(`✓ Squad payment_status after approval: ${verifiedSquad.payment_status} (Expected: VERIFIED)`);
  if (verifiedSquad.payment_status !== 'VERIFIED') {
    throw new Error('Trigger FAILED to transition squad status to VERIFIED!');
  }

  console.log('\n🎉 ALL DAY 3 PAYMENT FLOW & VERIFICATION TESTS PASSED CLEANLY!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
