-- =============================================================================
-- 0024: Athlete phone number + semesters 1–10
--
-- 1. profiles.phone — student's 10-digit mobile number (collected on the athlete
--    registration form). Nullable so athletes registered earlier stay valid.
-- 2. profiles.semester may now be 1–10 (was 1–8), e.g. 5-year B.Arch / integrated courses.
--
-- Safe to re-run.
-- =============================================================================

BEGIN;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Replace whatever CHECK constraint currently limits semester (name may differ by environment)
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public'
      AND rel.relname = 'profiles'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%semester%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_semester_check CHECK (semester BETWEEN 1 AND 10);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_phone_check CHECK (phone IS NULL OR phone ~ '^[6-9][0-9]{9}$');

COMMIT;

NOTIFY pgrst, 'reload schema';
