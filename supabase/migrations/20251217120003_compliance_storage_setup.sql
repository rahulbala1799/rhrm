-- Storage Setup for Compliance Documents
-- Creates bucket and RLS policies for secure file access

-- ============================================================================
-- CREATE STORAGE BUCKET
-- ============================================================================

-- Create the compliance-documents bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'compliance-documents',
  'compliance-documents',
  false, -- Private bucket
  5242880, -- 5MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE RLS POLICIES
-- ============================================================================
-- File path format: {tenantId}/{userId}/{docType}/{yyyy-mm}/{uuid}.{ext}
-- All policies require active membership in tenant (extracted from path)

-- Policy 1: SELECT (Read own files + Tenant admins can read all tenant files)
-- Hardened: Even "own files" require active membership
CREATE POLICY "Staff read own compliance files" 
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'compliance-documents'
    AND EXISTS (
      SELECT 1 FROM memberships
      WHERE user_id = auth.uid()
        AND tenant_id = ((storage.foldername(name))[1])::uuid
        AND status = 'active'
        AND (
          -- Own files: user_id in path matches auth.uid()
          (storage.foldername(name))[2] = auth.uid()::text
          -- Or admin in tenant
          OR role IN ('admin', 'superadmin')
        )
    )
  );

-- Policy 2: INSERT (Upload own files only)
-- Staff can only upload to their own folder
-- Path must match: {tenantId}/{auth.uid()}/{...}
CREATE POLICY "Staff upload own compliance files" 
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'compliance-documents'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM memberships
      WHERE user_id = auth.uid()
        AND tenant_id = ((storage.foldername(name))[1])::uuid
        AND status = 'active'
    )
  );

-- Policy 3: UPDATE (Update own files + Admins can update all tenant files)
CREATE POLICY "Staff update own compliance files" 
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'compliance-documents'
    AND EXISTS (
      SELECT 1 FROM memberships
      WHERE user_id = auth.uid()
        AND tenant_id = ((storage.foldername(name))[1])::uuid
        AND status = 'active'
        AND (
          (storage.foldername(name))[2] = auth.uid()::text
          OR role IN ('admin', 'superadmin')
        )
    )
  );

-- Policy 4: DELETE (Delete own files + Admins can delete all tenant files)
CREATE POLICY "Staff delete own compliance files" 
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'compliance-documents'
    AND EXISTS (
      SELECT 1 FROM memberships
      WHERE user_id = auth.uid()
        AND tenant_id = ((storage.foldername(name))[1])::uuid
        AND status = 'active'
        AND (
          (storage.foldername(name))[2] = auth.uid()::text
          OR role IN ('admin', 'superadmin')
        )
    )
  );

-- Note: Comments on storage policies require superuser permissions
-- Policy documentation is in the COMPLIANCE_SYSTEM_BUILD_PLAN.md

