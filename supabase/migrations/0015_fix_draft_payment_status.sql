-- =============================================================================
-- 0015: Fix legacy 'DrAFT' spelling of squads.payment_status
--
-- An earlier bulk "DR" -> "Dr" replace turned 'DRAFT' into 'DrAFT' in migration 0001
-- (column default + CHECK constraint). This migration:
--   1. drops whatever CHECK constraint currently guards squads.payment_status,
--   2. rewrites existing 'DrAFT' rows to 'DRAFT',
--   3. restores the correct default and CHECK constraint.
--
-- The web app reads payment_status through normalizePaymentStatus(), which accepts both
-- spellings, and never writes the draft value itself, so this is safe to apply at any time
-- relative to a deploy. Runs in one transaction; re-running is a no-op.
--
-- Note: profiles.accreditation_status still uses 'WITHDrAWN'. That value is hard-coded in
-- several PL/pgSQL functions (withdraw/substitute, bid allocation, accreditation, heats,
-- catering) and is intentionally NOT changed here.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'squads'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%payment_status%'
  LOOP
    EXECUTE format('ALTER TABLE public.squads DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

UPDATE public.squads SET payment_status = 'DRAFT' WHERE payment_status = 'DrAFT';

ALTER TABLE public.squads ALTER COLUMN payment_status SET DEFAULT 'DRAFT';

ALTER TABLE public.squads
  ADD CONSTRAINT squads_payment_status_check
  CHECK (payment_status IN ('DRAFT', 'SUBMITTED', 'VERIFIED', 'REJECTED'));

COMMIT;

-- Verification (expect 0 rows):
--   SELECT id, squad_code, payment_status FROM squads WHERE payment_status = 'DrAFT';
