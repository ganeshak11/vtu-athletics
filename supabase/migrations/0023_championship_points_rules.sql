-- =============================================================================
-- 0023: Championship points rules (replaces the 7-5-4-3-2-1 engine of 0012/0013)
--
-- Official rules for the 28th VTU Athletic Meet 2026:
--   * Individual events            : 1st = 5, 2nd = 3, 3rd = 1
--   * Relays (4x100m, 4x400m)      : 1st = 10, 2nd = 6, 3rd = 2
--       -> counted ONLY for the Overall College Championship. They are not part of the
--          Best Men's / Best Women's College Team tables or the Best Athlete tables.
--   * 4x400m Mixed Relay (4X400M-MIX): no championship points at all (counts for neither).
--   * Only places 1–3 are recorded (rows are kept for every event, including the mixed
--     relay with 0 points, so medal lists and merit certificates still work).
--
-- Standings returned by get_championship_standings():
--   combined : Overall College Championship  = individual + relay points (no mixed relay)
--   mens     : Best Men's College Team       = men's individual points only
--   womens   : Best Women's College Team     = women's individual points only
--   best_male_athletes / best_female_athletes : individual points per athlete (no relays)
--
-- Any points already allocated are recalculated with the new rules at the end.
-- Safe to re-run.
-- =============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. allocate_event_points (same placement logic as 0013, new points table, top 3 only)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION allocate_event_points(
  p_event_id UUID,
  p_heat_id UUID
)
RETURNS JSONB AS $$
DECLARE
  r_event RECORD;
  r_placer RECORD;
  v_pts_table NUMERIC[];
  v_is_relay BOOLEAN;
  v_is_mixed BOOLEAN;
  v_assigned_count INTEGER := 0;
  v_place INTEGER;
BEGIN
  -- Transaction-level advisory lock per event to avoid concurrent allocation races
  PERFORM pg_advisory_xact_lock(hashtext('allocate_event_points_' || p_event_id::text));

  SELECT id, name, code, category, is_multi_attempt
  INTO r_event
  FROM events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found.';
  END IF;

  v_is_mixed := upper(r_event.code) = '4X400M-MIX';
  v_is_relay := r_event.category = 'relay';

  IF v_is_mixed THEN
    v_pts_table := ARRAY[0.0, 0.0, 0.0];          -- Mixed relay: counts for neither championship
  ELSIF v_is_relay THEN
    v_pts_table := ARRAY[10.0, 6.0, 2.0];         -- 4x100m / 4x400m: overall championship only
  ELSE
    v_pts_table := ARRAY[5.0, 3.0, 1.0];          -- Individual events
  END IF;

  DELETE FROM team_points WHERE event_id = p_event_id;

  IF r_event.category LIKE 'field%' THEN
    FOR r_placer IN
      SELECT
        (item->>'rank')::INTEGER AS place,
        (item->>'profile_id')::UUID AS profile_id
      FROM jsonb_array_elements((compute_field_standings(p_heat_id)->'standings')) AS item
      WHERE (item->>'best_mark') IS NOT NULL
        AND (item->>'rank')::INTEGER BETWEEN 1 AND 3
      ORDER BY (item->>'rank')::INTEGER ASC
      LIMIT 3
    LOOP
      INSERT INTO team_points (event_id, heat_id, college_id, squad_id, profile_id, place, points)
      SELECT p_event_id, p_heat_id, s.college_id, s.id, r_placer.profile_id, r_placer.place, v_pts_table[r_placer.place]
      FROM profiles p
      JOIN squads s ON p.squad_id = s.id
      WHERE p.id = r_placer.profile_id
      ON CONFLICT (event_id, place) DO UPDATE SET points = EXCLUDED.points;

      v_assigned_count := v_assigned_count + 1;
    END LOOP;

  ELSE
    FOR r_placer IN
      SELECT
        ha.profile_id,
        ha.relay_team_id,
        COALESCE(p.squad_id, rt.squad_id) AS squad_id,
        COALESCE(sp.college_id, srt.college_id) AS college_id,
        ROW_NUMBER() OVER (ORDER BY tr.time_seconds ASC) AS place
      FROM track_results tr
      JOIN heat_athletes ha ON tr.heat_athlete_id = ha.id
      LEFT JOIN profiles p ON ha.profile_id = p.id
      LEFT JOIN squads sp ON p.squad_id = sp.id
      LEFT JOIN relay_teams rt ON ha.relay_team_id = rt.id
      LEFT JOIN squads srt ON rt.squad_id = srt.id
      WHERE ha.heat_id = p_heat_id
        AND tr.status = 'FINISHED'
      ORDER BY tr.time_seconds ASC
      LIMIT 3
    LOOP
      v_place := r_placer.place::INTEGER;
      INSERT INTO team_points (event_id, heat_id, college_id, squad_id, profile_id, relay_team_id, place, points)
      VALUES (p_event_id, p_heat_id, r_placer.college_id, r_placer.squad_id, r_placer.profile_id,
              r_placer.relay_team_id, v_place, v_pts_table[v_place])
      ON CONFLICT (event_id, place) DO UPDATE SET points = EXCLUDED.points;

      v_assigned_count := v_assigned_count + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'event_id', p_event_id,
    'heat_id', p_heat_id,
    'placers_awarded', v_assigned_count,
    'is_relay', v_is_relay,
    'is_mixed_relay', v_is_mixed,
    'counts_for', CASE
      WHEN v_is_mixed THEN 'none'
      WHEN v_is_relay THEN 'overall_only'
      ELSE 'individual_and_team'
    END
  );
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 2. Every awarded row, tagged with what it counts for
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW championship_scored_points AS
SELECT
  tp.id,
  tp.event_id,
  tp.heat_id,
  tp.college_id,
  tp.squad_id,
  tp.profile_id,
  tp.relay_team_id,
  tp.place,
  tp.points,
  s.gender AS squad_gender,
  (e.category = 'relay') AS is_relay,
  (upper(e.code) = '4X400M-MIX') AS is_mixed
FROM team_points tp
JOIN events e ON e.id = tp.event_id
JOIN squads s ON s.id = tp.squad_id;

-- ------------------------------------------------------------------------------
-- 3. get_championship_standings with the new inclusion rules
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_championship_standings()
RETURNS JSONB AS $$
DECLARE
  v_combined JSONB;
  v_mens JSONB;
  v_womens JSONB;
  v_best_men JSONB;
  v_best_women JSONB;
BEGIN

  -- Overall College Championship: individual + 4x100/4x400 relays (mixed relay excluded)
  SELECT jsonb_agg(row_to_json(r)::jsonb ORDER BY r.rank)
  INTO v_combined
  FROM (
    SELECT
      ROW_NUMBER() OVER (ORDER BY total_points DESC, golds DESC, silvers DESC, bronzes DESC, college_name) AS rank,
      t.*
    FROM (
      SELECT
        c.id AS college_id,
        c.name AS college_name,
        c.code AS college_code,
        c.district,
        COALESCE(SUM(sc.points) FILTER (WHERE NOT sc.is_mixed), 0) AS total_points,
        COALESCE(SUM(sc.points) FILTER (WHERE NOT sc.is_relay), 0) AS individual_points,
        COALESCE(SUM(sc.points) FILTER (WHERE sc.is_relay AND NOT sc.is_mixed), 0) AS relay_points,
        COUNT(sc.id) FILTER (WHERE sc.place = 1 AND NOT sc.is_mixed) AS golds,
        COUNT(sc.id) FILTER (WHERE sc.place = 2 AND NOT sc.is_mixed) AS silvers,
        COUNT(sc.id) FILTER (WHERE sc.place = 3 AND NOT sc.is_mixed) AS bronzes
      FROM colleges c
      LEFT JOIN championship_scored_points sc ON sc.college_id = c.id
      GROUP BY c.id, c.name, c.code, c.district
    ) t
  ) r;

  -- Best Men's / Women's College Team: individual events of that division only (no relays)
  SELECT jsonb_agg(row_to_json(r)::jsonb ORDER BY r.rank)
  INTO v_mens
  FROM (
    SELECT ROW_NUMBER() OVER (ORDER BY total_points DESC, golds DESC, silvers DESC, bronzes DESC, college_name) AS rank, t.*
    FROM (
      SELECT
        c.id AS college_id, c.name AS college_name, c.code AS college_code,
        COALESCE(SUM(sc.points), 0) AS total_points,
        COUNT(sc.id) FILTER (WHERE sc.place = 1) AS golds,
        COUNT(sc.id) FILTER (WHERE sc.place = 2) AS silvers,
        COUNT(sc.id) FILTER (WHERE sc.place = 3) AS bronzes
      FROM colleges c
      JOIN squads s ON s.college_id = c.id AND s.gender = 'men'
      LEFT JOIN championship_scored_points sc ON sc.squad_id = s.id AND NOT sc.is_relay
      GROUP BY c.id, c.name, c.code
    ) t
  ) r;

  SELECT jsonb_agg(row_to_json(r)::jsonb ORDER BY r.rank)
  INTO v_womens
  FROM (
    SELECT ROW_NUMBER() OVER (ORDER BY total_points DESC, golds DESC, silvers DESC, bronzes DESC, college_name) AS rank, t.*
    FROM (
      SELECT
        c.id AS college_id, c.name AS college_name, c.code AS college_code,
        COALESCE(SUM(sc.points), 0) AS total_points,
        COUNT(sc.id) FILTER (WHERE sc.place = 1) AS golds,
        COUNT(sc.id) FILTER (WHERE sc.place = 2) AS silvers,
        COUNT(sc.id) FILTER (WHERE sc.place = 3) AS bronzes
      FROM colleges c
      JOIN squads s ON s.college_id = c.id AND s.gender = 'women'
      LEFT JOIN championship_scored_points sc ON sc.squad_id = s.id AND NOT sc.is_relay
      GROUP BY c.id, c.name, c.code
    ) t
  ) r;

  -- Best Male / Female Athlete: individual points only (relay points never count here)
  SELECT jsonb_agg(row_to_json(r)::jsonb ORDER BY r.rank)
  INTO v_best_men
  FROM (
    SELECT ROW_NUMBER() OVER (ORDER BY total_points DESC, golds DESC, silvers DESC, bronzes DESC, athlete_name) AS rank, t.*
    FROM (
      SELECT
        p.id AS profile_id, p.sslc_name AS athlete_name, p.usn, p.bid_number,
        c.name AS college_name, c.code AS college_code,
        SUM(sc.points) AS total_points,
        COUNT(*) FILTER (WHERE sc.place = 1) AS golds,
        COUNT(*) FILTER (WHERE sc.place = 2) AS silvers,
        COUNT(*) FILTER (WHERE sc.place = 3) AS bronzes
      FROM championship_scored_points sc
      JOIN profiles p ON p.id = sc.profile_id
      JOIN colleges c ON c.id = sc.college_id
      WHERE NOT sc.is_relay AND sc.squad_gender = 'men'
      GROUP BY p.id, p.sslc_name, p.usn, p.bid_number, c.name, c.code
    ) t
  ) r;

  SELECT jsonb_agg(row_to_json(r)::jsonb ORDER BY r.rank)
  INTO v_best_women
  FROM (
    SELECT ROW_NUMBER() OVER (ORDER BY total_points DESC, golds DESC, silvers DESC, bronzes DESC, athlete_name) AS rank, t.*
    FROM (
      SELECT
        p.id AS profile_id, p.sslc_name AS athlete_name, p.usn, p.bid_number,
        c.name AS college_name, c.code AS college_code,
        SUM(sc.points) AS total_points,
        COUNT(*) FILTER (WHERE sc.place = 1) AS golds,
        COUNT(*) FILTER (WHERE sc.place = 2) AS silvers,
        COUNT(*) FILTER (WHERE sc.place = 3) AS bronzes
      FROM championship_scored_points sc
      JOIN profiles p ON p.id = sc.profile_id
      JOIN colleges c ON c.id = sc.college_id
      WHERE NOT sc.is_relay AND sc.squad_gender = 'women'
      GROUP BY p.id, p.sslc_name, p.usn, p.bid_number, c.name, c.code
    ) t
  ) r;

  RETURN jsonb_build_object(
    'success', true,
    'combined', COALESCE(v_combined, '[]'::jsonb),
    'mens', COALESCE(v_mens, '[]'::jsonb),
    'womens', COALESCE(v_womens, '[]'::jsonb),
    'best_male_athletes', COALESCE(v_best_men, '[]'::jsonb),
    'best_female_athletes', COALESCE(v_best_women, '[]'::jsonb),
    'rules', jsonb_build_object(
      'individual', jsonb_build_array(5, 3, 1),
      'relay', jsonb_build_array(10, 6, 2),
      'relay_counts_for', 'overall_only',
      'mixed_relay_counts_for', 'none'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 4. Recalculate any points already allocated under the old 7-5-4-3-2-1 rules
-- ------------------------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT event_id, heat_id FROM team_points LOOP
    PERFORM allocate_event_points(r.event_id, r.heat_id);
  END LOOP;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
