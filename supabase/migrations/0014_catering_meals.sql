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
