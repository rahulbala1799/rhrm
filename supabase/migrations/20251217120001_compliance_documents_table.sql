-- Create staff_compliance_documents table
-- Tracks staff document submissions (uploads and/or reference data)
-- No row = not uploaded; database status only stores submitted/approved/rejected (expired is computed)

CREATE TABLE IF NOT EXISTS staff_compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requirement_id UUID NULL REFERENCES tenant_compliance_requirements(id) ON DELETE SET NULL,
  doc_type TEXT NOT NULL,
  
  -- Status: only database-stored statuses (expired is computed, not stored)
  status TEXT NOT NULL CHECK (status IN ('submitted', 'approved', 'rejected')) DEFAULT 'submitted',
  
  -- Storage info (nullable to support reference-only submissions)
  storage_bucket TEXT NOT NULL DEFAULT 'compliance-documents',
  storage_path TEXT NULL,
  file_name TEXT NULL,
  file_mime TEXT NULL,
  file_size BIGINT NULL,
  
  -- Reference fields (for 'reference' collection method)
  reference_number TEXT NULL,
  checked_date DATE NULL,
  
  -- Expiry tracking (server-calculated)
  expires_at DATE NULL,
  
  -- Review tracking (admin-controlled fields, staff cannot set)
  rejection_reason TEXT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID NULL REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Enforce one current document per (tenant, user, doc_type)
  -- This prevents duplicates even when requirement_id is NULL
  UNIQUE (tenant_id, user_id, doc_type),
  
  -- Validation: Ensure submission has either file OR reference (or both)
  -- NOTE: This is generic - does NOT enforce collection_method-specific rules
  -- collection_method validation happens at API level
  CONSTRAINT check_submission_type CHECK (
    -- Must have at least one: file or reference
    (storage_path IS NOT NULL AND file_name IS NOT NULL AND file_mime IS NOT NULL AND file_size IS NOT NULL)
    OR
    (reference_number IS NOT NULL)
  ),
  
  -- Additional constraint: If any file field is set, all must be set
  CONSTRAINT check_file_fields_complete CHECK (
    (storage_path IS NULL AND file_name IS NULL AND file_mime IS NULL AND file_size IS NULL)
    OR
    (storage_path IS NOT NULL AND file_name IS NOT NULL AND file_mime IS NOT NULL AND file_size IS NOT NULL)
  )
);

-- Create indexes for efficient queries
CREATE INDEX idx_documents_tenant_user 
  ON staff_compliance_documents(tenant_id, user_id, status);

CREATE INDEX idx_documents_tenant_doctype 
  ON staff_compliance_documents(tenant_id, doc_type);

CREATE INDEX idx_documents_tenant_status 
  ON staff_compliance_documents(tenant_id, status);

CREATE INDEX idx_documents_user_doctype 
  ON staff_compliance_documents(user_id, doc_type, status);

CREATE INDEX idx_documents_expires 
  ON staff_compliance_documents(tenant_id, expires_at) 
  WHERE expires_at IS NOT NULL;

-- Add updated_at trigger
CREATE TRIGGER update_documents_updated_at 
  BEFORE UPDATE ON staff_compliance_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE staff_compliance_documents ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE staff_compliance_documents IS 'Tracks staff compliance document submissions (file uploads and/or reference data)';
COMMENT ON COLUMN staff_compliance_documents.status IS 'Database-stored status: submitted, approved, or rejected. Expired is computed, not stored.';
COMMENT ON COLUMN staff_compliance_documents.storage_path IS 'Nullable for reference-only submissions. Server-generated, never client-supplied.';
COMMENT ON COLUMN staff_compliance_documents.expires_at IS 'Calculated as submitted_at/reviewed_at + requirement.expires_in_months';
COMMENT ON CONSTRAINT check_submission_type ON staff_compliance_documents IS 'Generic constraint: must have file OR reference. API enforces collection_method-specific rules.';

