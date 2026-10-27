import { sealData } from 'iron-session';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const SESSION_PASSWORD = 'cf004dbdc69afa4adebc452cd9cf29b6d164dfd7296f857ab9a1c9c64e087ee7';

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

async function run() {
  console.log('🧪 Verifying Squad Dashboard UI & Endpoint Integration...');

  // 1. Get MITM-M squad
  const { data: squad, error } = await supabase
    .from('squads')
    .select('id, squad_code, gender, college_id, colleges(id, name, code, district)')
    .eq('squad_code', 'MITM-M')
    .single();

  if (error || !squad) {
    throw new Error(`Squad MITM-M not found: ${error?.message}`);
  }

  const college = Array.isArray(squad.colleges) ? squad.colleges[0] : squad.colleges;

  // 2. Generate Iron Session
  const sessionData = {
    isLoggedIn: true,
    role: 'squad_manager',
    entityId: squad.id,
    displayName: college?.name || 'Maharaja Institute of Technology Mysore',
    collegeId: college?.id,
    collegeName: college?.name,
    collegeCode: college?.code,
    squadId: squad.id,
    squadCode: squad.squad_code,
    gender: squad.gender,
  };

  const sealed = await sealData(sessionData, { password: SESSION_PASSWORD });

  // 3. Fetch /squad/dashboard
  const res = await fetch('http://localhost:3000/squad/dashboard', {
    headers: {
      Cookie: `vtu_sportos_session=${sealed}`,
    },
  });

  console.log(`HTTP Status: ${res.status}`);
  if (res.status !== 200) {
    const text = await res.text();
    console.error(text.slice(0, 500));
    process.exit(1);
  }

  const html = await res.text();

  // 4. Assert UI Redesign Checks
  const checks = [
    { name: 'Contains squad-hero-card', pass: html.includes('squad-hero-card') },
    { name: 'Contains college name', pass: html.includes('Maharaja Institute of Technology Mysore') },
    { name: 'Contains Division Pill', pass: html.includes("Men's Athletics Division") },
    { name: 'Contains squad-kpi-grid', pass: html.includes('squad-kpi-grid') },
    { name: 'Contains squad-roster-card', pass: html.includes('squad-roster-card') },
    { name: 'Contains squad-ops-grid', pass: html.includes('squad-ops-grid') },
    { name: 'Contains squad-advisory-card', pass: html.includes('squad-advisory-card') },
    { name: 'Duplicate header removed (AthletesManager not inlined)', pass: !html.includes('id="btn-register-new-student"') },
    { name: 'Navbar active indicator present', pass: html.includes('Contingent Overview') },
  ];

  console.log('\n--- UI Component Assertion Results ---');
  let allPass = true;
  for (const c of checks) {
    console.log(`  ${c.pass ? '✓' : '✗'} ${c.name}`);
    if (!c.pass) allPass = false;
  }

  if (!allPass) {
    console.error('\n❌ Some UI checks failed!');
    process.exit(1);
  }

  console.log('\n✨ ALL SQUAD DASHBOARD CHECKS PASSED PERFECTLY!\n');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
