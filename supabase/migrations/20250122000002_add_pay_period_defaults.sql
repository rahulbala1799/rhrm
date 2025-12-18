-- Set default pay period config for tenants without one
-- Pay period config is stored in tenants.settings JSONB
UPDATE tenants
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{pay_period}',
  '{"type": "weekly", "week_starts_on": "monday"}'::jsonb
)
WHERE settings->'pay_period' IS NULL;

