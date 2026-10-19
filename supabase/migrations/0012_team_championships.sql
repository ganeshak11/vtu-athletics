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
