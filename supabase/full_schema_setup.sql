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
-- ==============================================================================
-- Migration: 0002_events_catalogue.sql
-- Description: Standard Category-Aware Athletic Events Catalogue
--              Includes start_type, lane configs, attempt rules, and seeds all
--              track, field, relay, and road events for Men and Women.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL, -- e.g. "100M-M", "SP-W"
  gender TEXT NOT NULL CHECK (gender IN ('men', 'women', 'mixed')),
  category TEXT NOT NULL CHECK (
    category IN (
      'track_sprint',
      'track_distance',
      'track_hurdles',
      'field_throw',
      'field_horizontal_jump',
      'field_vertical_jump',
      'relay',
      'road',
      'combined'
    )
  ),
  measurement_unit TEXT CHECK (measurement_unit IN ('seconds', 'metres', 'points', NULL)),
  start_type TEXT NOT NULL CHECK (start_type IN ('lanes', 'waterfall', 'mass', 'road')),
  max_lanes INT,
  has_rounds BOOLEAN NOT NULL DEFAULT FALSE,
  is_multi_attempt BOOLEAN NOT NULL DEFAULT FALSE,
  is_progressive_height BOOLEAN NOT NULL DEFAULT FALSE,
  max_attempts_per_height INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_events_gender ON events (gender);
CREATE INDEX IF NOT EXISTS idx_events_category ON events (category);

DROP TRIGGER IF EXISTS trg_events_updated_at ON events;
CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_timestamp();

-- ------------------------------------------------------------------------------
-- SEED EVENTS CATALOGUE (Idempotent: ON CONFLICT DO NOTHING)
-- ------------------------------------------------------------------------------
INSERT INTO events (name, code, gender, category, measurement_unit, start_type, max_lanes, has_rounds, is_multi_attempt, is_progressive_height, max_attempts_per_height)
VALUES
  -- 1. Sprints
  ('100m Men', '100M-M', 'men', 'track_sprint', 'seconds', 'lanes', 8, TRUE, FALSE, FALSE, NULL),
  ('100m Women', '100M-W', 'women', 'track_sprint', 'seconds', 'lanes', 8, TRUE, FALSE, FALSE, NULL),
  ('200m Men', '200M-M', 'men', 'track_sprint', 'seconds', 'lanes', 8, TRUE, FALSE, FALSE, NULL),
  ('200m Women', '200M-W', 'women', 'track_sprint', 'seconds', 'lanes', 8, TRUE, FALSE, FALSE, NULL),
  ('400m Men', '400M-M', 'men', 'track_sprint', 'seconds', 'lanes', 8, TRUE, FALSE, FALSE, NULL),
  ('400m Women', '400M-W', 'women', 'track_sprint', 'seconds', 'lanes', 8, TRUE, FALSE, FALSE, NULL),

  -- 2. Hurdles
  ('110m Hurdles Men', '110H-M', 'men', 'track_hurdles', 'seconds', 'lanes', 8, TRUE, FALSE, FALSE, NULL),
  ('100m Hurdles Women', '100H-W', 'women', 'track_hurdles', 'seconds', 'lanes', 8, TRUE, FALSE, FALSE, NULL),
  ('400m Hurdles Men', '400H-M', 'men', 'track_hurdles', 'seconds', 'lanes', 8, TRUE, FALSE, FALSE, NULL),
  ('400m Hurdles Women', '400H-W', 'women', 'track_hurdles', 'seconds', 'lanes', 8, TRUE, FALSE, FALSE, NULL),

  -- 3. Middle & Long Distance
  ('800m Men', '800M-M', 'men', 'track_distance', 'seconds', 'waterfall', NULL, TRUE, FALSE, FALSE, NULL),
  ('800m Women', '800M-W', 'women', 'track_distance', 'seconds', 'waterfall', NULL, TRUE, FALSE, FALSE, NULL),
  ('1500m Men', '1500M-M', 'men', 'track_distance', 'seconds', 'mass', NULL, FALSE, FALSE, FALSE, NULL),
  ('1500m Women', '1500M-W', 'women', 'track_distance', 'seconds', 'mass', NULL, FALSE, FALSE, FALSE, NULL),
  ('5000m Men', '5000M-M', 'men', 'track_distance', 'seconds', 'mass', NULL, FALSE, FALSE, FALSE, NULL),
  ('5000m Women', '5000M-W', 'women', 'track_distance', 'seconds', 'mass', NULL, FALSE, FALSE, FALSE, NULL),
  ('10000m Men', '10000M-M', 'men', 'track_distance', 'seconds', 'mass', NULL, FALSE, FALSE, FALSE, NULL),
  ('10000m Women', '10000M-W', 'women', 'track_distance', 'seconds', 'mass', NULL, FALSE, FALSE, FALSE, NULL),

  -- 4. Road Events
  ('21km Half Marathon Men', 'HM-M', 'men', 'road', 'seconds', 'road', NULL, FALSE, FALSE, FALSE, NULL),
  ('21km Half Marathon Women', 'HM-W', 'women', 'road', 'seconds', 'road', NULL, FALSE, FALSE, FALSE, NULL),

  -- 5. Relays
  ('4x100m Relay Men', '4X100M-M', 'men', 'relay', 'seconds', 'lanes', 8, FALSE, FALSE, FALSE, NULL),
  ('4x100m Relay Women', '4X100M-W', 'women', 'relay', 'seconds', 'lanes', 8, FALSE, FALSE, FALSE, NULL),
  ('4x400m Relay Men', '4X400M-M', 'men', 'relay', 'seconds', 'lanes', 8, FALSE, FALSE, FALSE, NULL),
  ('4x400m Relay Women', '4X400M-W', 'women', 'relay', 'seconds', 'lanes', 8, FALSE, FALSE, FALSE, NULL),

  -- 6. Field Throws (Up to 6 attempts, best mark in metres)
  ('Shot Put Men', 'SP-M', 'men', 'field_throw', 'metres', 'mass', NULL, FALSE, TRUE, FALSE, NULL),
  ('Shot Put Women', 'SP-W', 'women', 'field_throw', 'metres', 'mass', NULL, FALSE, TRUE, FALSE, NULL),
  ('Discus Throw Men', 'DT-M', 'men', 'field_throw', 'metres', 'mass', NULL, FALSE, TRUE, FALSE, NULL),
  ('Discus Throw Women', 'DT-W', 'women', 'field_throw', 'metres', 'mass', NULL, FALSE, TRUE, FALSE, NULL),
  ('Javelin Throw Men', 'JT-M', 'men', 'field_throw', 'metres', 'mass', NULL, FALSE, TRUE, FALSE, NULL),
  ('Javelin Throw Women', 'JT-W', 'women', 'field_throw', 'metres', 'mass', NULL, FALSE, TRUE, FALSE, NULL),
  ('Hammer Throw Men', 'HT-M', 'men', 'field_throw', 'metres', 'mass', NULL, FALSE, TRUE, FALSE, NULL),
  ('Hammer Throw Women', 'HT-W', 'women', 'field_throw', 'metres', 'mass', NULL, FALSE, TRUE, FALSE, NULL),

  -- 7. Field Horizontal Jumps (Up to 6 attempts, best mark in metres)
  ('Long Jump Men', 'LJ-M', 'men', 'field_horizontal_jump', 'metres', 'mass', NULL, FALSE, TRUE, FALSE, NULL),
  ('Long Jump Women', 'LJ-W', 'women', 'field_horizontal_jump', 'metres', 'mass', NULL, FALSE, TRUE, FALSE, NULL),
  ('Triple Jump Men', 'TJ-M', 'men', 'field_horizontal_jump', 'metres', 'mass', NULL, FALSE, TRUE, FALSE, NULL),
  ('Triple Jump Women', 'TJ-W', 'women', 'field_horizontal_jump', 'metres', 'mass', NULL, FALSE, TRUE, FALSE, NULL),

  -- 8. Field Vertical Jumps (Progressive heights, 3 attempts per bar)
  ('High Jump Men', 'HJ-M', 'men', 'field_vertical_jump', 'metres', 'mass', NULL, FALSE, FALSE, TRUE, 3),
  ('High Jump Women', 'HJ-W', 'women', 'field_vertical_jump', 'metres', 'mass', NULL, FALSE, FALSE, TRUE, 3),
  ('Pole Vault Men', 'PV-M', 'men', 'field_vertical_jump', 'metres', 'mass', NULL, FALSE, FALSE, TRUE, 3),
  ('Pole Vault Women', 'PV-W', 'women', 'field_vertical_jump', 'metres', 'mass', NULL, FALSE, FALSE, TRUE, 3)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  start_type = EXCLUDED.start_type,
  has_rounds = EXCLUDED.has_rounds,
  is_multi_attempt = EXCLUDED.is_multi_attempt,
  is_progressive_height = EXCLUDED.is_progressive_height,
  max_attempts_per_height = EXCLUDED.max_attempts_per_height;
-- ==============================================================================
-- Migration: 0003_profiles_registrations.sql
-- Description: Normalized Athlete Roster and Event Registrations
--              1. profiles (Athlete bio-data, USN, dates, bid_number)
--              2. registrations (Normalized junction: profile_id, event_id, kind)
--              3. relay_teams & relay_members (Proper team-level relay entities)
--              4. Quota enforcement triggers
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- Athlete bio-data registered by their College Squad Manager (PED).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  sslc_name TEXT NOT NULL,
  usn TEXT NOT NULL, -- University Seat Number (e.g. 4MT22CS001)
  semester INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
  blood_group TEXT NOT NULL,
  college_joining_date DATE NOT NULL,
  sem_start_date DATE NOT NULL,
  aadhaar_number TEXT, -- 12 digit Aadhaar number
  photo_url TEXT, -- Athlete passport photo in athlete-photos bucket
  bid_number INT, -- Assigned automatically upon registration closure
  accreditation_status TEXT NOT NULL DEFAULT 'REGISTERED'
    CHECK (accreditation_status IN ('REGISTERED', 'ACCREDITED', 'WITHDRAWN')),
  accredited_at TIMESTAMPTZ,
  accommodation_checked_in BOOLEAN NOT NULL DEFAULT FALSE,
  accommodation_checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (squad_id, usn) -- An athlete USN is unique within their squad
);

CREATE INDEX IF NOT EXISTS idx_profiles_squad_id ON profiles (squad_id);
CREATE INDEX IF NOT EXISTS idx_profiles_bid_number ON profiles (bid_number);
CREATE INDEX IF NOT EXISTS idx_profiles_usn ON profiles (usn);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_timestamp();

-- ------------------------------------------------------------------------------
-- 2. REGISTRATIONS TABLE (Normalized Junction)
-- Maps athletes to individual events (regular, reserve, relay, half_marathon).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('regular', 'reserve', 'relay', 'half_marathon')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (profile_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_registrations_profile_id ON registrations (profile_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON registrations (event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_kind ON registrations (kind);

-- ------------------------------------------------------------------------------
-- 3. QUOTA VALIDATION TRIGGER
-- Enforces:
-- - Maximum 2 'regular' events per athlete
-- - Maximum 1 'reserve' event per athlete
-- - Prevents an event from being both regular and reserve for the same athlete
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_registration_quotas()
RETURNS TRIGGER AS $$
DECLARE
  v_regular_count INT;
  v_reserve_count INT;
BEGIN
  -- Check regular event count
  IF NEW.kind = 'regular' THEN
    SELECT count(*) INTO v_regular_count
    FROM registrations
    WHERE profile_id = NEW.profile_id AND kind = 'regular' AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000');

    IF v_regular_count >= 2 THEN
      RAISE EXCEPTION 'Athlete cannot be registered for more than 2 regular events.';
    END IF;
  END IF;

  -- Check reserve event count
  IF NEW.kind = 'reserve' THEN
    SELECT count(*) INTO v_reserve_count
    FROM registrations
    WHERE profile_id = NEW.profile_id AND kind = 'reserve' AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000');

    IF v_reserve_count >= 1 THEN
      RAISE EXCEPTION 'Athlete cannot have more than 1 reserve event.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_registration_quotas ON registrations;
CREATE TRIGGER trg_validate_registration_quotas
  BEFORE INSERT OR UPDATE ON registrations
  FOR EACH ROW
  EXECUTE FUNCTION validate_registration_quotas();

-- ------------------------------------------------------------------------------
-- 4. RELAY TEAMS & RELAY MEMBERS
-- Team-level entities for 4x100m and 4x400m entries.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS relay_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (squad_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_relay_teams_squad_id ON relay_teams (squad_id);
CREATE INDEX IF NOT EXISTS idx_relay_teams_event_id ON relay_teams (event_id);

CREATE TABLE IF NOT EXISTS relay_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relay_team_id UUID NOT NULL REFERENCES relay_teams(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leg_order INT CHECK (leg_order BETWEEN 1 AND 4),
  is_reserve BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (relay_team_id, profile_id),
  CONSTRAINT chk_relay_leg_reserve CHECK (
    (is_reserve = FALSE AND leg_order IS NOT NULL) OR
    (is_reserve = TRUE AND leg_order IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_relay_members_team_id ON relay_members (relay_team_id);
CREATE INDEX IF NOT EXISTS idx_relay_members_profile_id ON relay_members (profile_id);

-- Enforce maximum 4 runners + up to 2 reserves per relay team
CREATE OR REPLACE FUNCTION validate_relay_team_composition()
RETURNS TRIGGER AS $$
DECLARE
  v_runner_count INT;
  v_reserve_count INT;
BEGIN
  IF NEW.is_reserve = FALSE THEN
    SELECT count(*) INTO v_runner_count
    FROM relay_members
    WHERE relay_team_id = NEW.relay_team_id AND is_reserve = FALSE AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000');

    IF v_runner_count >= 4 THEN
      RAISE EXCEPTION 'A relay team cannot have more than 4 running members.';
    END IF;
  ELSE
    SELECT count(*) INTO v_reserve_count
    FROM relay_members
    WHERE relay_team_id = NEW.relay_team_id AND is_reserve = TRUE AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000');

    IF v_reserve_count >= 2 THEN
      RAISE EXCEPTION 'A relay team cannot have more than 2 reserve runners.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_relay_team_composition ON relay_members;
CREATE TRIGGER trg_validate_relay_team_composition
  BEFORE INSERT OR UPDATE ON relay_members
  FOR EACH ROW
  EXECUTE FUNCTION validate_relay_team_composition();
-- ==============================================================================
-- Migration: 0004_payments.sql
-- Description: Offline UPI Payment Submissions and Verification Desk
--              1. payments table (UTR, amount submitted/expected, screenshot URL)
--              2. Unique constraint on UTR number
--              3. Auto-lock squad roster on submission
--              4. Sync squad.payment_status with payment verification lifecycle
-- ==============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  amount_submitted INT NOT NULL,
  amount_expected INT NOT NULL,
  utr_number TEXT UNIQUE NOT NULL, -- Unique 12-digit UPI/Bank Transaction ID
  screenshot_url TEXT NOT NULL, -- Supabase Storage path or Data URL
  status TEXT NOT NULL DEFAULT 'SUBMITTED'
    CHECK (status IN ('SUBMITTED', 'VERIFIED', 'REJECTED')),
  rejection_reason TEXT,
  verified_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payments_squad_id ON payments (squad_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_utr ON payments (utr_number);

DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_timestamp();

-- ------------------------------------------------------------------------------
-- TRIGGER: sync_squad_payment_status
-- When a payment is submitted, verified, or rejected, automatically update
-- the parent squad's payment_status and enforce roster locking.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_squad_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_verified_total INT;
  v_pending_count INT;
  v_expected_fee INT;
BEGIN
  -- On INSERT of a new payment, lock the roster and set squad status to SUBMITTED
  IF TG_OP = 'INSERT' THEN
    UPDATE squads
    SET
      roster_locked = TRUE,
      payment_status = 'SUBMITTED',
      updated_at = timezone('utc'::text, now())
    WHERE id = NEW.squad_id;
  END IF;

  -- On UPDATE of payment status
  IF TG_OP = 'UPDATE' THEN
    -- Check total verified payments
    SELECT COALESCE(SUM(amount_submitted), 0) INTO v_verified_total
    FROM payments
    WHERE squad_id = NEW.squad_id AND status = 'VERIFIED';

    -- Check if any submissions are still pending verification
    SELECT count(*) INTO v_pending_count
    FROM payments
    WHERE squad_id = NEW.squad_id AND status = 'SUBMITTED';

    IF v_verified_total >= NEW.amount_expected THEN
      UPDATE squads
      SET payment_status = 'VERIFIED', updated_at = timezone('utc'::text, now())
      WHERE id = NEW.squad_id;
    ELSIF v_pending_count > 0 THEN
      UPDATE squads
      SET payment_status = 'SUBMITTED', updated_at = timezone('utc'::text, now())
      WHERE id = NEW.squad_id;
    ELSE
      -- All submitted payments were rejected
      UPDATE squads
      SET payment_status = 'REJECTED', updated_at = timezone('utc'::text, now())
      WHERE id = NEW.squad_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_squad_payment_status ON payments;
CREATE TRIGGER trg_sync_squad_payment_status
  AFTER INSERT OR UPDATE OF status, amount_submitted ON payments
  FOR EACH ROW
  EXECUTE FUNCTION sync_squad_payment_status();

-- ------------------------------------------------------------------------------
-- RPC: compute_squad_fee
-- Calculates the total fee breakdown for a squad based on meet settings:
-- Fee = (regular events count * regular_fee) + (relay teams * relay_fee) + (HM count * hm_fee)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION compute_squad_fee(p_squad_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_regular_count INT := 0;
  v_reserve_count INT := 0;
  v_hm_count INT := 0;
  v_relay_count INT := 0;
  v_regular_fee INT := 100;
  v_relay_fee INT := 100;
  v_hm_fee INT := 100;
  v_total_amount INT := 0;
BEGIN
  -- Read current meet fee settings
  SELECT
    COALESCE(fee_per_regular_event, 100),
    COALESCE(fee_per_relay_team, 100),
    COALESCE(fee_per_marathon, 100)
  INTO
    v_regular_fee,
    v_relay_fee,
    v_hm_fee
  FROM meet_settings
  LIMIT 1;

  -- Count athlete event registrations
  SELECT
    COUNT(*) FILTER (WHERE r.kind = 'regular'),
    COUNT(*) FILTER (WHERE r.kind = 'reserve'),
    COUNT(*) FILTER (WHERE r.kind = 'half_marathon'),
    COUNT(*) FILTER (WHERE r.kind = 'relay')
  INTO
    v_regular_count,
    v_reserve_count,
    v_hm_count,
    v_relay_count
  FROM registrations r
  JOIN profiles p ON r.profile_id = p.id
  WHERE p.squad_id = p_squad_id;

  v_total_amount := (v_regular_count * v_regular_fee) +
                    (v_relay_count * v_relay_fee) +
                    (v_hm_count * v_hm_fee);

  RETURN jsonb_build_object(
    'regular_events_count', v_regular_count,
    'regular_fee_rate', v_regular_fee,
    'reserve_events_count', v_reserve_count,
    'hm_count', v_hm_count,
    'hm_fee_rate', v_hm_fee,
    'relay_teams_count', v_relay_count,
    'relay_fee_rate', v_relay_fee,
    'total_amount', v_total_amount
  );
END;
$$ LANGUAGE plpgsql;
-- ==============================================================================
-- Migration: 0005_registration_lock_bids.sql
-- Description: Registration Closure, Contiguous Bid Generation, and Amendment Engine
--              1. Contiguous Bid Generation RPC (Men from 100, Women from 2001)
--              2. Master registration closure and roster locking
--              3. roster_amendments table (audit log for withdrawals, substitutions, late entries)
--              4. Post-close amendment RPCs (preserving bid gaps on withdrawal)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS roster_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  amendment_type TEXT NOT NULL CHECK (amendment_type IN ('withdraw', 'substitute', 'late_entry')),
  original_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  new_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  bid_number INT,
  reason TEXT NOT NULL,
  performed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_amendments_squad_id ON roster_amendments (squad_id);
CREATE INDEX IF NOT EXISTS idx_amendments_type ON roster_amendments (amendment_type);

-- ------------------------------------------------------------------------------
-- RPC: close_registration_and_generate_bids
-- Locks all squads, closes meet registration, and assigns contiguous chest/bid numbers:
-- Men squads: Blocks from 100 upwards sorted by college name
-- Women squads: Blocks from 2001 upwards sorted by college name
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION close_registration_and_generate_bids()
RETURNS JSONB AS $$
DECLARE
  v_men_counter INT := 100;
  v_women_counter INT := 2001;
  r_squad RECORD;
  r_athlete RECORD;
  v_squad_start INT;
  v_squad_end INT;
  v_athlete_count INT;
  v_total_men INT := 0;
  v_total_women INT := 0;
BEGIN
  -- 1. Mark registration closed in meet_settings
  UPDATE meet_settings
  SET
    registration_open = FALSE,
    registration_closed_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  WHERE id IS NOT NULL;

  -- 2. Lock all squads
  UPDATE squads
  SET roster_locked = TRUE, updated_at = timezone('utc'::text, now())
  WHERE id IS NOT NULL;

  -- 3. Assign Bids for MEN SQUADS (from 100)
  FOR r_squad IN
    SELECT s.id, s.squad_code, c.name AS college_name
    FROM squads s
    JOIN colleges c ON s.college_id = c.id
    WHERE s.gender = 'men'
    ORDER BY c.name ASC
  LOOP
    -- Count athletes in squad
    SELECT COUNT(*) INTO v_athlete_count
    FROM profiles
    WHERE squad_id = r_squad.id AND accreditation_status <> 'WITHDRAWN';

    IF v_athlete_count > 0 THEN
      v_squad_start := v_men_counter;
      v_squad_end := v_men_counter + v_athlete_count - 1;

      -- Assign sequential bids to athletes
      FOR r_athlete IN
        SELECT id
        FROM profiles
        WHERE squad_id = r_squad.id AND accreditation_status <> 'WITHDRAWN'
        ORDER BY sslc_name ASC, usn ASC
      LOOP
        UPDATE profiles
        SET bid_number = v_men_counter, updated_at = timezone('utc'::text, now())
        WHERE id = r_athlete.id;

        v_men_counter := v_men_counter + 1;
      END LOOP;

      -- Update squad block bounds
      UPDATE squads
      SET
        bid_block_start = v_squad_start,
        bid_block_end = v_squad_end,
        updated_at = timezone('utc'::text, now())
      WHERE id = r_squad.id;

      v_total_men := v_total_men + v_athlete_count;
    END IF;
  END LOOP;

  -- 4. Assign Bids for WOMEN SQUADS (from 2001)
  FOR r_squad IN
    SELECT s.id, s.squad_code, c.name AS college_name
    FROM squads s
    JOIN colleges c ON s.college_id = c.id
    WHERE s.gender = 'women'
    ORDER BY c.name ASC
  LOOP
    SELECT COUNT(*) INTO v_athlete_count
    FROM profiles
    WHERE squad_id = r_squad.id AND accreditation_status <> 'WITHDRAWN';

    IF v_athlete_count > 0 THEN
      v_squad_start := v_women_counter;
      v_squad_end := v_women_counter + v_athlete_count - 1;

      FOR r_athlete IN
        SELECT id
        FROM profiles
        WHERE squad_id = r_squad.id AND accreditation_status <> 'WITHDRAWN'
        ORDER BY sslc_name ASC, usn ASC
      LOOP
        UPDATE profiles
        SET bid_number = v_women_counter, updated_at = timezone('utc'::text, now())
        WHERE id = r_athlete.id;

        v_women_counter := v_women_counter + 1;
      END LOOP;

      UPDATE squads
      SET
        bid_block_start = v_squad_start,
        bid_block_end = v_squad_end,
        updated_at = timezone('utc'::text, now())
      WHERE id = r_squad.id;

      v_total_women := v_total_women + v_athlete_count;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'total_men_bids_assigned', v_total_men,
    'total_women_bids_assigned', v_total_women,
    'men_bid_range_end', v_men_counter - 1,
    'women_bid_range_end', v_women_counter - 1
  );
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- RPC: withdraw_athlete
-- Marks an athlete withdrawn and voids their bid, preserving the bid gap on heat sheets.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION withdraw_athlete(
  p_profile_id UUID,
  p_reason TEXT,
  p_admin_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_bid INT;
  v_squad_id UUID;
  v_name TEXT;
BEGIN
  SELECT bid_number, squad_id, sslc_name
  INTO v_bid, v_squad_id, v_name
  FROM profiles
  WHERE id = p_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Athlete profile not found.';
  END IF;

  -- Mark profile as WITHDRAWN
  UPDATE profiles
  SET accreditation_status = 'WITHDRAWN', updated_at = timezone('utc'::text, now())
  WHERE id = p_profile_id;

  -- Delete event registrations so they do not appear in heat seeding
  DELETE FROM registrations WHERE profile_id = p_profile_id;
  DELETE FROM relay_members WHERE profile_id = p_profile_id;

  -- Log amendment
  INSERT INTO roster_amendments (
    squad_id,
    amendment_type,
    original_profile_id,
    bid_number,
    reason,
    performed_by
  )
  VALUES (
    v_squad_id,
    'withdraw',
    p_profile_id,
    v_bid,
    p_reason,
    p_admin_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'athlete_name', v_name,
    'bid_number', v_bid,
    'status', 'WITHDRAWN'
  );
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- RPC: substitute_athlete
-- Substitutes a withdrawn athlete with a new athlete inheriting the same bid number.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION substitute_athlete(
  p_withdrawn_profile_id UUID,
  p_new_sslc_name TEXT,
  p_new_usn TEXT,
  p_new_semester INT,
  p_new_blood_group TEXT,
  p_new_joining_date DATE,
  p_new_sem_start_date DATE,
  p_reason TEXT,
  p_admin_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_bid INT;
  v_squad_id UUID;
  v_new_profile_id UUID;
BEGIN
  SELECT bid_number, squad_id
  INTO v_bid, v_squad_id
  FROM profiles
  WHERE id = p_withdrawn_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawn profile not found.';
  END IF;

  -- Create new profile inheriting the bid number
  INSERT INTO profiles (
    squad_id,
    sslc_name,
    usn,
    semester,
    blood_group,
    college_joining_date,
    sem_start_date,
    bid_number,
    accreditation_status
  )
  VALUES (
    v_squad_id,
    p_new_sslc_name,
    upper(trim(p_new_usn)),
    p_new_semester,
    p_new_blood_group,
    p_new_joining_date,
    p_new_sem_start_date,
    v_bid,
    'REGISTERED'
  )
  RETURNING id INTO v_new_profile_id;

  -- Log amendment
  INSERT INTO roster_amendments (
    squad_id,
    amendment_type,
    original_profile_id,
    new_profile_id,
    bid_number,
    reason,
    performed_by
  )
  VALUES (
    v_squad_id,
    'substitute',
    p_withdrawn_profile_id,
    v_new_profile_id,
    v_bid,
    p_reason,
    p_admin_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_profile_id', v_new_profile_id,
    'inherited_bid_number', v_bid
  );
END;
$$ LANGUAGE plpgsql;
-- ==============================================================================
-- Migration: 0006_accreditation.sql
-- Description: Offline-Resilient Entry Gate Accreditation Engine
--              1. accreditation_scans audit log with client-side UUID idempotency
--              2. process_accreditation_scan RPC function with duplicate protection
-- ==============================================================================

CREATE TABLE IF NOT EXISTS accreditation_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_scan_uuid UUID UNIQUE NOT NULL, -- Client-generated idempotency key
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scanned_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  device_timestamp TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_accred_scans_profile ON accreditation_scans (profile_id);
CREATE INDEX IF NOT EXISTS idx_accred_scans_client_uuid ON accreditation_scans (client_scan_uuid);

-- ------------------------------------------------------------------------------
-- RPC: process_accreditation_scan
-- Idempotent entry gate accreditation procedure.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_accreditation_scan(
  p_client_uuid UUID,
  p_profile_id UUID,
  p_volunteer_id UUID,
  p_device_timestamp TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  r_profile RECORD;
  v_already_accredited BOOLEAN := FALSE;
  v_scan_exists BOOLEAN := FALSE;
  v_events JSONB;
BEGIN
  -- 1. Check idempotency: If this client UUID was already processed, return success immediately
  SELECT TRUE INTO v_scan_exists
  FROM accreditation_scans
  WHERE client_scan_uuid = p_client_uuid;

  IF v_scan_exists THEN
    SELECT p.id, p.sslc_name, p.usn, p.bid_number, p.accreditation_status, c.name AS college_name, s.squad_code
    INTO r_profile
    FROM profiles p
    JOIN squads s ON p.squad_id = s.id
    JOIN colleges c ON s.college_id = c.id
    WHERE p.id = p_profile_id;

    RETURN jsonb_build_object(
      'success', true,
      'is_duplicate_sync', true,
      'already_accredited', true,
      'athlete_id', r_profile.id,
      'sslc_name', r_profile.sslc_name,
      'usn', r_profile.usn,
      'bid_number', r_profile.bid_number,
      'college_name', r_profile.college_name,
      'squad_code', r_profile.squad_code,
      'status', r_profile.accreditation_status
    );
  END IF;

  -- 2. Fetch athlete profile
  SELECT p.id, p.sslc_name, p.usn, p.bid_number, p.accreditation_status, c.name AS college_name, s.squad_code
  INTO r_profile
  FROM profiles p
  JOIN squads s ON p.squad_id = s.id
  JOIN colleges c ON s.college_id = c.id
  WHERE p.id = p_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Athlete profile not found.';
  END IF;

  IF r_profile.accreditation_status = 'WITHDRAWN' THEN
    RAISE EXCEPTION 'Cannot accredit withdrawn athlete.';
  END IF;

  IF r_profile.accreditation_status = 'ACCREDITED' THEN
    v_already_accredited := TRUE;
  END IF;

  -- 3. Update athlete status
  UPDATE profiles
  SET
    accreditation_status = 'ACCREDITED',
    accredited_at = COALESCE(accredited_at, timezone('utc'::text, now())),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_profile_id;

  -- 4. Record scan audit log
  INSERT INTO accreditation_scans (
    client_scan_uuid,
    profile_id,
    scanned_by,
    device_timestamp
  )
  VALUES (
    p_client_uuid,
    p_profile_id,
    p_volunteer_id,
    COALESCE(p_device_timestamp, timezone('utc'::text, now()))
  );

  -- 5. Fetch athlete registered events for on-screen confirmation
  SELECT jsonb_agg(jsonb_build_object('name', e.name, 'code', e.code, 'kind', r.kind))
  INTO v_events
  FROM registrations r
  JOIN events e ON r.event_id = e.id
  WHERE r.profile_id = p_profile_id;

  RETURN jsonb_build_object(
    'success', true,
    'is_duplicate_sync', false,
    'already_accredited', v_already_accredited,
    'athlete_id', r_profile.id,
    'sslc_name', r_profile.sslc_name,
    'usn', r_profile.usn,
    'bid_number', r_profile.bid_number,
    'college_name', r_profile.college_name,
    'squad_code', r_profile.squad_code,
    'events', COALESCE(v_events, '[]'::jsonb),
    'status', 'ACCREDITED'
  );
END;
$$ LANGUAGE plpgsql;
-- ==============================================================================
-- Migration: 0007_accommodation.sql
-- Description: Offline-Resilient Hostel Accommodation Management System
--              1. hostels table for men/women accommodation blocks
--              2. hostel_allocations mapping squads to designated hostels
--              3. accommodation_scans audit log with client-side UUID idempotency
--              4. process_accommodation_checkin idempotent RPC function
--              5. Seed default hostels and warden staff user
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HOSTELS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hostels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('men', 'women')),
  total_capacity INTEGER NOT NULL DEFAULT 200,
  warden_name TEXT NOT NULL DEFAULT 'Hostel Warden',
  warden_phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_hostels_gender ON hostels (gender);

DROP TRIGGER IF EXISTS trg_hostels_updated_at ON hostels;
CREATE TRIGGER trg_hostels_updated_at
  BEFORE UPDATE ON hostels
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_timestamp();

-- ------------------------------------------------------------------------------
-- 2. HOSTEL ALLOCATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hostel_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  room_range TEXT DEFAULT 'General Dormitory',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_squad_hostel_allocation UNIQUE (squad_id)
);

CREATE INDEX IF NOT EXISTS idx_hostel_allocations_hostel ON hostel_allocations (hostel_id);
CREATE INDEX IF NOT EXISTS idx_hostel_allocations_squad ON hostel_allocations (squad_id);

-- ------------------------------------------------------------------------------
-- 3. ACCOMMODATION SCANS TABLE (AUDIT & IDEMPOTENCY)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accommodation_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_scan_uuid UUID UNIQUE NOT NULL, -- Client-generated idempotency key
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  scanned_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  room_assigned TEXT DEFAULT 'General Dorm',
  caution_deposit NUMERIC(10,2) NOT NULL DEFAULT 500.00,
  caution_receipt_no TEXT DEFAULT '',
  device_timestamp TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_accom_scans_profile ON accommodation_scans (profile_id);
CREATE INDEX IF NOT EXISTS idx_accom_scans_hostel ON accommodation_scans (hostel_id);
CREATE INDEX IF NOT EXISTS idx_accom_scans_client_uuid ON accommodation_scans (client_scan_uuid);

-- ------------------------------------------------------------------------------
-- 4. RPC: process_accommodation_checkin
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_accommodation_checkin(
  p_client_uuid UUID,
  p_profile_id UUID,
  p_hostel_id UUID,
  p_warden_id UUID,
  p_room_assigned TEXT DEFAULT 'General Dorm',
  p_caution_deposit NUMERIC DEFAULT 500.00,
  p_caution_receipt_no TEXT DEFAULT '',
  p_device_timestamp TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  r_profile RECORD;
  r_hostel RECORD;
  v_already_checked_in BOOLEAN := FALSE;
  v_scan_exists BOOLEAN := FALSE;
  v_current_occupancy INTEGER := 0;
BEGIN
  -- 1. Check idempotency: If this client UUID was already processed, return existing state
  SELECT TRUE INTO v_scan_exists
  FROM accommodation_scans
  WHERE client_scan_uuid = p_client_uuid;

  IF v_scan_exists THEN
    SELECT p.id, p.sslc_name, p.usn, p.bid_number, p.accommodation_checked_in,
           c.name AS college_name, s.squad_code, s.gender AS squad_gender,
           h.name AS hostel_name, a.room_assigned, a.caution_deposit, a.caution_receipt_no
    INTO r_profile
    FROM accommodation_scans a
    JOIN profiles p ON a.profile_id = p.id
    JOIN squads s ON p.squad_id = s.id
    JOIN colleges c ON s.college_id = c.id
    JOIN hostels h ON a.hostel_id = h.id
    WHERE a.client_scan_uuid = p_client_uuid;

    RETURN jsonb_build_object(
      'success', true,
      'is_duplicate_sync', true,
      'already_checked_in', true,
      'athlete_id', r_profile.id,
      'sslc_name', r_profile.sslc_name,
      'usn', r_profile.usn,
      'bid_number', r_profile.bid_number,
      'college_name', r_profile.college_name,
      'squad_code', r_profile.squad_code,
      'hostel_name', r_profile.hostel_name,
      'room_assigned', r_profile.room_assigned,
      'caution_deposit', r_profile.caution_deposit,
      'caution_receipt_no', r_profile.caution_receipt_no
    );
  END IF;

  -- 2. Fetch athlete profile + squad gender
  SELECT p.id, p.sslc_name, p.usn, p.bid_number, p.accreditation_status, p.accommodation_checked_in,
         c.name AS college_name, s.squad_code, s.gender AS squad_gender
  INTO r_profile
  FROM profiles p
  JOIN squads s ON p.squad_id = s.id
  JOIN colleges c ON s.college_id = c.id
  WHERE p.id = p_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Athlete profile not found.';
  END IF;

  IF r_profile.accreditation_status = 'WITHDRAWN' THEN
    RAISE EXCEPTION 'Cannot check-in withdrawn athlete.';
  END IF;

  -- 3. Fetch Hostel & Validate Gender Compatibility
  SELECT id, name, gender, total_capacity
  INTO r_hostel
  FROM hostels
  WHERE id = p_hostel_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hostel not found.';
  END IF;

  IF LOWER(r_profile.squad_gender) <> LOWER(r_hostel.gender) THEN
    RAISE EXCEPTION 'Gender mismatch: % athlete cannot be allocated to % hostel (%).',
      UPPER(r_profile.squad_gender), UPPER(r_hostel.gender), r_hostel.name;
  END IF;

  IF r_profile.accommodation_checked_in THEN
    v_already_checked_in := TRUE;
  END IF;

  -- 4. Check Current Occupancy
  SELECT COUNT(DISTINCT profile_id) INTO v_current_occupancy
  FROM accommodation_scans
  WHERE hostel_id = p_hostel_id;

  -- 5. Update athlete profile
  UPDATE profiles
  SET
    accommodation_checked_in = TRUE,
    accommodation_checked_in_at = COALESCE(accommodation_checked_in_at, timezone('utc'::text, now())),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_profile_id;

  -- 6. Insert scan audit record
  INSERT INTO accommodation_scans (
    client_scan_uuid,
    profile_id,
    hostel_id,
    scanned_by,
    room_assigned,
    caution_deposit,
    caution_receipt_no,
    device_timestamp
  )
  VALUES (
    p_client_uuid,
    p_profile_id,
    p_hostel_id,
    p_warden_id,
    COALESCE(NULLIF(p_room_assigned, ''), 'General Dorm'),
    COALESCE(p_caution_deposit, 500.00),
    COALESCE(p_caution_receipt_no, ''),
    COALESCE(p_device_timestamp, timezone('utc'::text, now()))
  );

  RETURN jsonb_build_object(
    'success', true,
    'is_duplicate_sync', false,
    'already_checked_in', v_already_checked_in,
    'athlete_id', r_profile.id,
    'sslc_name', r_profile.sslc_name,
    'usn', r_profile.usn,
    'bid_number', r_profile.bid_number,
    'college_name', r_profile.college_name,
    'squad_code', r_profile.squad_code,
    'hostel_id', r_hostel.id,
    'hostel_name', r_hostel.name,
    'room_assigned', COALESCE(NULLIF(p_room_assigned, ''), 'General Dorm'),
    'caution_deposit', COALESCE(p_caution_deposit, 500.00),
    'caution_receipt_no', COALESCE(p_caution_receipt_no, ''),
    'occupancy_after_checkin', v_current_occupancy + 1,
    'total_capacity', r_hostel.total_capacity
  );
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 5. SEED DEFAULT HOSTELS & WARDEN STAFF
-- ------------------------------------------------------------------------------
INSERT INTO hostels (name, gender, total_capacity, warden_name, warden_phone)
VALUES
  ('Cauvery Boys Hostel (Block A)', 'men', 250, 'Prof. Ramesh K (Warden)', '+91 98450 11221'),
  ('Krishna Boys Hostel (Block B)', 'men', 250, 'Dr. Suresh Babu (Warden)', '+91 98450 11222'),
  ('Sharavathi Girls Hostel (Block A)', 'women', 200, 'Dr. Geetha Rao (Warden)', '+91 98450 22331'),
  ('Hemavathi Girls Hostel (Block B)', 'women', 200, 'Prof. Sunitha M (Warden)', '+91 98450 22332')
ON CONFLICT DO NOTHING;

-- Seed a warden staff login with PIN 1234 (bcrypt hash)
INSERT INTO staff (display_name, role, pin_hash, is_active)
VALUES (
  'Hostel Warden Desk',
  'warden',
  '$2a$10$08r0Bc6TequIS3WGBwlZ8et9CU9ALYO5G7j1Ir96.h3Um9fRQr5NO', -- PIN 1234
  TRUE
)
ON CONFLICT DO NOTHING;
-- ==============================================================================
-- Migration: 0008_schedule_heats_seeding.sql
-- Description: Schedule Builder & Heat Seeding Engine (World Athletics Rule 166.4)
--              1. schedule_sessions & schedule_items tables
--              2. heats & heat_athletes tables with call room tracking
--              3. generate_heat_draw RPC function (Serpentine & Preferred Lanes)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SCHEDULE SESSIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedule_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meet_id UUID REFERENCES meet_settings(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL, -- e.g. "Day 1 — Morning Track & Field"
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_sched_sessions_date ON schedule_sessions (session_date);

-- ------------------------------------------------------------------------------
-- 2. SCHEDULE ITEMS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES schedule_sessions(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('HEATS', 'SEMI_FINAL', 'FINAL', 'QUALIFYING')),
  scheduled_time TIME NOT NULL,
  estimated_duration_min INTEGER NOT NULL DEFAULT 20,
  call_room_time TIME,
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (
    status IN ('SCHEDULED', 'CALL_ROOM_OPEN', 'IN_PROGRESS', 'COMPLETED', 'DELAYED')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_sched_items_session ON schedule_items (session_id);
CREATE INDEX IF NOT EXISTS idx_sched_items_event ON schedule_items (event_id);

-- ------------------------------------------------------------------------------
-- 3. HEATS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS heats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  schedule_item_id UUID REFERENCES schedule_items(id) ON DELETE SET NULL,
  stage TEXT NOT NULL DEFAULT 'HEATS' CHECK (stage IN ('HEATS', 'SEMI_FINAL', 'FINAL', 'QUALIFYING')),
  heat_number INTEGER NOT NULL DEFAULT 1,
  wind_reading NUMERIC(4,2), -- Wind gauge reading (m/s) e.g. +1.4
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (
    status IN ('SCHEDULED', 'CALL_ROOM', 'ON_TRACK', 'IN_PROGRESS', 'COMPLETED', 'OFFICIAL')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_event_stage_heat UNIQUE (event_id, stage, heat_number)
);

CREATE INDEX IF NOT EXISTS idx_heats_event ON heats (event_id);

-- ------------------------------------------------------------------------------
-- 4. HEAT ATHLETES TABLE (LANE / ORDER ASSIGNMENTS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS heat_athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  heat_id UUID NOT NULL REFERENCES heats(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  relay_team_id UUID REFERENCES relay_teams(id) ON DELETE CASCADE,
  lane_number INTEGER NOT NULL, -- 1-8 for track lanes, or flight jumping/throwing order
  call_room_reported BOOLEAN NOT NULL DEFAULT FALSE,
  call_room_reported_at TIMESTAMPTZ,
  seed_mark TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_heat_lane UNIQUE (heat_id, lane_number),
  CONSTRAINT chk_heat_athlete_entity CHECK (profile_id IS NOT NULL OR relay_team_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_heat_athletes_heat ON heat_athletes (heat_id);
CREATE INDEX IF NOT EXISTS idx_heat_athletes_profile ON heat_athletes (profile_id);

-- ------------------------------------------------------------------------------
-- 5. RPC: generate_heat_draw
-- Implements Serpentine heat distribution & World Athletics Rule 166.4 Lane Seeding
-- Preferred 8-lane track order: 4, 5, 3, 6, 2, 7, 1, 8
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_heat_draw(
  p_event_id UUID,
  p_stage TEXT DEFAULT 'HEATS',
  p_num_lanes INTEGER DEFAULT 8
)
RETURNS JSONB AS $$
DECLARE
  r_event RECORD;
  v_athletes UUID[];
  v_total_athletes INTEGER := 0;
  v_num_heats INTEGER := 1;
  v_heat_ids UUID[];
  v_heat_id UUID;
  v_heat_idx INTEGER;
  v_lane_idx INTEGER;
  v_lane_number INTEGER;
  v_direction INTEGER := 1;
  v_cur_heat INTEGER := 1;
  v_lane_order INTEGER[] := ARRAY[4, 5, 3, 6, 2, 7, 1, 8];
  v_heat_assigned_lanes INTEGER[];
  v_athlete_id UUID;
  i INTEGER;
  v_result JSONB;
BEGIN
  -- 1. Fetch Event Info
  SELECT id, name, code, gender, category, start_type
  INTO r_event
  FROM events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found.';
  END IF;

  -- 2. Fetch eligible athletes (or relay teams) registered for this event
  IF r_event.category = 'relay' THEN
    SELECT array_agg(rt.id)
    INTO v_athletes
    FROM relay_teams rt
    JOIN squads s ON rt.squad_id = s.id
    WHERE rt.event_id = p_event_id;
  ELSE
    SELECT array_agg(p.id ORDER BY p.bid_number ASC NULLS LAST, p.created_at ASC)
    INTO v_athletes
    FROM registrations r
    JOIN profiles p ON r.profile_id = p.id
    WHERE r.event_id = p_event_id
      AND p.accreditation_status <> 'WITHDRAWN';
  END IF;

  v_total_athletes := COALESCE(array_length(v_athletes, 1), 0);

  IF v_total_athletes = 0 THEN
    RAISE EXCEPTION 'No eligible participants found for event % (%).', r_event.name, r_event.code;
  END IF;

  -- 3. Calculate Number of Heats Needed
  IF v_total_athletes <= p_num_lanes THEN
    v_num_heats := 1;
  ELSE
    v_num_heats := CEIL(v_total_athletes::NUMERIC / p_num_lanes::NUMERIC)::INTEGER;
  END IF;

  -- 4. Clean up any existing scheduled heats for this event and stage
  DELETE FROM heats
  WHERE event_id = p_event_id
    AND stage = p_stage
    AND status = 'SCHEDULED';

  -- 5. Create Heats
  v_heat_ids := ARRAY[]::UUID[];
  FOR i IN 1..v_num_heats LOOP
    INSERT INTO heats (event_id, stage, heat_number, status)
    VALUES (p_event_id, p_stage, i, 'SCHEDULED')
    RETURNING id INTO v_heat_id;

    v_heat_ids := array_append(v_heat_ids, v_heat_id);
  END LOOP;

  -- Initialize lane tracker per heat (array of count of athletes per heat)
  v_heat_assigned_lanes := array_fill(0, ARRAY[v_num_heats]);

  -- 6. Serpentine / Zig-Zag Distribution & Lane Assignment
  v_cur_heat := 1;
  v_direction := 1;

  FOR i IN 1..v_total_athletes LOOP
    v_athlete_id := v_athletes[i];
    v_heat_id := v_heat_ids[v_cur_heat];

    -- Determine lane for this heat
    v_heat_assigned_lanes[v_cur_heat] := v_heat_assigned_lanes[v_cur_heat] + 1;
    v_lane_idx := v_heat_assigned_lanes[v_cur_heat];

    IF r_event.category LIKE 'field%' THEN
      -- Field events (Order of flight attempts: 1, 2, 3...)
      v_lane_number := v_lane_idx;
    ELSE
      -- Track events (World Athletics preferred lane order: 4, 5, 3, 6, 2, 7, 1, 8)
      IF v_lane_idx <= array_length(v_lane_order, 1) THEN
        v_lane_number := v_lane_order[v_lane_idx];
      ELSE
        v_lane_number := v_lane_idx;
      END IF;
    END IF;

    -- Insert athlete into heat
    IF r_event.category = 'relay' THEN
      INSERT INTO heat_athletes (heat_id, relay_team_id, lane_number)
      VALUES (v_heat_id, v_athlete_id, v_lane_number);
    ELSE
      INSERT INTO heat_athletes (heat_id, profile_id, lane_number)
      VALUES (v_heat_id, v_athlete_id, v_lane_number);
    END IF;

    -- Move to next heat in serpentine fashion
    IF v_direction = 1 THEN
      IF v_cur_heat = v_num_heats THEN
        v_direction := -1; -- bounce back
      ELSE
        v_cur_heat := v_cur_heat + 1;
      END IF;
    ELSE
      IF v_cur_heat = 1 THEN
        v_direction := 1; -- bounce forward
      ELSE
        v_cur_heat := v_cur_heat - 1;
      END IF;
    END IF;
  END LOOP;

  -- 7. Build summary return
  RETURN jsonb_build_object(
    'success', true,
    'event_id', p_event_id,
    'event_name', r_event.name,
    'stage', p_stage,
    'total_athletes', v_total_athletes,
    'num_heats', v_num_heats,
    'heats_created', v_heat_ids
  );
END;
$$ LANGUAGE plpgsql;
-- ==============================================================================
-- Migration: 0009_call_room_marshaling.sql
-- Description: Call Room Operations, Kit/Spike Inspection & Marshaling Engine
--              1. call_room_inspections table for athlete check-in & gear check
--              2. record_call_room_inspection RPC
--              3. advance_heat_to_track RPC (marks uninspected athletes as DNS)
--              4. Seed call room staff official
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CALL ROOM INSPECTIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS call_room_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  heat_athlete_id UUID NOT NULL REFERENCES heat_athletes(id) ON DELETE CASCADE,
  inspected_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  reported_status TEXT NOT NULL DEFAULT 'REPORTED' CHECK (
    reported_status IN ('REPORTED', 'SCRATCH', 'DNS', 'DISQUALIFIED')
  ),
  bib_affixed BOOLEAN NOT NULL DEFAULT TRUE,
  spike_length_mm NUMERIC(3,1) NOT NULL DEFAULT 9.0,
  uniform_approved BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT DEFAULT '',
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_call_room_inspection UNIQUE (heat_athlete_id)
);

CREATE INDEX IF NOT EXISTS idx_call_room_heat_athlete ON call_room_inspections (heat_athlete_id);

-- ------------------------------------------------------------------------------
-- 2. RPC: record_call_room_inspection
-- Records marshal gear check and updates heat_athletes reporting status
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_call_room_inspection(
  p_heat_athlete_id UUID,
  p_official_id UUID,
  p_reported_status TEXT DEFAULT 'REPORTED',
  p_bib_affixed BOOLEAN DEFAULT TRUE,
  p_spike_length_mm NUMERIC DEFAULT 9.0,
  p_uniform_approved BOOLEAN DEFAULT TRUE,
  p_notes TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
  r_ha RECORD;
  r_event RECORD;
  v_max_spike NUMERIC := 9.0;
  v_inspection_id UUID;
BEGIN
  -- 1. Fetch heat athlete and event details
  SELECT ha.id, ha.heat_id, ha.lane_number, ha.profile_id, ha.relay_team_id,
         h.event_id, e.name AS event_name, e.category AS event_category
  INTO r_ha
  FROM heat_athletes ha
  JOIN heats h ON ha.heat_id = h.id
  JOIN events e ON h.event_id = e.id
  WHERE ha.id = p_heat_athlete_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Heat athlete record not found.';
  END IF;

  -- 2. Validate spike length based on World Athletics rules
  -- High Jump and Javelin allow up to 12mm; track and other jumps max 9mm
  IF r_ha.event_name ILIKE '%High Jump%' OR r_ha.event_name ILIKE '%Javelin%' THEN
    v_max_spike := 12.0;
  ELSE
    v_max_spike := 9.0;
  END IF;

  IF p_spike_length_mm > v_max_spike THEN
    RAISE EXCEPTION 'Spike length %mm exceeds maximum allowable limit of %mm for %.',
      p_spike_length_mm, v_max_spike, r_ha.event_name;
  END IF;

  -- 3. Upsert call room inspection record
  INSERT INTO call_room_inspections (
    heat_athlete_id,
    inspected_by,
    reported_status,
    bib_affixed,
    spike_length_mm,
    uniform_approved,
    notes,
    inspected_at
  )
  VALUES (
    p_heat_athlete_id,
    p_official_id,
    p_reported_status,
    p_bib_affixed,
    p_spike_length_mm,
    p_uniform_approved,
    p_notes,
    timezone('utc'::text, now())
  )
  ON CONFLICT (heat_athlete_id) DO UPDATE SET
    inspected_by = EXCLUDED.inspected_by,
    reported_status = EXCLUDED.reported_status,
    bib_affixed = EXCLUDED.bib_affixed,
    spike_length_mm = EXCLUDED.spike_length_mm,
    uniform_approved = EXCLUDED.uniform_approved,
    notes = EXCLUDED.notes,
    inspected_at = timezone('utc'::text, now())
  RETURNING id INTO v_inspection_id;

  -- 4. Update heat_athletes attendance
  UPDATE heat_athletes
  SET
    call_room_reported = (p_reported_status = 'REPORTED'),
    call_room_reported_at = CASE WHEN p_reported_status = 'REPORTED' THEN timezone('utc'::text, now()) ELSE NULL END
  WHERE id = p_heat_athlete_id;

  RETURN jsonb_build_object(
    'success', true,
    'inspection_id', v_inspection_id,
    'heat_athlete_id', p_heat_athlete_id,
    'reported_status', p_reported_status,
    'spike_length_mm', p_spike_length_mm,
    'bib_affixed', p_bib_affixed,
    'uniform_approved', p_uniform_approved
  );
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 3. RPC: advance_heat_to_track
-- Advances heat from Call Room to the track.
-- Unreported athletes are automatically marked DNS (Did Not Start).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION advance_heat_to_track(
  p_heat_id UUID,
  p_official_id UUID
)
RETURNS JSONB AS $$
DECLARE
  r_heat RECORD;
  v_dns_count INTEGER := 0;
  v_reported_count INTEGER := 0;
  r_unreported RECORD;
BEGIN
  -- 1. Fetch Heat Info
  SELECT h.id, h.event_id, h.stage, h.heat_number, h.status, e.name AS event_name
  INTO r_heat
  FROM heats h
  JOIN events e ON h.event_id = e.id
  WHERE h.id = p_heat_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Heat not found.';
  END IF;

  -- 2. Count reported athletes
  SELECT COUNT(*) INTO v_reported_count
  FROM heat_athletes
  WHERE heat_id = p_heat_id AND call_room_reported = TRUE;

  -- 3. Automatically record DNS for any athletes who did not report
  FOR r_unreported IN
    SELECT ha.id
    FROM heat_athletes ha
    LEFT JOIN call_room_inspections cri ON ha.id = cri.heat_athlete_id
    WHERE ha.heat_id = p_heat_id
      AND (ha.call_room_reported = FALSE OR cri.reported_status IS NULL)
  LOOP
    INSERT INTO call_room_inspections (
      heat_athlete_id,
      inspected_by,
      reported_status,
      notes,
      inspected_at
    )
    VALUES (
      r_unreported.id,
      p_official_id,
      'DNS',
      'Did not report to call room before race marshal closure.',
      timezone('utc'::text, now())
    )
    ON CONFLICT (heat_athlete_id) DO UPDATE SET
      reported_status = 'DNS',
      notes = 'Did not report to call room before race marshal closure.',
      inspected_at = timezone('utc'::text, now());

    v_dns_count := v_dns_count + 1;
  END LOOP;

  -- 4. Advance heat status to ON_TRACK
  UPDATE heats
  SET status = 'ON_TRACK'
  WHERE id = p_heat_id;

  RETURN jsonb_build_object(
    'success', true,
    'heat_id', p_heat_id,
    'status', 'ON_TRACK',
    'reported_athletes', v_reported_count,
    'dns_athletes', v_dns_count
  );
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 4. SEED CALL ROOM OFFICIAL STAFF USER
-- PIN 1234
-- ------------------------------------------------------------------------------
INSERT INTO staff (display_name, role, pin_hash, is_active)
VALUES (
  'Call Room Chief Marshal',
  'call_room_official',
  '$2a$10$08r0Bc6TequIS3WGBwlZ8et9CU9ALYO5G7j1Ir96.h3Um9fRQr5NO', -- PIN 1234
  TRUE
)
ON CONFLICT DO NOTHING;
-- ==============================================================================
-- Migration: 0010_field_events_scoring.sql
-- Description: Field Events Scoring Engine & High Jump Countback Matrix (Rule TR 26.8)
--              1. field_attempts table (Throws & Horizontal Jumps, 6 rounds)
--              2. vertical_jump_attempts table (High Jump & Pole Vault matrix)
--              3. submit_field_attempt RPC
--              4. submit_vertical_jump_attempt RPC
--              5. compute_field_standings RPC with World Athletics tie-breakers
--              6. Seed Field Referee staff user
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. FIELD ATTEMPTS TABLE (HORIZONTAL JUMPS & THROWS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS field_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  heat_athlete_id UUID NOT NULL REFERENCES heat_athletes(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL CHECK (round_number >= 1 AND round_number <= 6),
  attempt_type TEXT NOT NULL CHECK (attempt_type IN ('VALID', 'FOUL', 'PASS')),
  mark_meters NUMERIC(5,2), -- Distance or height in meters e.g. 7.42, 18.25
  wind_reading NUMERIC(4,2), -- Wind reading for Long Jump & Triple Jump
  recorded_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_field_athlete_round UNIQUE (heat_athlete_id, round_number),
  CONSTRAINT chk_mark_required_for_valid CHECK (
    (attempt_type = 'VALID' AND mark_meters IS NOT NULL AND mark_meters > 0) OR
    (attempt_type IN ('FOUL', 'PASS') AND mark_meters IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_field_attempts_athlete ON field_attempts (heat_athlete_id);

-- ------------------------------------------------------------------------------
-- 2. VERTICAL JUMP ATTEMPTS TABLE (HIGH JUMP & POLE VAULT MATRIX)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vertical_jump_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  heat_athlete_id UUID NOT NULL REFERENCES heat_athletes(id) ON DELETE CASCADE,
  bar_height_meters NUMERIC(4,2) NOT NULL, -- e.g. 1.65, 1.70, 1.75
  attempt_number INTEGER NOT NULL CHECK (attempt_number >= 1 AND attempt_number <= 3),
  result TEXT NOT NULL CHECK (result IN ('O', 'X', '-')), -- O=Cleared, X=Failed, -=Passed
  recorded_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_vert_athlete_height_attempt UNIQUE (heat_athlete_id, bar_height_meters, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_vert_attempts_athlete ON vertical_jump_attempts (heat_athlete_id);

-- ------------------------------------------------------------------------------
-- 3. RPC: submit_field_attempt
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION submit_field_attempt(
  p_heat_athlete_id UUID,
  p_round_number INTEGER,
  p_attempt_type TEXT,
  p_mark_meters NUMERIC DEFAULT NULL,
  p_wind NUMERIC DEFAULT NULL,
  p_official_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_attempt_id UUID;
  v_best_mark NUMERIC;
BEGIN
  -- Upsert attempt
  INSERT INTO field_attempts (
    heat_athlete_id,
    round_number,
    attempt_type,
    mark_meters,
    wind_reading,
    recorded_by,
    created_at
  )
  VALUES (
    p_heat_athlete_id,
    p_round_number,
    p_attempt_type,
    CASE WHEN p_attempt_type = 'VALID' THEN p_mark_meters ELSE NULL END,
    p_wind,
    p_official_id,
    timezone('utc'::text, now())
  )
  ON CONFLICT (heat_athlete_id, round_number) DO UPDATE SET
    attempt_type = EXCLUDED.attempt_type,
    mark_meters = EXCLUDED.mark_meters,
    wind_reading = EXCLUDED.wind_reading,
    recorded_by = EXCLUDED.recorded_by,
    created_at = timezone('utc'::text, now())
  RETURNING id INTO v_attempt_id;

  -- Compute athlete's best mark so far
  SELECT MAX(mark_meters)
  INTO v_best_mark
  FROM field_attempts
  WHERE heat_athlete_id = p_heat_athlete_id
    AND attempt_type = 'VALID';

  RETURN jsonb_build_object(
    'success', true,
    'attempt_id', v_attempt_id,
    'round_number', p_round_number,
    'attempt_type', p_attempt_type,
    'mark_meters', p_mark_meters,
    'best_mark', v_best_mark
  );
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 4. RPC: submit_vertical_jump_attempt
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION submit_vertical_jump_attempt(
  p_heat_athlete_id UUID,
  p_bar_height NUMERIC,
  p_attempt_number INTEGER,
  p_result TEXT,
  p_official_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_attempt_id UUID;
  v_best_height NUMERIC;
BEGIN
  INSERT INTO vertical_jump_attempts (
    heat_athlete_id,
    bar_height_meters,
    attempt_number,
    result,
    recorded_by,
    created_at
  )
  VALUES (
    p_heat_athlete_id,
    p_bar_height,
    p_attempt_number,
    p_result,
    p_official_id,
    timezone('utc'::text, now())
  )
  ON CONFLICT (heat_athlete_id, bar_height_meters, attempt_number) DO UPDATE SET
    result = EXCLUDED.result,
    recorded_by = EXCLUDED.recorded_by,
    created_at = timezone('utc'::text, now())
  RETURNING id INTO v_attempt_id;

  -- Compute best cleared height
  SELECT MAX(bar_height_meters)
  INTO v_best_height
  FROM vertical_jump_attempts
  WHERE heat_athlete_id = p_heat_athlete_id
    AND result = 'O';

  RETURN jsonb_build_object(
    'success', true,
    'attempt_id', v_attempt_id,
    'bar_height', p_bar_height,
    'attempt_number', p_attempt_number,
    'result', p_result,
    'best_height', v_best_height
  );
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 5. RPC: compute_field_standings
-- Implements World Athletics Rule TR 26.8 Countback & Tie-Breaker Logic
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION compute_field_standings(p_heat_id UUID)
RETURNS JSONB AS $$
DECLARE
  r_event RECORD;
  v_standings JSONB;
BEGIN
  -- 1. Fetch Event Category
  SELECT e.id, e.name, e.category
  INTO r_event
  FROM heats h
  JOIN events e ON h.event_id = e.id
  WHERE h.id = p_heat_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Heat not found.';
  END IF;

  -- 2. Differentiate between Vertical Jumps (High Jump) and Throws/Horizontal Jumps
  IF r_event.category = 'field_vertical_jump' THEN
    -- High Jump / Pole Vault: Countback Matrix Calculation (Rule TR 26.8)
    -- 1st: Highest Cleared Height (MAX height with result 'O')
    -- 2nd: Fewest attempts at the highest cleared height
    -- 3rd: Lowest total failures ('X') throughout entire competition up to that height
    WITH athlete_cleared AS (
      SELECT
        ha.id AS heat_athlete_id,
        p.id AS profile_id,
        p.sslc_name,
        p.usn,
        p.bid_number,
        c.name AS college_name,
        c.code AS college_code,
        MAX(vja.bar_height_meters) FILTER (WHERE vja.result = 'O') AS max_cleared_height
      FROM heat_athletes ha
      JOIN profiles p ON ha.profile_id = p.id
      JOIN squads s ON p.squad_id = s.id
      JOIN colleges c ON s.college_id = c.id
      LEFT JOIN vertical_jump_attempts vja ON ha.id = vja.heat_athlete_id
      WHERE ha.heat_id = p_heat_id
      GROUP BY ha.id, p.id, p.sslc_name, p.usn, p.bid_number, c.name, c.code
    ),
    athlete_countback AS (
      SELECT
        ac.*,
        -- Attempts needed at highest cleared height
        COALESCE(
          (SELECT MIN(vja.attempt_number)
           FROM vertical_jump_attempts vja
           WHERE vja.heat_athlete_id = ac.heat_athlete_id
             AND vja.bar_height_meters = ac.max_cleared_height
             AND vja.result = 'O'),
          99
        ) AS attempts_at_winning_height,
        -- Total failures up to winning height
        COALESCE(
          (SELECT COUNT(*)
           FROM vertical_jump_attempts vja
           WHERE vja.heat_athlete_id = ac.heat_athlete_id
             AND vja.result = 'X'
             AND (ac.max_cleared_height IS NULL OR vja.bar_height_meters <= ac.max_cleared_height)),
          0
        ) AS total_failures
      FROM athlete_cleared ac
    ),
    ranked_vertical AS (
      SELECT
        ROW_NUMBER() OVER (
          ORDER BY
            max_cleared_height DESC NULLS LAST,
            attempts_at_winning_height ASC,
            total_failures ASC
        ) AS rank,
        *
      FROM athlete_countback
    )
    SELECT jsonb_agg(
      jsonb_build_object(
        'rank', rank,
        'heat_athlete_id', heat_athlete_id,
        'profile_id', profile_id,
        'bid_number', bid_number,
        'sslc_name', sslc_name,
        'usn', usn,
        'college_name', college_name,
        'college_code', college_code,
        'best_mark', max_cleared_height,
        'attempts_at_best', attempts_at_winning_height,
        'total_failures', total_failures
      )
    )
    INTO v_standings
    FROM ranked_vertical;

  ELSE
    -- Throws & Horizontal Jumps: Best Mark across 6 rounds with 2nd & 3rd best tie-breakers
    WITH athlete_marks AS (
      SELECT
        ha.id AS heat_athlete_id,
        p.id AS profile_id,
        p.sslc_name,
        p.usn,
        p.bid_number,
        c.name AS college_name,
        c.code AS college_code,
        -- Best mark
        MAX(fa.mark_meters) AS best_mark,
        -- Array of all valid marks descending for tie-breaking
        array_agg(fa.mark_meters ORDER BY fa.mark_meters DESC NULLS LAST) FILTER (WHERE fa.attempt_type = 'VALID') AS all_marks
      FROM heat_athletes ha
      JOIN profiles p ON ha.profile_id = p.id
      JOIN squads s ON p.squad_id = s.id
      JOIN colleges c ON s.college_id = c.id
      LEFT JOIN field_attempts fa ON ha.id = fa.heat_athlete_id
      WHERE ha.heat_id = p_heat_id
      GROUP BY ha.id, p.id, p.sslc_name, p.usn, p.bid_number, c.name, c.code
    ),
    ranked_horizontal AS (
      SELECT
        ROW_NUMBER() OVER (
          ORDER BY
            best_mark DESC NULLS LAST,
            all_marks[2] DESC NULLS LAST, -- 2nd best mark tie-breaker
            all_marks[3] DESC NULLS LAST  -- 3rd best mark tie-breaker
        ) AS rank,
        *
      FROM athlete_marks
    )
    SELECT jsonb_agg(
      jsonb_build_object(
        'rank', rank,
        'heat_athlete_id', heat_athlete_id,
        'profile_id', profile_id,
        'bid_number', bid_number,
        'sslc_name', sslc_name,
        'usn', usn,
        'college_name', college_name,
        'college_code', college_code,
        'best_mark', best_mark,
        'second_best_mark', all_marks[2]
      )
    )
    INTO v_standings
    FROM ranked_horizontal;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'heat_id', p_heat_id,
    'event_name', r_event.name,
    'category', r_event.category,
    'standings', COALESCE(v_standings, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 6. SEED REFEREE STAFF USER
-- PIN 1234
-- ------------------------------------------------------------------------------
INSERT INTO staff (display_name, role, pin_hash, is_active)
VALUES (
  'Field Events Chief Referee',
  'referee',
  '$2a$10$08r0Bc6TequIS3WGBwlZ8et9CU9ALYO5G7j1Ir96.h3Um9fRQr5NO', -- PIN 1234
  TRUE
)
ON CONFLICT DO NOTHING;
-- ==============================================================================
-- Migration: 0011_track_results.sql
-- Description: Track Events Timing, Photo Finish & Automatic Round Qualification
--              1. track_results table (electronic timing down to 1/1000s, reaction time, DQ)
--              2. submit_track_result RPC
--              3. qualify_next_round RPC (Automatic 'Q' per heat + Time 'q' qualifiers)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TRACK RESULTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS track_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  heat_athlete_id UUID NOT NULL REFERENCES heat_athletes(id) ON DELETE CASCADE,
  time_seconds NUMERIC(8,3), -- e.g. 10.420 or 49.125 seconds
  reaction_time_ms INTEGER DEFAULT NULL, -- Reaction time from blocks (ms)
  wind_reading NUMERIC(4,2) DEFAULT NULL, -- Wind gauge reading (m/s)
  status TEXT NOT NULL DEFAULT 'FINISHED' CHECK (status IN ('FINISHED', 'DNF', 'DQ', 'DNS')),
  dq_rule TEXT DEFAULT '', -- e.g. 'TR 16.8 (False Start)', 'TR 17.3.1 (Lane Infraction)'
  photo_finish_url TEXT DEFAULT '',
  recorded_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_track_result_athlete UNIQUE (heat_athlete_id),
  CONSTRAINT chk_track_finish_time CHECK (
    (status = 'FINISHED' AND time_seconds IS NOT NULL AND time_seconds > 0) OR
    (status IN ('DNF', 'DQ', 'DNS'))
  )
);

CREATE INDEX IF NOT EXISTS idx_track_results_heat_ath ON track_results (heat_athlete_id);

-- ------------------------------------------------------------------------------
-- 2. RPC: submit_track_result
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION submit_track_result(
  p_heat_athlete_id UUID,
  p_time_seconds NUMERIC DEFAULT NULL,
  p_reaction_ms INTEGER DEFAULT NULL,
  p_wind NUMERIC DEFAULT NULL,
  p_status TEXT DEFAULT 'FINISHED',
  p_dq_rule TEXT DEFAULT '',
  p_official_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result_id UUID;
  v_actual_status TEXT := p_status;
  v_actual_dq TEXT := p_dq_rule;
BEGIN
  -- False start check: World Athletics Rule TR 16.8 defines false start as reaction time < 100ms
  IF p_reaction_ms IS NOT NULL AND p_reaction_ms < 100 AND p_status = 'FINISHED' THEN
    v_actual_status := 'DQ';
    v_actual_dq := 'TR 16.8 (False Start - Reaction time ' || p_reaction_ms || 'ms < 100ms)';
  END IF;

  INSERT INTO track_results (
    heat_athlete_id,
    time_seconds,
    reaction_time_ms,
    wind_reading,
    status,
    dq_rule,
    recorded_by,
    created_at
  )
  VALUES (
    p_heat_athlete_id,
    CASE WHEN v_actual_status = 'FINISHED' THEN p_time_seconds ELSE NULL END,
    p_reaction_ms,
    p_wind,
    v_actual_status,
    v_actual_dq,
    p_official_id,
    timezone('utc'::text, now())
  )
  ON CONFLICT (heat_athlete_id) DO UPDATE SET
    time_seconds = EXCLUDED.time_seconds,
    reaction_time_ms = EXCLUDED.reaction_time_ms,
    wind_reading = EXCLUDED.wind_reading,
    status = EXCLUDED.status,
    dq_rule = EXCLUDED.dq_rule,
    recorded_by = EXCLUDED.recorded_by,
    created_at = timezone('utc'::text, now())
  RETURNING id INTO v_result_id;

  RETURN jsonb_build_object(
    'success', true,
    'result_id', v_result_id,
    'status', v_actual_status,
    'time_seconds', CASE WHEN v_actual_status = 'FINISHED' THEN p_time_seconds ELSE NULL END,
    'dq_rule', v_actual_dq
  );
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 3. RPC: qualify_next_round
-- Implements standard World Athletics progression:
-- Top N per heat ('Q') + next fastest times overall ('q') qualify to next round
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION qualify_next_round(
  p_event_id UUID,
  p_current_stage TEXT DEFAULT 'HEATS',
  p_next_stage TEXT DEFAULT 'FINAL',
  p_auto_q_per_heat INTEGER DEFAULT 3,
  p_time_q_total INTEGER DEFAULT 2
)
RETURNS JSONB AS $$
DECLARE
  r_event RECORD;
  v_auto_q UUID[];
  v_time_q UUID[];
  v_all_qualified UUID[];
  v_next_heat_id UUID;
  v_lane_order INTEGER[] := ARRAY[4, 5, 3, 6, 2, 7, 1, 8];
  v_ath_id UUID;
  i INTEGER;
BEGIN
  -- 1. Fetch Event
  SELECT id, name, category, gender
  INTO r_event
  FROM events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found.';
  END IF;

  -- 2. Select Auto Qualifiers ('Q'): Top N in each heat of current stage
  WITH ranked_per_heat AS (
    SELECT
      ha.profile_id,
      ha.relay_team_id,
      tr.time_seconds,
      ROW_NUMBER() OVER (
        PARTITION BY h.id
        ORDER BY tr.time_seconds ASC NULLS LAST
      ) AS pos_in_heat
    FROM track_results tr
    JOIN heat_athletes ha ON tr.heat_athlete_id = ha.id
    JOIN heats h ON ha.heat_id = h.id
    WHERE h.event_id = p_event_id
      AND h.stage = p_current_stage
      AND tr.status = 'FINISHED'
  )
  SELECT array_agg(COALESCE(profile_id, relay_team_id))
  INTO v_auto_q
  FROM ranked_per_heat
  WHERE pos_in_heat <= p_auto_q_per_heat;

  -- 3. Select Time Qualifiers ('q'): Fastest times among non-auto-qualifiers
  WITH ranked_times AS (
    SELECT
      COALESCE(ha.profile_id, ha.relay_team_id) AS entity_id,
      tr.time_seconds,
      ROW_NUMBER() OVER (
        ORDER BY tr.time_seconds ASC
      ) AS time_rank
    FROM track_results tr
    JOIN heat_athletes ha ON tr.heat_athlete_id = ha.id
    JOIN heats h ON ha.heat_id = h.id
    WHERE h.event_id = p_event_id
      AND h.stage = p_current_stage
      AND tr.status = 'FINISHED'
      AND COALESCE(ha.profile_id, ha.relay_team_id) <> ALL(COALESCE(v_auto_q, ARRAY[]::UUID[]))
  )
  SELECT array_agg(entity_id)
  INTO v_time_q
  FROM ranked_times
  WHERE time_rank <= p_time_q_total;

  v_all_qualified := COALESCE(v_auto_q, ARRAY[]::UUID[]) || COALESCE(v_time_q, ARRAY[]::UUID[]);

  IF array_length(v_all_qualified, 1) = 0 THEN
    RAISE EXCEPTION 'No qualified finishers found in stage %.', p_current_stage;
  END IF;

  -- 4. Clean up any existing draft heat for next stage
  DELETE FROM heats
  WHERE event_id = p_event_id
    AND stage = p_next_stage
    AND status = 'SCHEDULED';

  -- 5. Create Next Stage Heat (e.g. Final)
  INSERT INTO heats (event_id, stage, heat_number, status)
  VALUES (p_event_id, p_next_stage, 1, 'SCHEDULED')
  RETURNING id INTO v_next_heat_id;

  -- 6. Assign preferred lanes to qualified runners in next stage
  FOR i IN 1..array_length(v_all_qualified, 1) LOOP
    v_ath_id := v_all_qualified[i];

    IF r_event.category = 'relay' THEN
      INSERT INTO heat_athletes (heat_id, relay_team_id, lane_number)
      VALUES (v_next_heat_id, v_ath_id, v_lane_order[i]);
    ELSE
      INSERT INTO heat_athletes (heat_id, profile_id, lane_number)
      VALUES (v_next_heat_id, v_ath_id, v_lane_order[i]);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', p_event_id,
    'next_stage', p_next_stage,
    'auto_qualified_count', COALESCE(array_length(v_auto_q, 1), 0),
    'time_qualified_count', COALESCE(array_length(v_time_q, 1), 0),
    'total_qualified', array_length(v_all_qualified, 1),
    'final_heat_id', v_next_heat_id
  );
END;
$$ LANGUAGE plpgsql;
-- ==============================================================================
-- Migration: 0012_team_championships.sql
-- Description: Team Championships Scoring & Leaderboards Engine
--              1. team_points table for tracking awarded championship points
--              2. allocate_event_points RPC (calculates 1st-6th places and awards 7-5-4-3-2-1 pts)
--              3. get_championship_standings RPC (Men, Women, Combined + Medal Tally)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TEAM POINTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  heat_id UUID NOT NULL REFERENCES heats(id) ON DELETE CASCADE,
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  relay_team_id UUID REFERENCES relay_teams(id) ON DELETE SET NULL,
  place INTEGER NOT NULL CHECK (place >= 1 AND place <= 8),
  points NUMERIC(5,2) NOT NULL, -- e.g. 7.00, 5.00, 4.00, 3.00, 2.00, 1.00 (doubled for relays)
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_event_place UNIQUE (event_id, place)
);

CREATE INDEX IF NOT EXISTS idx_team_points_college ON team_points (college_id);
CREATE INDEX IF NOT EXISTS idx_team_points_squad ON team_points (squad_id);
CREATE INDEX IF NOT EXISTS idx_team_points_event ON team_points (event_id);

-- ------------------------------------------------------------------------------
-- 2. RPC: allocate_event_points
-- Automatically awards points from event FINAL to colleges:
-- Individual: 1st=7, 2nd=5, 3rd=4, 4th=3, 5th=2, 6th=1
-- Relays: 1st=14, 2nd=10, 3rd=8, 4th=6, 5th=4, 6th=2
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION allocate_event_points(
  p_event_id UUID,
  p_heat_id UUID
)
RETURNS JSONB AS $$
DECLARE
  r_event RECORD;
  r_placer RECORD;
  v_pts_table NUMERIC[] := ARRAY[7.0, 5.0, 4.0, 3.0, 2.0, 1.0];
  v_relay_multiplier NUMERIC := 1.0;
  v_assigned_count INTEGER := 0;
  v_cur_pts NUMERIC;
BEGIN
  -- 1. Fetch Event Details
  SELECT id, name, category, is_multi_attempt
  INTO r_event
  FROM events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found.';
  END IF;

  IF r_event.category = 'relay' THEN
    v_relay_multiplier := 2.0;
  END IF;

  -- 2. Clear any prior points allocation for this event
  DELETE FROM team_points
  WHERE event_id = p_event_id;

  -- 3. Determine Placers based on category
  IF r_event.category LIKE 'field%' THEN
    -- Field Event Final: Rank by mark
    FOR r_placer IN
      SELECT
        item->>'rank' AS rank_str,
        (item->>'heat_athlete_id')::UUID AS heat_athlete_id,
        (item->>'profile_id')::UUID AS profile_id
      FROM jsonb_array_elements(
        (compute_field_standings(p_heat_id)->'standings')
      ) AS item
      WHERE (item->>'best_mark') IS NOT NULL
      ORDER BY (item->>'rank')::INTEGER ASC
      LIMIT 6
    LOOP
      v_cur_pts := v_pts_table[r_placer.rank_str::INTEGER] * v_relay_multiplier;

      INSERT INTO team_points (
        event_id,
        heat_id,
        college_id,
        squad_id,
        profile_id,
        place,
        points
      )
      SELECT
        p_event_id,
        p_heat_id,
        s.college_id,
        s.id,
        r_placer.profile_id,
        r_placer.rank_str::INTEGER,
        v_cur_pts
      FROM profiles p
      JOIN squads s ON p.squad_id = s.id
      WHERE p.id = r_placer.profile_id
      ON CONFLICT (event_id, place) DO UPDATE SET
        points = EXCLUDED.points;

      v_assigned_count := v_assigned_count + 1;
    END LOOP;

  ELSE
    -- Track Event Final: Rank by finish time
    FOR r_placer IN
      SELECT
        ha.id AS heat_athlete_id,
        ha.profile_id,
        ha.relay_team_id,
        COALESCE(p.squad_id, rt.squad_id) AS squad_id,
        COALESCE(sp.college_id, srt.college_id) AS college_id,
        ROW_NUMBER() OVER (ORDER BY tr.time_seconds ASC) AS place,
        tr.time_seconds
      FROM track_results tr
      JOIN heat_athletes ha ON tr.heat_athlete_id = ha.id
      LEFT JOIN profiles p ON ha.profile_id = p.id
      LEFT JOIN squads sp ON p.squad_id = sp.id
      LEFT JOIN relay_teams rt ON ha.relay_team_id = rt.id
      LEFT JOIN squads srt ON rt.squad_id = srt.id
      WHERE ha.heat_id = p_heat_id
        AND tr.status = 'FINISHED'
      ORDER BY tr.time_seconds ASC
      LIMIT 6
    LOOP
      v_cur_pts := v_pts_table[r_placer.place::INTEGER] * v_relay_multiplier;

      INSERT INTO team_points (
        event_id,
        heat_id,
        college_id,
        squad_id,
        profile_id,
        relay_team_id,
        place,
        points
      )
      VALUES (
        p_event_id,
        p_heat_id,
        r_placer.college_id,
        r_placer.squad_id,
        r_placer.profile_id,
        r_placer.relay_team_id,
        r_placer.place::INTEGER,
        v_cur_pts
      )
      ON CONFLICT (event_id, place) DO UPDATE SET
        points = EXCLUDED.points;

      v_assigned_count := v_assigned_count + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', p_event_id,
    'heat_id', p_heat_id,
    'placers_awarded', v_assigned_count
  );
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 3. RPC: get_championship_standings
-- Returns aggregated Men's, Women's, and Overall Combined Team Scores + Medals
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_championship_standings()
RETURNS JSONB AS $$
DECLARE
  v_combined JSONB;
  v_mens JSONB;
  v_womens JSONB;
BEGIN
  -- Overall Combined Standings
  SELECT jsonb_agg(
    jsonb_build_object(
      'rank', rank,
      'college_id', college_id,
      'college_name', college_name,
      'college_code', college_code,
      'district', district,
      'total_points', total_points,
      'golds', golds,
      'silvers', silvers,
      'bronzes', bronzes
    )
  )
  INTO v_combined
  FROM (
    SELECT
      ROW_NUMBER() OVER (ORDER BY total_points DESC, golds DESC, silvers DESC, bronzes DESC) AS rank,
      *
    FROM (
      SELECT
        c.id AS college_id,
        c.name AS college_name,
        c.code AS college_code,
        c.district,
        COALESCE(SUM(tp.points), 0) AS total_points,
        COUNT(tp.id) FILTER (WHERE tp.place = 1) AS golds,
        COUNT(tp.id) FILTER (WHERE tp.place = 2) AS silvers,
        COUNT(tp.id) FILTER (WHERE tp.place = 3) AS bronzes
      FROM colleges c
      LEFT JOIN team_points tp ON c.id = tp.college_id
      GROUP BY c.id, c.name, c.code, c.district
    ) raw_totals
  ) ranked;

  -- Men's Championship Division
  SELECT jsonb_agg(
    jsonb_build_object(
      'rank', rank,
      'college_id', college_id,
      'college_name', college_name,
      'college_code', college_code,
      'total_points', total_points,
      'golds', golds,
      'silvers', silvers,
      'bronzes', bronzes
    )
  )
  INTO v_mens
  FROM (
    SELECT
      ROW_NUMBER() OVER (ORDER BY total_points DESC, golds DESC, silvers DESC, bronzes DESC) AS rank,
      *
    FROM (
      SELECT
        c.id AS college_id,
        c.name AS college_name,
        c.code AS college_code,
        COALESCE(SUM(tp.points), 0) AS total_points,
        COUNT(tp.id) FILTER (WHERE tp.place = 1) AS golds,
        COUNT(tp.id) FILTER (WHERE tp.place = 2) AS silvers,
        COUNT(tp.id) FILTER (WHERE tp.place = 3) AS bronzes
      FROM colleges c
      JOIN squads s ON c.id = s.college_id AND s.gender = 'men'
      LEFT JOIN team_points tp ON s.id = tp.squad_id
      GROUP BY c.id, c.name, c.code
    ) raw_mens
  ) ranked_m;

  -- Women's Championship Division
  SELECT jsonb_agg(
    jsonb_build_object(
      'rank', rank,
      'college_id', college_id,
      'college_name', college_name,
      'college_code', college_code,
      'total_points', total_points,
      'golds', golds,
      'silvers', silvers,
      'bronzes', bronzes
    )
  )
  INTO v_womens
  FROM (
    SELECT
      ROW_NUMBER() OVER (ORDER BY total_points DESC, golds DESC, silvers DESC, bronzes DESC) AS rank,
      *
    FROM (
      SELECT
        c.id AS college_id,
        c.name AS college_name,
        c.code AS college_code,
        COALESCE(SUM(tp.points), 0) AS total_points,
        COUNT(tp.id) FILTER (WHERE tp.place = 1) AS golds,
        COUNT(tp.id) FILTER (WHERE tp.place = 2) AS silvers,
        COUNT(tp.id) FILTER (WHERE tp.place = 3) AS bronzes
      FROM colleges c
      JOIN squads s ON c.id = s.college_id AND s.gender = 'women'
      LEFT JOIN team_points tp ON s.id = tp.squad_id
      GROUP BY c.id, c.name, c.code
    ) raw_womens
  ) ranked_w;

  RETURN jsonb_build_object(
    'success', true,
    'combined', COALESCE(v_combined, '[]'::jsonb),
    'mens', COALESCE(v_mens, '[]'::jsonb),
    'womens', COALESCE(v_womens, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql;
-- ==============================================================================
-- Migration: 0013_fix_concurrency_and_locks.sql
-- Description: P0 Critical Concurrency, Idempotency & Locking Hardening
--              1. close_registration_and_generate_bids: Advisory lock + idempotency check
--              2. generate_heat_draw: Advisory lock + prevent overwriting active heats
--              3. allocate_event_points: Advisory lock for safe point allocation
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HARDENED close_registration_and_generate_bids
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION close_registration_and_generate_bids()
RETURNS JSONB AS $$
DECLARE
  v_men_counter INT := 100;
  v_women_counter INT := 2001;
  r_squad RECORD;
  r_athlete RECORD;
  v_squad_start INT;
  v_squad_end INT;
  v_athlete_count INT;
  v_total_men INT := 0;
  v_total_women INT := 0;
  v_is_already_closed BOOLEAN;
  v_existing_bids_count INT;
BEGIN
  -- Obtain exclusive transaction-level advisory lock to eliminate race conditions
  PERFORM pg_advisory_xact_lock(hashtext('close_registration_and_generate_bids'));

  -- Idempotency Check: Verify if registration is already marked closed
  SELECT NOT registration_open INTO v_is_already_closed
  FROM meet_settings
  LIMIT 1;

  SELECT COUNT(*) INTO v_existing_bids_count
  FROM profiles
  WHERE bid_number IS NOT NULL;

  IF v_is_already_closed IS TRUE AND v_existing_bids_count > 0 THEN
    RETURN jsonb_build_object(
      'status', 'ALREADY_CLOSED',
      'message', 'Registration is already closed and bids have already been assigned.',
      'total_bids_assigned', v_existing_bids_count
    );
  END IF;

  -- 1. Mark registration closed in meet_settings
  UPDATE meet_settings
  SET
    registration_open = FALSE,
    registration_closed_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  WHERE id IS NOT NULL;

  -- 2. Lock all squads
  UPDATE squads
  SET roster_locked = TRUE, updated_at = timezone('utc'::text, now())
  WHERE id IS NOT NULL;

  -- 3. Assign Bids for MEN SQUADS (from 100)
  FOR r_squad IN
    SELECT s.id, s.squad_code, c.name AS college_name
    FROM squads s
    JOIN colleges c ON s.college_id = c.id
    WHERE s.gender = 'men'
    ORDER BY c.name ASC
  LOOP
    SELECT COUNT(*) INTO v_athlete_count
    FROM profiles
    WHERE squad_id = r_squad.id AND accreditation_status <> 'WITHDRAWN';

    IF v_athlete_count > 0 THEN
      v_squad_start := v_men_counter;
      v_squad_end := v_men_counter + v_athlete_count - 1;

      FOR r_athlete IN
        SELECT id
        FROM profiles
        WHERE squad_id = r_squad.id AND accreditation_status <> 'WITHDRAWN'
        ORDER BY sslc_name ASC, usn ASC
      LOOP
        UPDATE profiles
        SET bid_number = v_men_counter, updated_at = timezone('utc'::text, now())
        WHERE id = r_athlete.id;

        v_men_counter := v_men_counter + 1;
      END LOOP;

      UPDATE squads
      SET
        bid_block_start = v_squad_start,
        bid_block_end = v_squad_end,
        updated_at = timezone('utc'::text, now())
      WHERE id = r_squad.id;

      v_total_men := v_total_men + v_athlete_count;
    END IF;
  END LOOP;

  -- 4. Assign Bids for WOMEN SQUADS (from 2001)
  FOR r_squad IN
    SELECT s.id, s.squad_code, c.name AS college_name
    FROM squads s
    JOIN colleges c ON s.college_id = c.id
    WHERE s.gender = 'women'
    ORDER BY c.name ASC
  LOOP
    SELECT COUNT(*) INTO v_athlete_count
    FROM profiles
    WHERE squad_id = r_squad.id AND accreditation_status <> 'WITHDRAWN';

    IF v_athlete_count > 0 THEN
      v_squad_start := v_women_counter;
      v_squad_end := v_women_counter + v_athlete_count - 1;

      FOR r_athlete IN
        SELECT id
        FROM profiles
        WHERE squad_id = r_squad.id AND accreditation_status <> 'WITHDRAWN'
        ORDER BY sslc_name ASC, usn ASC
      LOOP
        UPDATE profiles
        SET bid_number = v_women_counter, updated_at = timezone('utc'::text, now())
        WHERE id = r_athlete.id;

        v_women_counter := v_women_counter + 1;
      END LOOP;

      UPDATE squads
      SET
        bid_block_start = v_squad_start,
        bid_block_end = v_squad_end,
        updated_at = timezone('utc'::text, now())
      WHERE id = r_squad.id;

      v_total_women := v_total_women + v_athlete_count;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'total_men_bids_assigned', v_total_men,
    'total_women_bids_assigned', v_total_women,
    'men_bid_range_end', v_men_counter - 1,
    'women_bid_range_end', v_women_counter - 1
  );
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 2. HARDENED generate_heat_draw
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_heat_draw(
  p_event_id UUID,
  p_stage TEXT DEFAULT 'HEATS',
  p_num_lanes INTEGER DEFAULT 8
)
RETURNS JSONB AS $$
DECLARE
  r_event RECORD;
  v_athletes UUID[];
  v_total_athletes INTEGER := 0;
  v_num_heats INTEGER := 1;
  v_heat_ids UUID[];
  v_heat_id UUID;
  v_lane_idx INTEGER;
  v_lane_number INTEGER;
  v_direction INTEGER := 1;
  v_cur_heat INTEGER := 1;
  v_lane_order INTEGER[] := ARRAY[4, 5, 3, 6, 2, 7, 1, 8];
  v_heat_assigned_lanes INTEGER[];
  v_athlete_id UUID;
  i INTEGER;
  v_active_heats_count INTEGER;
BEGIN
  -- Obtain advisory transaction lock specific to this event and stage
  PERFORM pg_advisory_xact_lock(hashtext('generate_heat_draw_' || p_event_id::text || '_' || p_stage));

  -- 1. Fetch Event Info
  SELECT id, name, code, gender, category, start_type
  INTO r_event
  FROM events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found.';
  END IF;

  -- 2. Guard: Cannot regenerate heats if any heat is already active or finished
  SELECT COUNT(*) INTO v_active_heats_count
  FROM heats
  WHERE event_id = p_event_id
    AND stage = p_stage
    AND status NOT IN ('SCHEDULED');

  IF v_active_heats_count > 0 THEN
    RAISE EXCEPTION 'Cannot regenerate heats for % (%): % heat(s) are already active or completed.',
      r_event.name, p_stage, v_active_heats_count;
  END IF;

  -- 3. Fetch eligible athletes (or relay teams) registered for this event
  IF r_event.category = 'relay' THEN
    SELECT array_agg(rt.id)
    INTO v_athletes
    FROM relay_teams rt
    JOIN squads s ON rt.squad_id = s.id
    WHERE rt.event_id = p_event_id;
  ELSE
    SELECT array_agg(p.id ORDER BY p.bid_number ASC NULLS LAST, p.created_at ASC)
    INTO v_athletes
    FROM registrations r
    JOIN profiles p ON r.profile_id = p.id
    WHERE r.event_id = p_event_id
      AND p.accreditation_status <> 'WITHDRAWN';
  END IF;

  v_total_athletes := COALESCE(array_length(v_athletes, 1), 0);

  IF v_total_athletes = 0 THEN
    RAISE EXCEPTION 'No eligible participants found for event % (%).', r_event.name, r_event.code;
  END IF;

  -- 4. Calculate Number of Heats Needed
  IF v_total_athletes <= p_num_lanes THEN
    v_num_heats := 1;
  ELSE
    v_num_heats := CEIL(v_total_athletes::NUMERIC / p_num_lanes::NUMERIC)::INTEGER;
  END IF;

  -- 5. Clean up only existing scheduled heats for this event and stage
  DELETE FROM heats
  WHERE event_id = p_event_id
    AND stage = p_stage
    AND status = 'SCHEDULED';

  -- 6. Create Heats
  v_heat_ids := ARRAY[]::UUID[];
  FOR i IN 1..v_num_heats LOOP
    INSERT INTO heats (event_id, stage, heat_number, status)
    VALUES (p_event_id, p_stage, i, 'SCHEDULED')
    RETURNING id INTO v_heat_id;

    v_heat_ids := array_append(v_heat_ids, v_heat_id);
  END LOOP;

  v_heat_assigned_lanes := array_fill(0, ARRAY[v_num_heats]);

  -- 7. Serpentine Distribution & Lane Assignment
  v_cur_heat := 1;
  v_direction := 1;

  FOR i IN 1..v_total_athletes LOOP
    v_athlete_id := v_athletes[i];
    v_heat_id := v_heat_ids[v_cur_heat];

    v_heat_assigned_lanes[v_cur_heat] := v_heat_assigned_lanes[v_cur_heat] + 1;
    v_lane_idx := v_heat_assigned_lanes[v_cur_heat];

    IF r_event.category LIKE 'field%' THEN
      v_lane_number := v_lane_idx;
    ELSE
      IF v_lane_idx <= array_length(v_lane_order, 1) THEN
        v_lane_number := v_lane_order[v_lane_idx];
      ELSE
        v_lane_number := v_lane_idx;
      END IF;
    END IF;

    IF r_event.category = 'relay' THEN
      INSERT INTO heat_athletes (heat_id, relay_team_id, lane_number)
      VALUES (v_heat_id, v_athlete_id, v_lane_number);
    ELSE
      INSERT INTO heat_athletes (heat_id, profile_id, lane_number)
      VALUES (v_heat_id, v_athlete_id, v_lane_number);
    END IF;

    IF v_direction = 1 THEN
      IF v_cur_heat = v_num_heats THEN
        v_direction := -1;
      ELSE
        v_cur_heat := v_cur_heat + 1;
      END IF;
    ELSE
      IF v_cur_heat = 1 THEN
        v_direction := 1;
      ELSE
        v_cur_heat := v_cur_heat - 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'event_id', p_event_id,
    'stage', p_stage,
    'total_athletes', v_total_athletes,
    'num_heats', v_num_heats,
    'heats_created', v_heat_ids
  );
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 3. HARDENED allocate_event_points
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION allocate_event_points(
  p_event_id UUID,
  p_heat_id UUID
)
RETURNS JSONB AS $$
DECLARE
  r_event RECORD;
  r_placer RECORD;
  v_pts_table NUMERIC[] := ARRAY[7.0, 5.0, 4.0, 3.0, 2.0, 1.0];
  v_relay_multiplier NUMERIC := 1.0;
  v_assigned_count INTEGER := 0;
  v_cur_pts NUMERIC;
BEGIN
  -- Obtain transaction-level advisory lock on event to avoid concurrent point calculation races
  PERFORM pg_advisory_xact_lock(hashtext('allocate_event_points_' || p_event_id::text));

  -- 1. Fetch Event Details
  SELECT id, name, category, is_multi_attempt
  INTO r_event
  FROM events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found.';
  END IF;

  IF r_event.category = 'relay' THEN
    v_relay_multiplier := 2.0;
  END IF;

  -- 2. Clear prior points allocation for this event
  DELETE FROM team_points
  WHERE event_id = p_event_id;

  -- 3. Determine Placers based on category
  IF r_event.category LIKE 'field%' THEN
    FOR r_placer IN
      SELECT
        item->>'rank' AS rank_str,
        (item->>'heat_athlete_id')::UUID AS heat_athlete_id,
        (item->>'profile_id')::UUID AS profile_id
      FROM jsonb_array_elements(
        (compute_field_standings(p_heat_id)->'standings')
      ) AS item
      WHERE (item->>'best_mark') IS NOT NULL
      ORDER BY (item->>'rank')::INTEGER ASC
      LIMIT 6
    LOOP
      v_cur_pts := v_pts_table[r_placer.rank_str::INTEGER] * v_relay_multiplier;

      INSERT INTO team_points (
        event_id,
        heat_id,
        college_id,
        squad_id,
        profile_id,
        place,
        points
      )
      SELECT
        p_event_id,
        p_heat_id,
        s.college_id,
        s.id,
        r_placer.profile_id,
        r_placer.rank_str::INTEGER,
        v_cur_pts
      FROM profiles p
      JOIN squads s ON p.squad_id = s.id
      WHERE p.id = r_placer.profile_id
      ON CONFLICT (event_id, place) DO UPDATE SET
        points = EXCLUDED.points;

      v_assigned_count := v_assigned_count + 1;
    END LOOP;

  ELSE
    FOR r_placer IN
      SELECT
        ha.id AS heat_athlete_id,
        ha.profile_id,
        ha.relay_team_id,
        COALESCE(p.squad_id, rt.squad_id) AS squad_id,
        COALESCE(sp.college_id, srt.college_id) AS college_id,
        ROW_NUMBER() OVER (ORDER BY tr.time_seconds ASC) AS place,
        tr.time_seconds
      FROM track_results tr
      JOIN heat_athletes ha ON tr.heat_athlete_id = ha.id
      LEFT JOIN profiles p ON ha.profile_id = p.id
      LEFT JOIN squads sp ON p.squad_id = sp.id
      LEFT JOIN relay_teams rt ON ha.relay_team_id = rt.id
      LEFT JOIN squads srt ON rt.squad_id = srt.id
      WHERE ha.heat_id = p_heat_id
        AND tr.status = 'FINISHED'
      ORDER BY tr.time_seconds ASC
      LIMIT 6
    LOOP
      v_cur_pts := v_pts_table[r_placer.place::INTEGER] * v_relay_multiplier;

      INSERT INTO team_points (
        event_id,
        heat_id,
        college_id,
        squad_id,
        profile_id,
        relay_team_id,
        place,
        points
      )
      VALUES (
        p_event_id,
        p_heat_id,
        r_placer.college_id,
        r_placer.squad_id,
        r_placer.profile_id,
        r_placer.relay_team_id,
        r_placer.place::INTEGER,
        v_cur_pts
      )
      ON CONFLICT (event_id, place) DO UPDATE SET
        points = EXCLUDED.points;

      v_assigned_count := v_assigned_count + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'event_id', p_event_id,
    'heat_id', p_heat_id,
    'placers_awarded', v_assigned_count,
    'is_relay', (r_event.category = 'relay')
  );
END;
$$ LANGUAGE plpgsql;
-- ==============================================================================
-- Migration: 0014_catering_meals.sql
-- Description: Catering & Mess QR Coupon Verification Engine
--              1. Update staff role constraint to include food_volunteer
--              2. meal_logs table for breakfast, lunch, snacks, dinner tracking
--              3. scan_meal_coupon RPC with duplicate meal prevention
--              4. get_meal_stats RPC for live mess counter counts
--              5. Seed default food volunteer staff account (PIN: 1234)
-- ==============================================================================

-- 1. Allow 'food_volunteer' role in staff table
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_role_check;
ALTER TABLE staff ADD CONSTRAINT staff_role_check CHECK (
  role IN (
    'meet_admin',
    'finance_desk',
    'accreditation_volunteer',
    'warden',
    'call_room_official',
    'referee',
    'food_volunteer'
  )
);

-- 2. Meal logs table
CREATE TABLE IF NOT EXISTS meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_scan_uuid TEXT UNIQUE NOT NULL,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER')),
  meal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  scanned_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_athlete_meal_per_day UNIQUE (profile_id, meal_type, meal_date)
);

CREATE INDEX IF NOT EXISTS idx_meal_logs_profile ON meal_logs (profile_id);
CREATE INDEX IF NOT EXISTS idx_meal_logs_date_type ON meal_logs (meal_date, meal_type);

-- 3. RPC: scan_meal_coupon
CREATE OR REPLACE FUNCTION scan_meal_coupon(
  p_client_uuid TEXT,
  p_profile_id UUID,
  p_meal_type TEXT,
  p_volunteer_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  r_athlete RECORD;
  r_existing_meal RECORD;
BEGIN
  -- Validate athlete existence
  SELECT p.id, p.sslc_name, p.usn, p.bid_number, p.accreditation_status, c.name AS college_name, c.code AS college_code
  INTO r_athlete
  FROM profiles p
  JOIN squads s ON p.squad_id = s.id
  JOIN colleges c ON s.college_id = c.id
  WHERE p.id = p_profile_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'NOT_FOUND',
      'message', 'Athlete record not found in system.'
    );
  END IF;

  IF r_athlete.accreditation_status = 'WITHDRAWN' THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'WITHDRAWN',
      'message', 'Athlete has been officially withdrawn from the meet.'
    );
  END IF;

  -- Check if duplicate client scan UUID (offline sync retry)
  IF EXISTS (SELECT 1 FROM meal_logs WHERE client_scan_uuid = p_client_uuid) THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', 'GRANTED',
      'is_duplicate_sync', true,
      'meal_type', p_meal_type,
      'athlete_name', r_athlete.sslc_name,
      'bid_number', r_athlete.bid_number,
      'college_name', r_athlete.college_name,
      'college_code', r_athlete.college_code
    );
  END IF;

  -- Check if already received this meal today
  SELECT scanned_at INTO r_existing_meal
  FROM meal_logs
  WHERE profile_id = p_profile_id
    AND meal_type = p_meal_type
    AND meal_date = CURRENT_DATE;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'ALREADY_SERVED',
      'meal_type', p_meal_type,
      'served_at', r_existing_meal.scanned_at,
      'athlete_name', r_athlete.sslc_name,
      'bid_number', r_athlete.bid_number,
      'college_name', r_athlete.college_name,
      'college_code', r_athlete.college_code,
      'message', 'ALREADY CLAIMED: Athlete already received ' || p_meal_type || ' today at ' || to_char(r_existing_meal.scanned_at AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM') || '.'
    );
  END IF;

  -- Grant meal and record coupon log
  INSERT INTO meal_logs (
    client_scan_uuid,
    profile_id,
    meal_type,
    meal_date,
    scanned_by
  )
  VALUES (
    p_client_uuid,
    p_profile_id,
    p_meal_type,
    CURRENT_DATE,
    p_volunteer_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', 'GRANTED',
    'is_duplicate_sync', false,
    'meal_type', p_meal_type,
    'athlete_name', r_athlete.sslc_name,
    'bid_number', r_athlete.bid_number,
    'college_name', r_athlete.college_name,
    'college_code', r_athlete.college_code,
    'message', 'Meal verified successfully.'
  );
END;
$$ LANGUAGE plpgsql;

-- 4. RPC: get_meal_stats
CREATE OR REPLACE FUNCTION get_meal_stats(p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB AS $$
DECLARE
  v_breakfast INT := 0;
  v_lunch INT := 0;
  v_snacks INT := 0;
  v_dinner INT := 0;
BEGIN
  SELECT COUNT(*) INTO v_breakfast FROM meal_logs WHERE meal_date = p_date AND meal_type = 'BREAKFAST';
  SELECT COUNT(*) INTO v_lunch FROM meal_logs WHERE meal_date = p_date AND meal_type = 'LUNCH';
  SELECT COUNT(*) INTO v_snacks FROM meal_logs WHERE meal_date = p_date AND meal_type = 'SNACKS';
  SELECT COUNT(*) INTO v_dinner FROM meal_logs WHERE meal_date = p_date AND meal_type = 'DINNER';

  RETURN jsonb_build_object(
    'date', p_date,
    'breakfast_served', v_breakfast,
    'lunch_served', v_lunch,
    'snacks_served', v_snacks,
    'dinner_served', v_dinner,
    'total_meals_today', (v_breakfast + v_lunch + v_snacks + v_dinner)
  );
END;
$$ LANGUAGE plpgsql;

-- 5. Seed default food volunteer staff account (PIN: 1234)
INSERT INTO staff (display_name, role, pin_hash)
VALUES (
  'Mess Counter Volunteer 1',
  'food_volunteer',
  '$2b$10$wE9m2i9hS74/2w04xK9zFefY8GsmK/0eFszh.k0k3vQzKz1L4zZqG' -- bcrypt hash for 1234
)
ON CONFLICT DO NOTHING;

-- 6. Seed default meet settings and Admin account (vtuadmin2026)
INSERT INTO meet_settings (
  meet_name,
  venue,
  registration_open
)
VALUES (
  'VTU Inter-Collegiate Athletics Meet 2026',
  'VTU Campus Stadium',
  TRUE
)
ON CONFLICT DO NOTHING;

INSERT INTO staff (username, password_hash, display_name, role, is_active)
VALUES (
  'admin',
  '$2b$10$wE9m2i9hS74/2w04xK9zFefY8GsmK/0eFszh.k0k3vQzKz1L4zZqG', -- vtuadmin2026
  'Meet Technical Director',
  'meet_admin',
  TRUE
)
ON CONFLICT (username) DO NOTHING;

-- 7. Supabase Storage Buckets Setup
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('athlete-photos', 'athlete-photos', true),
  ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access athlete-photos" ON storage.objects;
CREATE POLICY "Public Access athlete-photos" ON storage.objects FOR SELECT USING (bucket_id = 'athlete-photos');
DROP POLICY IF EXISTS "Public Upload athlete-photos" ON storage.objects;
CREATE POLICY "Public Upload athlete-photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'athlete-photos');
DROP POLICY IF EXISTS "Public Update athlete-photos" ON storage.objects;
CREATE POLICY "Public Update athlete-photos" ON storage.objects FOR UPDATE USING (bucket_id = 'athlete-photos');

DROP POLICY IF EXISTS "Public Access payment-proofs" ON storage.objects;
CREATE POLICY "Public Access payment-proofs" ON storage.objects FOR SELECT USING (bucket_id = 'payment-proofs');
DROP POLICY IF EXISTS "Public Upload payment-proofs" ON storage.objects;
CREATE POLICY "Public Upload payment-proofs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payment-proofs');
DROP POLICY IF EXISTS "Public Update payment-proofs" ON storage.objects;
CREATE POLICY "Public Update payment-proofs" ON storage.objects FOR UPDATE USING (bucket_id = 'payment-proofs');

