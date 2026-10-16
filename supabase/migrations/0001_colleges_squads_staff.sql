-- ==============================================================================
-- Migration: 0001_colleges_squads_staff.sql
-- Description: Core entity model for VTU SportsOS
--              1. colleges
--              2. squads (with passphrase hash and squad_code)
--              3. staff (operational staff with roles and PIN/password auth)
--              4. meet_settings
-- ==============================================================================

-- Enable pgcrypto for UUID and cryptographic functions if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- Helper: updated_at trigger function
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 1. COLLEGES TABLE
-- Represents the participating educational institutions (e.g. MIT Mysore, SJCE).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL, -- e.g. "MITM", uppercase recommended
  district TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_colleges_code ON colleges (code);

DROP TRIGGER IF EXISTS trg_colleges_updated_at ON colleges;
CREATE TRIGGER trg_colleges_updated_at
  BEFORE UPDATE ON colleges
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_timestamp();

-- ------------------------------------------------------------------------------
-- 2. SQUADS TABLE
-- A squad represents a college's gender division (Men or Women).
-- Credentials, payment status, roster locks, and bid blocks attach here.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  gender TEXT NOT NULL CHECK (gender IN ('men', 'women')),
  squad_code TEXT UNIQUE NOT NULL, -- e.g. "MITM-M" (men), "MITM-G" (women)
  passphrase_hash TEXT NOT NULL, -- bcrypt/argon2 hash of generated passphrase
  ped_name TEXT NOT NULL DEFAULT '',
  ped_phone TEXT NOT NULL DEFAULT '',
  ped_email TEXT,
  roster_locked BOOLEAN NOT NULL DEFAULT FALSE,
  payment_status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (payment_status IN ('DRAFT', 'SUBMITTED', 'VERIFIED', 'REJECTED')),
  bid_block_start INT,
  bid_block_end INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (college_id, gender)
);

CREATE INDEX IF NOT EXISTS idx_squads_college_id ON squads (college_id);
CREATE INDEX IF NOT EXISTS idx_squads_squad_code ON squads (squad_code);
CREATE INDEX IF NOT EXISTS idx_squads_payment_status ON squads (payment_status);

DROP TRIGGER IF EXISTS trg_squads_updated_at ON squads;
CREATE TRIGGER trg_squads_updated_at
  BEFORE UPDATE ON squads
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_timestamp();

-- ------------------------------------------------------------------------------
-- 3. STAFF TABLE
-- All staff operational roles:
-- - meet_admin (Technical/Meet Director, full admin)
-- - finance_desk (Payment verification desk)
-- - accreditation_volunteer (Entry gate QR scanner)
-- - warden (Hostel check-in scanner)
-- - call_room_official (Track marshal / Call room official)
-- - referee (Event field/track judge)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE, -- NULL for PIN-only roles
  pin_hash TEXT, -- Hashed 4-6 digit PIN for volunteer/warden/referee roles
  password_hash TEXT, -- Hashed password for username-based admin/finance roles
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (
    role IN (
      'meet_admin',
      'finance_desk',
      'accreditation_volunteer',
      'warden',
      'call_room_official',
      'referee'
    )
  ),
  scope_event_ids UUID[] NOT NULL DEFAULT '{}', -- For referees to restrict events
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  -- Enforce that either username + password or display_name + pin_hash is provided
  CONSTRAINT chk_staff_auth CHECK (
    (username IS NOT NULL AND password_hash IS NOT NULL) OR
    (pin_hash IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_staff_username ON staff (username);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff (role);

DROP TRIGGER IF EXISTS trg_staff_updated_at ON staff;
CREATE TRIGGER trg_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_timestamp();

-- ------------------------------------------------------------------------------
-- 4. MEET SETTINGS TABLE
-- Master configuration for the athletic meet
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meet_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meet_name TEXT NOT NULL DEFAULT 'VTU Inter-Collegiate Athletics Meet 2026',
  venue TEXT NOT NULL DEFAULT 'VTU Campus Stadium',
  start_date DATE,
  end_date DATE,
  registration_open BOOLEAN NOT NULL DEFAULT TRUE,
  registration_closed_at TIMESTAMPTZ,
  host_upi_id TEXT NOT NULL DEFAULT 'vtuathletics@upi',
  host_account_name TEXT NOT NULL DEFAULT 'VTU Sports Board',
  host_account_number TEXT,
  host_ifsc TEXT,
  qr_code_image_url TEXT,
  fee_per_regular_event INT NOT NULL DEFAULT 100,
  fee_per_relay_team INT NOT NULL DEFAULT 100,
  fee_per_marathon INT NOT NULL DEFAULT 100,
  fee_per_reserve_event INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS trg_meet_settings_updated_at ON meet_settings;
CREATE TRIGGER trg_meet_settings_updated_at
  BEFORE UPDATE ON meet_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_timestamp();

-- Insert default meet settings if empty
INSERT INTO meet_settings (
  meet_name,
  venue,
  host_upi_id,
  host_account_name
)
SELECT
  'VTU Inter-Collegiate Athletics Meet 2026',
  'VTU Campus Stadium',
  'vtuathletics@upi',
  'VTU Sports Board'
WHERE NOT EXISTS (SELECT 1 FROM meet_settings);

-- ------------------------------------------------------------------------------
-- 5. RPC HELPER: create_college_with_squads
-- Creates a college and generates its Men (-M) and Women (-G) squads atomically.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_college_with_squads(
  p_name TEXT,
  p_code TEXT,
  p_district TEXT,
  p_men_passphrase_hash TEXT,
  p_women_passphrase_hash TEXT,
  p_ped_name TEXT DEFAULT '',
  p_ped_phone TEXT DEFAULT '',
  p_ped_email TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_college_id UUID;
  v_upper_code TEXT := upper(trim(p_code));
  v_men_squad_id UUID;
  v_women_squad_id UUID;
BEGIN
  -- Insert College
  INSERT INTO colleges (name, code, district)
  VALUES (trim(p_name), v_upper_code, trim(p_district))
  RETURNING id INTO v_college_id;

  -- Insert Men Squad (Code: CODE-M)
  INSERT INTO squads (
    college_id,
    gender,
    squad_code,
    passphrase_hash,
    ped_name,
    ped_phone,
    ped_email
  )
  VALUES (
    v_college_id,
    'men',
    v_upper_code || '-M',
    p_men_passphrase_hash,
    p_ped_name,
    p_ped_phone,
    p_ped_email
  )
  RETURNING id INTO v_men_squad_id;

  -- Insert Women Squad (Code: CODE-G)
  INSERT INTO squads (
    college_id,
    gender,
    squad_code,
    passphrase_hash,
    ped_name,
    ped_phone,
    ped_email
  )
  VALUES (
    v_college_id,
    'women',
    v_upper_code || '-G',
    p_women_passphrase_hash,
    p_ped_name,
    p_ped_phone,
    p_ped_email
  )
  RETURNING id INTO v_women_squad_id;

  RETURN jsonb_build_object(
    'college_id', v_college_id,
    'college_code', v_upper_code,
    'men_squad_id', v_men_squad_id,
    'men_squad_code', v_upper_code || '-M',
    'women_squad_id', v_women_squad_id,
    'women_squad_code', v_upper_code || '-G'
  );
END;
$$ LANGUAGE plpgsql;
