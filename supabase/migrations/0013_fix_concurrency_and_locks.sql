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
