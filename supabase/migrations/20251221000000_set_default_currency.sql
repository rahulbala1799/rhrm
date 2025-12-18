-- Migration: Set default currency for existing tenants
-- This migration sets USD as the default currency for all existing tenants
-- that don't already have a currency set in their settings

-- Update tenants without currency to have USD as default
UPDATE tenants
SET settings = COALESCE(settings, '{}'::jsonb) || '{"currency": "USD"}'::jsonb
WHERE settings->>'currency' IS NULL OR settings->>'currency' = '';

-- Add a comment to document the currency field
COMMENT ON COLUMN tenants.settings IS 'JSONB object containing tenant settings including currency (USD, EUR, or GBP)';

