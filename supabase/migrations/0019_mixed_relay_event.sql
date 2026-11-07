-- =============================================================================
-- 0019: Add the missing 4x400m Mixed Relay event (Code 22)
--
-- The registration form offers "4x400m Mixed Relay" and bills ₹400 per college team, and the
-- relay / fee logic looks it up by code '4X400M-MIX' (gender 'mixed'). Migration 0002 never
-- seeded it (only full_schema_setup.sql did), so on a database built from the migrations the
-- nomination was silently dropped. Idempotent.
-- =============================================================================

INSERT INTO events (name, code, gender, category, measurement_unit, start_type, max_lanes, has_rounds, is_multi_attempt, is_progressive_height, max_attempts_per_height)
VALUES ('4x400m Mixed Relay', '4X400M-MIX', 'mixed', 'relay', 'seconds', 'lanes', 8, TRUE, FALSE, FALSE, NULL)
ON CONFLICT (code) DO NOTHING;
