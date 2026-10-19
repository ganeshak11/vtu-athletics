-- ==============================================================================
-- Migration: 0006_accreditation.sql
-- Description: Offline-Resilient Entry Gate Accreditation Engine
--              1. accreditation_scans audit log with client-side UUID idempotency
--              2. process_accreditation_scan RPC function with duplicate protection
-- ==============================================================================

CREATE TABLE IF NOT EXISTS accreditation_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_scan_uuid UUID UNIQUE NOT NULL, -- Client-generated idempotency key
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scanned_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  device_timestamp TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_accred_scans_profile ON accreditation_scans (profile_id);
CREATE INDEX IF NOT EXISTS idx_accred_scans_client_uuid ON accreditation_scans (client_scan_uuid);

-- ------------------------------------------------------------------------------
-- RPC: process_accreditation_scan
-- Idempotent entry gate accreditation procedure.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_accreditation_scan(
  p_client_uuid UUID,
  p_profile_id UUID,
  p_volunteer_id UUID,
  p_device_timestamp TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  r_profile RECORD;
  v_already_accredited BOOLEAN := FALSE;
  v_scan_exists BOOLEAN := FALSE;
  v_events JSONB;
BEGIN
  -- 1. Check idempotency: If this client UUID was already processed, return success immediately
  SELECT TRUE INTO v_scan_exists
  FROM accreditation_scans
  WHERE client_scan_uuid = p_client_uuid;

  IF v_scan_exists THEN
    SELECT p.id, p.sslc_name, p.usn, p.bid_number, p.accreditation_status, c.name AS college_name, s.squad_code
    INTO r_profile
    FROM profiles p
    JOIN squads s ON p.squad_id = s.id
    JOIN colleges c ON s.college_id = c.id
    WHERE p.id = p_profile_id;

    RETURN jsonb_build_object(
      'success', true,
      'is_duplicate_sync', true,
      'already_accredited', true,
      'athlete_id', r_profile.id,
      'sslc_name', r_profile.sslc_name,
      'usn', r_profile.usn,
      'bid_number', r_profile.bid_number,
      'college_name', r_profile.college_name,
      'squad_code', r_profile.squad_code,
      'status', r_profile.accreditation_status
    );
  END IF;

  -- 2. Fetch athlete profile
  SELECT p.id, p.sslc_name, p.usn, p.bid_number, p.accreditation_status, c.name AS college_name, s.squad_code
  INTO r_profile
  FROM profiles p
  JOIN squads s ON p.squad_id = s.id
  JOIN colleges c ON s.college_id = c.id
  WHERE p.id = p_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Athlete profile not found.';
  END IF;

  IF r_profile.accreditation_status = 'WITHDRAWN' THEN
    RAISE EXCEPTION 'Cannot accredit withdrawn athlete.';
  END IF;

  IF r_profile.accreditation_status = 'ACCREDITED' THEN
    v_already_accredited := TRUE;
  END IF;

  -- 3. Update athlete status
  UPDATE profiles
  SET
    accreditation_status = 'ACCREDITED',
    accredited_at = COALESCE(accredited_at, timezone('utc'::text, now())),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_profile_id;

  -- 4. Record scan audit log
  INSERT INTO accreditation_scans (
    client_scan_uuid,
    profile_id,
    scanned_by,
    device_timestamp
  )
  VALUES (
    p_client_uuid,
    p_profile_id,
    p_volunteer_id,
    COALESCE(p_device_timestamp, timezone('utc'::text, now()))
  );

  -- 5. Fetch athlete registered events for on-screen confirmation
  SELECT jsonb_agg(jsonb_build_object('name', e.name, 'code', e.code, 'kind', r.kind))
  INTO v_events
  FROM registrations r
  JOIN events e ON r.event_id = e.id
  WHERE r.profile_id = p_profile_id;

  RETURN jsonb_build_object(
    'success', true,
    'is_duplicate_sync', false,
    'already_accredited', v_already_accredited,
    'athlete_id', r_profile.id,
    'sslc_name', r_profile.sslc_name,
    'usn', r_profile.usn,
    'bid_number', r_profile.bid_number,
    'college_name', r_profile.college_name,
    'squad_code', r_profile.squad_code,
    'events', COALESCE(v_events, '[]'::jsonb),
    'status', 'ACCREDITED'
  );
END;
$$ LANGUAGE plpgsql;
