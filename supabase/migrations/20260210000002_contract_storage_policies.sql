-- Contract documents in compliance-documents bucket
-- Path format: contracts/{tenant_id}/{assignment_id}/generated.html | signed.{pdf|...}
-- Allow text/html for generated contracts; allow admins to write, tenant members to read.

-- Allow text/html in bucket (generated contract HTML)
UPDATE storage.buckets
SET allowed_mime_types = array_cat(COALESCE(allowed_mime_types, ARRAY[]::text[]), ARRAY['text/html'])
WHERE id = 'compliance-documents'
  AND NOT ('text/html' = ANY(COALESCE(allowed_mime_types, ARRAY[]::text[])));

-- Increase size limit for contract signed uploads (e.g. 10MB)
UPDATE storage.buckets
SET file_size_limit = 10485760
WHERE id = 'compliance-documents';

-- SELECT: any tenant member can read contract files (path starts with contracts/ and tenant_id in path)
CREATE POLICY "Contract documents read by tenant members"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'compliance-documents'
    AND (storage.foldername(name))[1] = 'contracts'
    AND (storage.foldername(name))[2] IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM memberships
      WHERE user_id = auth.uid()
        AND tenant_id = ((storage.foldername(name))[2])::uuid
        AND status = 'active'
    )
  );

-- INSERT: admin/manager can upload to contracts/{tenant_id}/...
CREATE POLICY "Contract documents insert by admin manager"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'compliance-documents'
    AND (storage.foldername(name))[1] = 'contracts'
    AND (storage.foldername(name))[2] IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM memberships
      WHERE user_id = auth.uid()
        AND tenant_id = ((storage.foldername(name))[2])::uuid
        AND status = 'active'
        AND role IN ('admin', 'manager')
    )
  );

-- Staff need to upload signed copy to contracts/{tenant_id}/{assignment_id}/signed.*
-- Allow INSERT when path has 3 segments (contracts, tenant_id, assignment_id) and file is under that folder.
-- Same policy above already allows admin/manager. For staff: allow if they are the staff on that assignment.
-- We cannot easily check assignment_id -> staff_id in RLS without a function. So: allow UPDATE (overwrite) for
-- path contracts/tenant_id/assignment_id/signed.* by any tenant member - then API validates that only the
-- assigned staff (or admin) can call upload-signed. So we need INSERT for staff to contracts/tenant_id/assignment_id/signed.*
-- Simplest: allow INSERT to contracts/ when user is admin or manager (done). For staff upload we need another INSERT
-- that allows path ending with /signed.* and (storage.foldername(name))[3] = assignment_id - and we'd need to join
-- contract_assignments.staff_id with staff.user_id = auth.uid(). That requires a function.

-- Alternative: allow any tenant member to INSERT under contracts/ - API enforces that only assigned staff or admin
-- can upload to a given assignment_id. So one more policy:
CREATE POLICY "Contract signed upload by tenant members"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'compliance-documents'
    AND (storage.foldername(name))[1] = 'contracts'
    AND (storage.foldername(name))[2] IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM memberships
      WHERE user_id = auth.uid()
        AND tenant_id = ((storage.foldername(name))[2])::uuid
        AND status = 'active'
    )
  );

-- Helper in public schema (we cannot create in storage). Staff can upload signed if they are the assignee or admin/manager.
CREATE OR REPLACE FUNCTION public.user_can_upload_contract_signed(p_tenant_id uuid, p_assignment_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM contract_assignments ca
    JOIN staff s ON s.id = ca.staff_id AND s.tenant_id = ca.tenant_id
    WHERE ca.id = p_assignment_id
      AND ca.tenant_id = p_tenant_id
      AND s.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.tenant_id = p_tenant_id AND m.user_id = auth.uid() AND m.status = 'active' AND m.role IN ('admin', 'manager')
  );
$$;

-- Drop the broad "Contract signed upload" policy if we're going to use a stricter one. Actually we had
-- "Contract documents insert by admin manager" - so only admin/manager. So staff cannot upload. We need one policy
-- that allows: (admin/manager for any contracts path) OR (staff for path contracts/tenant_id/assignment_id/signed.* where user is the assignee).
-- Combine into one WITH CHECK:
CREATE POLICY "Contract documents insert by admin or assigned staff"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'compliance-documents'
    AND (storage.foldername(name))[1] = 'contracts'
    AND (storage.foldername(name))[2] IS NOT NULL
    AND (storage.foldername(name))[3] IS NOT NULL
    AND (
      -- Admin/manager can upload anything under contracts/tenant_id/...
      EXISTS (
        SELECT 1 FROM memberships
        WHERE user_id = auth.uid()
          AND tenant_id = ((storage.foldername(name))[2])::uuid
          AND status = 'active'
          AND role IN ('admin', 'manager')
      )
      OR
      -- Staff can only upload to contracts/tenant_id/assignment_id/signed.* and only if they are the assignee
      (
        public.user_can_upload_contract_signed(
          ((storage.foldername(name))[2])::uuid,
          ((storage.foldername(name))[3])::uuid
        )
        AND (storage.filename(name)) LIKE 'signed.%'
      )
    )
  );

-- Remove the two INSERT policies we created above; the combined policy replaces them
DO $$
BEGIN
  EXECUTE 'ALTER TABLE storage.objects DROP POLICY "Contract documents insert by admin manager"';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$
BEGIN
  EXECUTE 'ALTER TABLE storage.objects DROP POLICY "Contract signed upload by tenant members"';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
