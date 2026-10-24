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
