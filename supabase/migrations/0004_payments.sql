-- ==============================================================================
-- Migration: 0004_payments.sql
-- Description: Offline UPI Payment Submissions and Verification Desk
--              1. payments table (UTR, amount submitted/expected, screenshot URL)
--              2. Unique constraint on UTR number
--              3. Auto-lock squad roster on submission
--              4. Sync squad.payment_status with payment verification lifecycle
-- ==============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  amount_submitted INT NOT NULL,
  amount_expected INT NOT NULL,
  utr_number TEXT UNIQUE NOT NULL, -- Unique 12-digit UPI/Bank Transaction ID
  screenshot_url TEXT NOT NULL, -- Supabase Storage path or Data URL
  status TEXT NOT NULL DEFAULT 'SUBMITTED'
    CHECK (status IN ('SUBMITTED', 'VERIFIED', 'REJECTED')),
  rejection_reason TEXT,
  verified_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payments_squad_id ON payments (squad_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_utr ON payments (utr_number);

DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_timestamp();

-- ------------------------------------------------------------------------------
-- TRIGGER: sync_squad_payment_status
-- When a payment is submitted, verified, or rejected, automatically update
-- the parent squad's payment_status and enforce roster locking.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_squad_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_verified_total INT;
  v_pending_count INT;
  v_expected_fee INT;
BEGIN
  -- On INSERT of a new payment, lock the roster and set squad status to SUBMITTED
  IF TG_OP = 'INSERT' THEN
    UPDATE squads
    SET
      roster_locked = TRUE,
      payment_status = 'SUBMITTED',
      updated_at = timezone('utc'::text, now())
    WHERE id = NEW.squad_id;
  END IF;

  -- On UPDATE of payment status
  IF TG_OP = 'UPDATE' THEN
    -- Check total verified payments
    SELECT COALESCE(SUM(amount_submitted), 0) INTO v_verified_total
    FROM payments
    WHERE squad_id = NEW.squad_id AND status = 'VERIFIED';

    -- Check if any submissions are still pending verification
    SELECT count(*) INTO v_pending_count
    FROM payments
    WHERE squad_id = NEW.squad_id AND status = 'SUBMITTED';

    IF v_verified_total >= NEW.amount_expected THEN
      UPDATE squads
      SET payment_status = 'VERIFIED', updated_at = timezone('utc'::text, now())
      WHERE id = NEW.squad_id;
    ELSIF v_pending_count > 0 THEN
      UPDATE squads
      SET payment_status = 'SUBMITTED', updated_at = timezone('utc'::text, now())
      WHERE id = NEW.squad_id;
    ELSE
      -- All submitted payments were rejected
      UPDATE squads
      SET payment_status = 'REJECTED', updated_at = timezone('utc'::text, now())
      WHERE id = NEW.squad_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_squad_payment_status ON payments;
CREATE TRIGGER trg_sync_squad_payment_status
  AFTER INSERT OR UPDATE OF status, amount_submitted ON payments
  FOR EACH ROW
  EXECUTE FUNCTION sync_squad_payment_status();

-- ------------------------------------------------------------------------------
-- RPC: compute_squad_fee
-- Calculates the total fee breakdown for a squad based on meet settings:
-- Fee = (regular events count * regular_fee) + (relay teams * relay_fee) + (HM count * hm_fee)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION compute_squad_fee(p_squad_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_regular_count INT := 0;
  v_reserve_count INT := 0;
  v_hm_count INT := 0;
  v_relay_count INT := 0;
  v_regular_fee INT := 100;
  v_relay_fee INT := 100;
  v_hm_fee INT := 100;
  v_total_amount INT := 0;
BEGIN
  -- Read current meet fee settings
  SELECT
    fee_per_regular_event,
    fee_per_relay_team,
    fee_per_marathon
  INTO
    v_regular_fee,
    v_relay_fee,
    v_hm_fee
  FROM meet_settings
  LIMIT 1;

  -- Count athlete event registrations
  SELECT
    COUNT(*) FILTER (WHERE r.kind = 'regular'),
    COUNT(*) FILTER (WHERE r.kind = 'reserve'),
    COUNT(*) FILTER (WHERE r.kind = 'half_marathon')
  INTO
    v_regular_count,
    v_reserve_count,
    v_hm_count
  FROM registrations r
  JOIN profiles p ON r.profile_id = p.id
  WHERE p.squad_id = p_squad_id;

  -- Count relay teams fielded by this squad
  SELECT COUNT(*) INTO v_relay_count
  FROM relay_teams
  WHERE squad_id = p_squad_id;

  v_total_amount := (v_regular_count * v_regular_fee) +
                    (v_relay_count * v_relay_fee) +
                    (v_hm_count * v_hm_fee);

  RETURN jsonb_build_object(
    'regular_events_count', v_regular_count,
    'regular_fee_rate', v_regular_fee,
    'reserve_events_count', v_reserve_count,
    'hm_count', v_hm_count,
    'hm_fee_rate', v_hm_fee,
    'relay_teams_count', v_relay_count,
    'relay_fee_rate', v_relay_fee,
    'total_amount', v_total_amount
  );
END;
$$ LANGUAGE plpgsql;
