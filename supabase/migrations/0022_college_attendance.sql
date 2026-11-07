-- =============================================================================
-- 0022: Registration Desk + college attendance (unlocks the Attendance Certificate)
--
-- 1. New staff role 'registration_desk' (username + password login, created by the
--    Meet Admin on /admin/staff). It signs in at /login/admin and lands on
--    /registration-desk.
-- 2. The Registration Desk marks a college as "attended" once its contingent has
--    reported at the venue, entering how many men and women actually came.
--    Until colleges.attendance_marked_at is set, the college's Attendance Certificate
--    stays locked in the contingent portal (/squad/certificate).
--
-- Safe to re-run.
-- =============================================================================

BEGIN;

-- 1) Allow the registration_desk staff role (keeps every role allowed so far)
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_role_check;
ALTER TABLE public.staff ADD CONSTRAINT staff_role_check CHECK (
  role IN (
    'meet_admin',
    'finance_desk',
    'accreditation_volunteer',
    'warden',
    'call_room_official',
    'referee',
    'food_volunteer',
    'registration_desk'
  )
);

-- 2) Attendance columns on colleges
ALTER TABLE public.colleges
  ADD COLUMN IF NOT EXISTS attendance_marked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attendance_marked_by TEXT,
  ADD COLUMN IF NOT EXISTS attendance_men_count INT,
  ADD COLUMN IF NOT EXISTS attendance_women_count INT;

ALTER TABLE public.colleges DROP CONSTRAINT IF EXISTS colleges_attendance_counts_check;
ALTER TABLE public.colleges ADD CONSTRAINT colleges_attendance_counts_check CHECK (
  (attendance_men_count IS NULL OR attendance_men_count >= 0)
  AND (attendance_women_count IS NULL OR attendance_women_count >= 0)
);

COMMIT;

NOTIFY pgrst, 'reload schema';
