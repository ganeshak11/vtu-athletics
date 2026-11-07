-- =============================================================================
-- 0020: Admin audit log table
--
-- The web app writes audit entries (registration open/close, bib generation, payment
-- approvals/rejections with claimed vs bank-credited amounts, roster lock/unlock, late-entry
-- windows) to admin_audit_logs, and /admin/audit reads from it — but no migration ever
-- created the table, so every entry was silently dropped. Service-role access only.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  performed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs (action);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
