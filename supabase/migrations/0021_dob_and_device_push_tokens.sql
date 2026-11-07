-- =============================================================================
-- 0021: Athlete date of birth + device push tokens (AURA Athletes app)
--
-- 1. profiles.date_of_birth — the AURA Athletes app logs students in with
--    bib number + date of birth. Also checked against VTU Rule 11 (below 25 years
--    as on 1 July 2026) by the web registration form. Nullable so athletes registered
--    before this migration can be completed by their college PED via "Edit".
-- 2. device_push_tokens — Expo push tokens registered by the mobile apps, used to send
--    "call room open", delay and schedule-change notifications. One row per device token;
--    a token moves to whichever athlete last logged in on that device.
-- =============================================================================

BEGIN;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;

CREATE INDEX IF NOT EXISTS idx_profiles_bid_dob ON public.profiles (bid_number, date_of_birth);

CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expo_push_token TEXT NOT NULL UNIQUE,
  app TEXT NOT NULL CHECK (app IN ('athletes', 'officials')),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  platform TEXT CHECK (platform IN ('android', 'ios')),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_profile ON public.device_push_tokens (profile_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_staff ON public.device_push_tokens (staff_id);

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

COMMIT;

NOTIFY pgrst, 'reload schema';
