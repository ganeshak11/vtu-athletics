-- =============================================================================
-- 0016: Login attempt log for brute-force throttling (web portal)
--
-- Squad passphrases are adjective-noun-NN (~52k combinations) and staff PINs are 4–6 digits,
-- so unlimited guessing is practical. The web app records each FAILED attempt here and
-- refuses further attempts for a while once a limit is hit (see src/lib/login-throttle.ts).
-- Serverless instances share no memory, so the counter has to live in the database.
--
-- Accessed only with the service-role key; RLS is enabled with no policies so the anon key
-- can neither read nor write it.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.login_attempts (
  id BIGSERIAL PRIMARY KEY,
  scope TEXT NOT NULL,            -- 'squad' | 'admin' | 'pin'
  key TEXT NOT NULL,              -- e.g. 'BMSCE:men', admin username, or staff role
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_scope_key_time ON public.login_attempts (scope, key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON public.login_attempts (ip, created_at DESC);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
