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
