-- ==============================================================================
-- Migration: 0002_events_catalogue.sql
-- Description: Standard Category-Aware Athletic Events Catalogue
--              Includes start_type, lane configs, attempt rules, and seeds all
--              track, field, relay, and road events for Men and Women.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL, -- e.g. "100M-M", "SP-W"
  gender TEXT NOT NULL CHECK (gender IN ('men', 'women', 'mixed')),
  category TEXT NOT NULL CHECK (
    category IN (
      'track_sprint',
      'track_distance',
      'track_hurdles',
      'field_throw',
      'field_horizontal_jump',
      'field_vertical_jump',
      'relay',
      'road',
      'combined'
    )
  ),
  measurement_unit TEXT CHECK (measurement_unit IN ('seconds', 'metres', 'points', NULL)),
  start_type TEXT NOT NULL CHECK (start_type IN ('lanes', 'waterfall', 'mass', 'road')),
  max_lanes INT,
  has_rounds BOOLEAN NOT NULL DEFAULT FALSE,
  is_multi_attempt BOOLEAN NOT NULL DEFAULT FALSE,
  is_progressive_height BOOLEAN NOT NULL DEFAULT FALSE,
  max_attempts_per_height INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_events_gender ON events (gender);
CREATE INDEX IF NOT EXISTS idx_events_category ON events (category);

DROP TRIGGER IF EXISTS trg_events_updated_at ON events;
CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_timestamp();

-- ------------------------------------------------------------------------------
-- SEED EVENTS CATALOGUE (Idempotent: ON CONFLICT DO NOTHING)
-- ------------------------------------------------------------------------------
INSERT INTO events (name, code, gender, category, measurement_unit, start_type, max_lanes, has_rounds, is_multi_attempt, is_progressive_height, max_attempts_per_height)
VALUES
  -- 1. Sprints
  ('100m Men', '100M-M', 'men', 'track_sprint', 'seconds', 'lanes', 8, TRUE, FALSE, FALSE, NULL),
  ('100m Women', '100M-W', 'women', 'track_sprint', 'seconds', 'lanes', 8, TRUE, FALSE, FALSE, NULL),
  ('200m Men', '200M-M', 'men', 'track_sprint', 'seconds', 'lanes', 8, TRUE, FALSE, FALSE, NULL),
  ('200m Women', '200M-W', 'women', 'track_sprint', 'seconds', 'lanes', 8, TRUE, FALSE, FALSE, NULL),
  ('400m Men', '400M-M', 'men', 'track_sprint', 'seconds', 'lanes', 8, TRUE, FALSE, FALSE, NULL),
  ('400m Women', '400M-W', 'women', 'track_sprint', 'seconds', 'lanes', 8, TRUE, FALSE, FALSE, NULL),

  -- 2. Hurdles
  ('110m Hurdles Men', '110H-M', 'men', 'track_hurdles', 'seconds', 'lanes', 8, TRUE, FALSE, FALSE, NULL),
  ('100m Hurdles Women', '100H-W', 'women', 'track_hurdles', 'seconds', 'lanes', 8, TRUE, FALSE, FALSE, NULL),
  ('400m Hurdles Men', '400H-M', 'men', 'track_hurdles', 'seconds', 'lanes', 8, TRUE, FALSE, FALSE, NULL),
  ('400m Hurdles Women', '400H-W', 'women', 'track_hurdles', 'seconds', 'lanes', 8, TRUE, FALSE, FALSE, NULL),

  -- 3. Middle & Long Distance
  ('800m Men', '800M-M', 'men', 'track_distance', 'seconds', 'waterfall', NULL, TRUE, FALSE, FALSE, NULL),
  ('800m Women', '800M-W', 'women', 'track_distance', 'seconds', 'waterfall', NULL, TRUE, FALSE, FALSE, NULL),
  ('1500m Men', '1500M-M', 'men', 'track_distance', 'seconds', 'mass', NULL, FALSE, FALSE, FALSE, NULL),
  ('1500m Women', '1500M-W', 'women', 'track_distance', 'seconds', 'mass', NULL, FALSE, FALSE, FALSE, NULL),
  ('5000m Men', '5000M-M', 'men', 'track_distance', 'seconds', 'mass', NULL, FALSE, FALSE, FALSE, NULL),
  ('5000m Women', '5000M-W', 'women', 'track_distance', 'seconds', 'mass', NULL, FALSE, FALSE, FALSE, NULL),
  ('10000m Men', '10000M-M', 'men', 'track_distance', 'seconds', 'mass', NULL, FALSE, FALSE, FALSE, NULL),
  ('10000m Women', '10000M-W', 'women', 'track_distance', 'seconds', 'mass', NULL, FALSE, FALSE, FALSE, NULL),

  -- 4. Road Events
  ('21km Half Marathon Men', 'HM-M', 'men', 'road', 'seconds', 'road', NULL, FALSE, FALSE, FALSE, NULL),
  ('21km Half Marathon Women', 'HM-W', 'women', 'road', 'seconds', 'road', NULL, FALSE, FALSE, FALSE, NULL),

  -- 5. Relays
  ('4x100m Relay Men', '4X100M-M', 'men', 'relay', 'seconds', 'lanes', 8, FALSE, FALSE, FALSE, NULL),
  ('4x100m Relay Women', '4X100M-W', 'women', 'relay', 'seconds', 'lanes', 8, FALSE, FALSE, FALSE, NULL),
  ('4x400m Relay Men', '4X400M-M', 'men', 'relay', 'seconds', 'lanes', 8, FALSE, FALSE, FALSE, NULL),
  ('4x400m Relay Women', '4X400M-W', 'women', 'relay', 'seconds', 'lanes', 8, FALSE, FALSE, FALSE, NULL),

  -- 6. Field Throws (Up to 6 attempts, best mark in metres)
  ('Shot Put Men', 'SP-M', 'men', 'field_throw', 'metres', 'mass', NULL, FALSE, TRUE, FALSE, NULL),
  ('Shot Put Women', 'SP-W', 'women', 'field_throw', 'metres', 'mass', NULL, FALSE, TRUE, FALSE, NULL),
  ('Discus Throw Men', 'DT-M', 'men', 'field_throw', 'metres', 'mass', NULL, FALSE, TRUE, FALSE, NULL),
  ('Discus Throw Women', 'DT-W', 'women', 'field_throw', 'metres', 'mass', NULL, FALSE, TRUE, FALSE, NULL),
  ('Javelin Throw Men', 'JT-M', 'men', 'field_throw', 'metres', 'mass', NULL, FALSE, TRUE, FALSE, NULL),
  ('Javelin Throw Women', 'JT-W', 'women', 'field_throw', 'metres', 'mass', NULL, FALSE, TRUE, FALSE, NULL),
  ('Hammer Throw Men', 'HT-M', 'men', 'field_throw', 'metres', 'mass', NULL, FALSE, TRUE, FALSE, NULL),
  ('Hammer Throw Women', 'HT-W', 'women', 'field_throw', 'metres', 'mass', NULL, FALSE, TRUE, FALSE, NULL),

  -- 7. Field Horizontal Jumps (Up to 6 attempts, best mark in metres)
  ('Long Jump Men', 'LJ-M', 'men', 'field_horizontal_jump', 'metres', 'mass', NULL, FALSE, TRUE, FALSE, NULL),
  ('Long Jump Women', 'LJ-W', 'women', 'field_horizontal_jump', 'metres', 'mass', NULL, FALSE, TRUE, FALSE, NULL),
  ('Triple Jump Men', 'TJ-M', 'men', 'field_horizontal_jump', 'metres', 'mass', NULL, FALSE, TRUE, FALSE, NULL),
  ('Triple Jump Women', 'TJ-W', 'women', 'field_horizontal_jump', 'metres', 'mass', NULL, FALSE, TRUE, FALSE, NULL),

  -- 8. Field Vertical Jumps (Progressive heights, 3 attempts per bar)
  ('High Jump Men', 'HJ-M', 'men', 'field_vertical_jump', 'metres', 'mass', NULL, FALSE, FALSE, TRUE, 3),
  ('High Jump Women', 'HJ-W', 'women', 'field_vertical_jump', 'metres', 'mass', NULL, FALSE, FALSE, TRUE, 3),
  ('Pole Vault Men', 'PV-M', 'men', 'field_vertical_jump', 'metres', 'mass', NULL, FALSE, FALSE, TRUE, 3),
  ('Pole Vault Women', 'PV-W', 'women', 'field_vertical_jump', 'metres', 'mass', NULL, FALSE, FALSE, TRUE, 3)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  start_type = EXCLUDED.start_type,
  has_rounds = EXCLUDED.has_rounds,
  is_multi_attempt = EXCLUDED.is_multi_attempt,
  is_progressive_height = EXCLUDED.is_progressive_height,
  max_attempts_per_height = EXCLUDED.max_attempts_per_height;
