-- Create tenant_compliance_requirements table
-- Stores admin-configured compliance document requirements

CREATE TABLE IF NOT EXISTS tenant_compliance_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL CHECK (country_code IN ('UK', 'IE', 'US')),
  doc_type TEXT NOT NULL,
  title TEXT NOT NULL,
  requirement_level TEXT NOT NULL CHECK (requirement_level IN ('required', 'conditional', 'optional')),
  collection_method TEXT NOT NULL CHECK (collection_method IN ('upload', 'reference', 'both')),
  expires_in_months INT NULL,
  applies_to_all BOOLEAN NOT NULL DEFAULT true,
  role_ids UUID[] NULL,
  location_ids UUID[] NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Uniqueness: One doc_type per country per tenant
  UNIQUE (tenant_id, country_code, doc_type)
);

-- Create indexes for efficient queries
CREATE INDEX idx_requirements_tenant_country 
  ON tenant_compliance_requirements(tenant_id, country_code, is_enabled);

CREATE INDEX idx_requirements_tenant_doctype 
  ON tenant_compliance_requirements(tenant_id, doc_type);

CREATE INDEX idx_requirements_sort 
  ON tenant_compliance_requirements(tenant_id, country_code, sort_order);

-- Add updated_at trigger
CREATE TRIGGER update_requirements_updated_at 
  BEFORE UPDATE ON tenant_compliance_requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE tenant_compliance_requirements ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE tenant_compliance_requirements IS 'Stores admin-configured compliance document requirements per tenant and country';
COMMENT ON COLUMN tenant_compliance_requirements.country_code IS 'UK, IE, or US - determines which requirements apply';
COMMENT ON COLUMN tenant_compliance_requirements.collection_method IS 'upload = file required, reference = reference data only, both = file + optional reference';
COMMENT ON COLUMN tenant_compliance_requirements.applies_to_all IS 'If true, applies to all staff; if false, filtered by role_ids or location_ids';


