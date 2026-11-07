-- =============================================================================
-- 0018: Bank-confirmed payment amounts
--
-- payments.amount_submitted is whatever the college TYPED. Until now it was also what counted
-- toward fees once Finance clicked Verify, so "paid ₹200, typed ₹3000" became ₹3000 of credit.
--
-- New column amount_received = the amount Finance actually found credited in the bank
-- statement for that UTR, entered at verification. Only amount_received counts toward fees.
--
-- Backfill: payments that were ALREADY verified keep their old effective amount
-- (amount_received := amount_submitted) so existing squads do not suddenly owe money.
-- Review those rows against the bank statement if in doubt.
-- =============================================================================

BEGIN;

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS amount_received INT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_amount_received_check'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_amount_received_check CHECK (amount_received IS NULL OR amount_received >= 0);
  END IF;
END $$;

UPDATE public.payments
SET amount_received = amount_submitted
WHERE status = 'VERIFIED' AND amount_received IS NULL;

-- Trigger: squad status now follows bank-confirmed amounts against the payment's expected fee.
-- (The web app recomputes against the CURRENT fee right after, so this is a safety net for
-- any other writer, e.g. the Express backend.) A VERIFIED payment with no amount_received
-- counts as ₹0.
CREATE OR REPLACE FUNCTION sync_squad_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_verified_total INT;
  v_pending_count INT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE squads
    SET roster_locked = TRUE,
        payment_status = 'SUBMITTED',
        updated_at = timezone('utc'::text, now())
    WHERE id = NEW.squad_id;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT COALESCE(SUM(COALESCE(amount_received, 0)), 0) INTO v_verified_total
    FROM payments
    WHERE squad_id = NEW.squad_id AND status = 'VERIFIED';

    SELECT count(*) INTO v_pending_count
    FROM payments
    WHERE squad_id = NEW.squad_id AND status = 'SUBMITTED';

    IF v_verified_total > 0 AND v_verified_total >= NEW.amount_expected THEN
      UPDATE squads
      SET payment_status = 'VERIFIED', updated_at = timezone('utc'::text, now())
      WHERE id = NEW.squad_id;
    ELSIF v_pending_count > 0 OR v_verified_total > 0 THEN
      -- Awaiting another receipt, or verified but under-paid: balance due
      UPDATE squads
      SET payment_status = 'SUBMITTED', updated_at = timezone('utc'::text, now())
      WHERE id = NEW.squad_id;
    ELSE
      UPDATE squads
      SET payment_status = 'REJECTED', updated_at = timezone('utc'::text, now())
      WHERE id = NEW.squad_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-run the sync when the bank-confirmed amount is corrected, not only on status changes
DROP TRIGGER IF EXISTS trg_sync_squad_payment_status ON payments;
CREATE TRIGGER trg_sync_squad_payment_status
  AFTER INSERT OR UPDATE OF status, amount_submitted, amount_received ON payments
  FOR EACH ROW
  EXECUTE FUNCTION sync_squad_payment_status();

COMMIT;

NOTIFY pgrst, 'reload schema';
