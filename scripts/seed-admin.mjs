import ws from 'ws';
globalThis.WebSocket = ws;

import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function seedAdmin() {
  const username = 'admin';
  const defaultPassword = process.env.ADMIN_INITIAL_PASSWORD || 'vtuadmin2026';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(defaultPassword, salt);

  const { data: existing } = await supabase
    .from('staff')
    .select('id, username')
    .eq('username', username)
    .single();

  if (existing) {
    console.log(`Staff '${username}' already exists. Updating password hash...`);
    await supabase
      .from('staff')
      .update({ password_hash: passwordHash, is_active: true })
      .eq('id', existing.id);
  } else {
    console.log(`Creating initial admin account '${username}'...`);
    const { error } = await supabase.from('staff').insert({
      username,
      password_hash: passwordHash,
      display_name: 'Meet Technical Director',
      role: 'meet_admin',
      is_active: true,
    });
    if (error) {
      console.error('Failed to create admin:', error);
      process.exit(1);
    }
  }

  console.log(`✓ Admin initialized successfully:`);
  console.log(`  Username: ${username}`);
  console.log(`  Password: ${defaultPassword}`);
}

seedAdmin();
