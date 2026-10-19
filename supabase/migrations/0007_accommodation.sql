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
