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
