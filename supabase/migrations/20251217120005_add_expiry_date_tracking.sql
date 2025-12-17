-- Add expiry date tracking to compliance system
-- This migration adds optional expiry date tracking per document type
-- Admins can toggle whether a document type requires expiry dates

-- 1. Add requires_expiry_date column to tenant_compliance_requirements
ALTER TABLE tenant_compliance_requirements
ADD COLUMN requires_expiry_date BOOLEAN NOT NULL DEFAULT false;

-- 2. Add expiry_date column to staff_compliance_documents
ALTER TABLE staff_compliance_documents
ADD COLUMN expiry_date DATE NULL;

-- 3. Add index for expiry date queries (future notifications/reports)
CREATE INDEX idx_staff_compliance_documents_expiry_date 
ON staff_compliance_documents(expiry_date) 
WHERE expiry_date IS NOT NULL;

-- 4. Add helpful comments for documentation
COMMENT ON COLUMN tenant_compliance_requirements.requires_expiry_date IS 
  'When true, staff must provide an expiry date when submitting documents of this type. Enforced at API layer.';

COMMENT ON COLUMN staff_compliance_documents.expiry_date IS 
  'Expiry date of the submitted document (if required by document type). Stored as DATE (YYYY-MM-DD), displayed as dd/mm/yyyy in UI.';

-- 5. Optional: Enable expiry tracking for common certification types by default
-- Uncomment the following if you want certain pre-seeded types to have tracking enabled from the start
/*
UPDATE tenant_compliance_requirements
SET requires_expiry_date = true
WHERE name IN (
  'Working with Children Check',
  'First Aid Certificate',
  'Police Check',
  'Drivers License'
)
AND is_preset = true;
*/

