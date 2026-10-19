-- ==============================================================================
-- Migration: 0009_call_room_marshaling.sql
-- Description: Call Room Operations, Kit/Spike Inspection & Marshaling Engine
--              1. call_room_inspections table for athlete check-in & gear check
--              2. record_call_room_inspection RPC
--              3. advance_heat_to_track RPC (marks uninspected athletes as DNS)
--              4. Seed call room staff official
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CALL ROOM INSPECTIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS call_room_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  heat_athlete_id UUID NOT NULL REFERENCES heat_athletes(id) ON DELETE CASCADE,
  inspected_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  reported_status TEXT NOT NULL DEFAULT 'REPORTED' CHECK (
    reported_status IN ('REPORTED', 'SCRATCH', 'DNS', 'DISQUALIFIED')
  ),
  bib_affixed BOOLEAN NOT NULL DEFAULT TRUE,
  spike_length_mm NUMERIC(3,1) NOT NULL DEFAULT 9.0,
  uniform_approved BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT DEFAULT '',
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_call_room_inspection UNIQUE (heat_athlete_id)
);

CREATE INDEX IF NOT EXISTS idx_call_room_heat_athlete ON call_room_inspections (heat_athlete_id);

-- ------------------------------------------------------------------------------
-- 2. RPC: record_call_room_inspection
-- Records marshal gear check and updates heat_athletes reporting status
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_call_room_inspection(
  p_heat_athlete_id UUID,
  p_official_id UUID,
  p_reported_status TEXT DEFAULT 'REPORTED',
  p_bib_affixed BOOLEAN DEFAULT TRUE,
  p_spike_length_mm NUMERIC DEFAULT 9.0,
  p_uniform_approved BOOLEAN DEFAULT TRUE,
  p_notes TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
  r_ha RECORD;
  r_event RECORD;
  v_max_spike NUMERIC := 9.0;
  v_inspection_id UUID;
BEGIN
  -- 1. Fetch heat athlete and event details
  SELECT ha.id, ha.heat_id, ha.lane_number, ha.profile_id, ha.relay_team_id,
         h.event_id, e.name AS event_name, e.category AS event_category
  INTO r_ha
  FROM heat_athletes ha
  JOIN heats h ON ha.heat_id = h.id
  JOIN events e ON h.event_id = e.id
  WHERE ha.id = p_heat_athlete_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Heat athlete record not found.';
  END IF;

  -- 2. Validate spike length based on World Athletics rules
  -- High Jump and Javelin allow up to 12mm; track and other jumps max 9mm
  IF r_ha.event_name ILIKE '%High Jump%' OR r_ha.event_name ILIKE '%Javelin%' THEN
    v_max_spike := 12.0;
  ELSE
    v_max_spike := 9.0;
  END IF;

  IF p_spike_length_mm > v_max_spike THEN
    RAISE EXCEPTION 'Spike length %mm exceeds maximum allowable limit of %mm for %.',
      p_spike_length_mm, v_max_spike, r_ha.event_name;
  END IF;

  -- 3. Upsert call room inspection record
  INSERT INTO call_room_inspections (
    heat_athlete_id,
    inspected_by,
    reported_status,
    bib_affixed,
    spike_length_mm,
    uniform_approved,
    notes,
    inspected_at
  )
  VALUES (
    p_heat_athlete_id,
    p_official_id,
    p_reported_status,
    p_bib_affixed,
    p_spike_length_mm,
    p_uniform_approved,
    p_notes,
    timezone('utc'::text, now())
  )
  ON CONFLICT (heat_athlete_id) DO UPDATE SET
    inspected_by = EXCLUDED.inspected_by,
    reported_status = EXCLUDED.reported_status,
    bib_affixed = EXCLUDED.bib_affixed,
    spike_length_mm = EXCLUDED.spike_length_mm,
    uniform_approved = EXCLUDED.uniform_approved,
    notes = EXCLUDED.notes,
    inspected_at = timezone('utc'::text, now())
  RETURNING id INTO v_inspection_id;

  -- 4. Update heat_athletes attendance
  UPDATE heat_athletes
  SET
    call_room_reported = (p_reported_status = 'REPORTED'),
    call_room_reported_at = CASE WHEN p_reported_status = 'REPORTED' THEN timezone('utc'::text, now()) ELSE NULL END
  WHERE id = p_heat_athlete_id;

  RETURN jsonb_build_object(
    'success', true,
    'inspection_id', v_inspection_id,
    'heat_athlete_id', p_heat_athlete_id,
    'reported_status', p_reported_status,
    'spike_length_mm', p_spike_length_mm,
    'bib_affixed', p_bib_affixed,
    'uniform_approved', p_uniform_approved
  );
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 3. RPC: advance_heat_to_track
-- Advances heat from Call Room to the track.
-- Unreported athletes are automatically marked DNS (Did Not Start).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION advance_heat_to_track(
  p_heat_id UUID,
  p_official_id UUID
)
RETURNS JSONB AS $$
DECLARE
  r_heat RECORD;
  v_dns_count INTEGER := 0;
  v_reported_count INTEGER := 0;
  r_unreported RECORD;
BEGIN
  -- 1. Fetch Heat Info
  SELECT h.id, h.event_id, h.stage, h.heat_number, h.status, e.name AS event_name
  INTO r_heat
  FROM heats h
  JOIN events e ON h.event_id = e.id
  WHERE h.id = p_heat_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Heat not found.';
  END IF;

  -- 2. Count reported athletes
  SELECT COUNT(*) INTO v_reported_count
  FROM heat_athletes
  WHERE heat_id = p_heat_id AND call_room_reported = TRUE;

  -- 3. Automatically record DNS for any athletes who did not report
  FOR r_unreported IN
    SELECT ha.id
    FROM heat_athletes ha
    LEFT JOIN call_room_inspections cri ON ha.id = cri.heat_athlete_id
    WHERE ha.heat_id = p_heat_id
      AND (ha.call_room_reported = FALSE OR cri.reported_status IS NULL)
  LOOP
    INSERT INTO call_room_inspections (
      heat_athlete_id,
      inspected_by,
      reported_status,
      notes,
      inspected_at
    )
    VALUES (
      r_unreported.id,
      p_official_id,
      'DNS',
      'Did not report to call room before race marshal closure.',
      timezone('utc'::text, now())
    )
    ON CONFLICT (heat_athlete_id) DO UPDATE SET
      reported_status = 'DNS',
      notes = 'Did not report to call room before race marshal closure.',
      inspected_at = timezone('utc'::text, now());

    v_dns_count := v_dns_count + 1;
  END LOOP;

  -- 4. Advance heat status to ON_TRACK
  UPDATE heats
  SET status = 'ON_TRACK'
  WHERE id = p_heat_id;

  RETURN jsonb_build_object(
    'success', true,
    'heat_id', p_heat_id,
    'status', 'ON_TRACK',
    'reported_athletes', v_reported_count,
    'dns_athletes', v_dns_count
  );
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 4. SEED CALL ROOM OFFICIAL STAFF USER
-- PIN 1234
-- ------------------------------------------------------------------------------
INSERT INTO staff (display_name, role, pin_hash, is_active)
VALUES (
  'Call Room Chief Marshal',
  'call_room_official',
  '$2a$10$08r0Bc6TequIS3WGBwlZ8et9CU9ALYO5G7j1Ir96.h3Um9fRQr5NO', -- PIN 1234
  TRUE
)
ON CONFLICT DO NOTHING;
