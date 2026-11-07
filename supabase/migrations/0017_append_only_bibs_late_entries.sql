-- =============================================================================
-- 0017: Append-only bib numbering + late-entry window
--
-- Problems fixed:
--   * Re-running bib generation renumbered every athlete, invalidating printed ID cards.
--   * Colleges verified AFTER bib generation could only get numbers by renumbering everyone.
--   * Bibs were assigned to athletes of unpaid / unverified squads.
--   * There was no way to accept a late entry once registration closed.
--
-- New behaviour of close_registration_and_generate_bids() (same name, so existing callers
-- keep working):
--   1. If registration is still open, it closes it and locks every squad (first close).
--   2. It assigns numbers ONLY to athletes that have none yet, are not withdrawn, and belong to
--      a squad whose payment is VERIFIED and whose roster is LOCKED (no number while an
--      emergency-unlocked college is still editing).
--   3. Numbers continue after the highest number already issued per division
--      (Men 100–2000, Women 2001+); existing numbers are never changed. The first run therefore
--      still gives each college one contiguous block, sorted by college then athlete name.
--   4. Athletes created after registration closed are logged as 'late_entry' amendments.
--   5. It returns the squads whose athletes are still waiting for a number, and why.
--
-- Late entries: squads.late_entry_open is set by the admin emergency-unlock while registration
-- is closed. Only such a squad may add/edit/delete athletes and relays after the close.
-- =============================================================================

BEGIN;

ALTER TABLE public.squads ADD COLUMN IF NOT EXISTS late_entry_open BOOLEAN NOT NULL DEFAULT FALSE;

-- One active athlete per bib number. A withdrawn athlete keeps their number (the gap is
-- preserved) and a substitute inherits it, so withdrawn rows are excluded.
DO $$
BEGIN
  IF EXISTS (
    SELECT bid_number
    FROM public.profiles
    WHERE bid_number IS NOT NULL AND accreditation_status <> 'WITHDrAWN'
    GROUP BY bid_number
    HAVING COUNT(*) > 1
  ) THEN
    RAISE NOTICE 'Duplicate active bib numbers exist — unique index NOT created. Resolve duplicates and re-run this block.';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_active_bid_number
      ON public.profiles (bid_number)
      WHERE bid_number IS NOT NULL AND accreditation_status <> 'WITHDrAWN';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION close_registration_and_generate_bids()
RETURNS JSONB AS $$
DECLARE
  v_was_open BOOLEAN;
  v_closed_at TIMESTAMPTZ;
  v_closed_now BOOLEAN := FALSE;
  v_next_men INT;
  v_next_women INT;
  v_new_men INT := 0;
  v_new_women INT := 0;
  v_late INT := 0;
  v_bid INT;
  r RECORD;
  v_pending JSONB;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('close_registration_and_generate_bids'));

  SELECT registration_open, registration_closed_at
  INTO v_was_open, v_closed_at
  FROM meet_settings
  LIMIT 1;

  -- 1. First close: close registration and freeze every roster
  IF v_was_open IS DISTINCT FROM FALSE THEN
    UPDATE meet_settings
    SET registration_open = FALSE,
        registration_closed_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id IS NOT NULL;

    UPDATE squads
    SET roster_locked = TRUE, late_entry_open = FALSE, updated_at = timezone('utc'::text, now())
    WHERE id IS NOT NULL;

    v_closed_at := timezone('utc'::text, now());
    v_closed_now := TRUE;
  END IF;

  -- 2. Next free number per division (withdrawn numbers count, so gaps are never reused)
  SELECT GREATEST(100, COALESCE(MAX(p.bid_number), 99) + 1)
  INTO v_next_men
  FROM profiles p JOIN squads s ON s.id = p.squad_id
  WHERE s.gender = 'men' AND p.bid_number IS NOT NULL;

  SELECT GREATEST(2001, COALESCE(MAX(p.bid_number), 2000) + 1)
  INTO v_next_women
  FROM profiles p JOIN squads s ON s.id = p.squad_id
  WHERE s.gender = 'women' AND p.bid_number IS NOT NULL;

  -- 3. Append numbers for eligible athletes without one
  FOR r IN
    SELECT p.id, p.squad_id, p.created_at, s.gender
    FROM profiles p
    JOIN squads s ON s.id = p.squad_id
    JOIN colleges c ON c.id = s.college_id
    WHERE p.bid_number IS NULL
      AND p.accreditation_status <> 'WITHDrAWN'
      AND s.payment_status = 'VERIFIED'
      AND s.roster_locked = TRUE
    ORDER BY s.gender, c.name ASC, p.sslc_name ASC, p.usn ASC
  LOOP
    IF r.gender = 'men' THEN
      IF v_next_men > 2000 THEN
        RAISE EXCEPTION 'Men bib range 100–2000 is exhausted.';
      END IF;
      v_bid := v_next_men;
      v_next_men := v_next_men + 1;
      v_new_men := v_new_men + 1;
    ELSE
      v_bid := v_next_women;
      v_next_women := v_next_women + 1;
      v_new_women := v_new_women + 1;
    END IF;

    UPDATE profiles
    SET bid_number = v_bid, updated_at = timezone('utc'::text, now())
    WHERE id = r.id;

    -- 4. Audit late entries (registered after the close, via an emergency unlock)
    IF NOT v_closed_now AND v_closed_at IS NOT NULL AND r.created_at > v_closed_at THEN
      INSERT INTO roster_amendments (squad_id, amendment_type, new_profile_id, bid_number, reason)
      VALUES (r.squad_id, 'late_entry', r.id, v_bid, 'Late entry after registration close (admin emergency unlock)');
      v_late := v_late + 1;
    END IF;
  END LOOP;

  -- Keep each squad's bib range summary current (late entries may sit outside the first block)
  UPDATE squads s
  SET bid_block_start = sub.mn, bid_block_end = sub.mx, updated_at = timezone('utc'::text, now())
  FROM (
    SELECT squad_id, MIN(bid_number) AS mn, MAX(bid_number) AS mx
    FROM profiles
    WHERE bid_number IS NOT NULL
    GROUP BY squad_id
  ) sub
  WHERE s.id = sub.squad_id
    AND (s.bid_block_start IS DISTINCT FROM sub.mn OR s.bid_block_end IS DISTINCT FROM sub.mx);

  -- 5. Squads still waiting for numbers, and why
  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'college'), '[]'::jsonb)
  INTO v_pending
  FROM (
    SELECT jsonb_build_object(
      'squad_code', s.squad_code,
      'college', c.name,
      'gender', s.gender,
      'payment_status', s.payment_status,
      'roster_locked', s.roster_locked,
      'waiting', COUNT(p.id)
    ) AS x
    FROM squads s
    JOIN colleges c ON c.id = s.college_id
    JOIN profiles p ON p.squad_id = s.id
    WHERE p.bid_number IS NULL AND p.accreditation_status <> 'WITHDrAWN'
    GROUP BY s.id, s.squad_code, c.name, s.gender, s.payment_status, s.roster_locked
  ) q;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'closed_now', v_closed_now,
    'total_men_bids_assigned', v_new_men,
    'total_women_bids_assigned', v_new_women,
    'late_entries_numbered', v_late,
    'men_bid_range_end', v_next_men - 1,
    'women_bid_range_end', v_next_women - 1,
    'pending_squads', v_pending
  );
END;
$$ LANGUAGE plpgsql;

COMMIT;

NOTIFY pgrst, 'reload schema';
