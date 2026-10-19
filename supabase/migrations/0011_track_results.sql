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
