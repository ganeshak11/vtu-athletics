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
