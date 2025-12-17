-- RLS Policies for Compliance Documents System
-- Uses existing helper functions: user_has_membership, user_has_role_in_tenant

-- ============================================================================
-- TENANT_COMPLIANCE_REQUIREMENTS POLICIES
-- ============================================================================

-- Policy 1: SELECT (All tenant members can read requirements)
-- Staff need to see what documents they must upload
CREATE POLICY requirements_select_members 
  ON tenant_compliance_requirements
  FOR SELECT
  USING (public.user_has_membership(auth.uid(), tenant_id));

-- Policy 2: INSERT (Admins only)
CREATE POLICY requirements_insert_admin 
  ON tenant_compliance_requirements
  FOR INSERT
  WITH CHECK (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'));

-- Policy 3: UPDATE (Admins only)
CREATE POLICY requirements_update_admin 
  ON tenant_compliance_requirements
  FOR UPDATE
  USING (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'))
  WITH CHECK (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'));

-- Policy 4: DELETE (Admins only)
CREATE POLICY requirements_delete_admin 
  ON tenant_compliance_requirements
  FOR DELETE
  USING (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'));

-- ============================================================================
-- STAFF_COMPLIANCE_DOCUMENTS POLICIES
-- ============================================================================

-- Policy 1: SELECT (Own documents + Admin can see all tenant documents)
CREATE POLICY documents_select_own_or_admin 
  ON staff_compliance_documents
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
  );

-- Policy 2: INSERT (Staff can only insert their own documents)
-- Staff cannot supply: status (forced to 'submitted'), reviewed_by, reviewed_at, rejection_reason
-- Server validates and sets: storage_path, expires_at, submitted_at
CREATE POLICY documents_insert_own 
  ON staff_compliance_documents
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND public.user_has_membership(auth.uid(), tenant_id)
    AND status = 'submitted' -- Enforce initial status
    AND reviewed_by IS NULL -- Staff cannot set review fields
    AND reviewed_at IS NULL
    AND rejection_reason IS NULL
  );

-- Policy 3a: UPDATE (Admin can update review fields)
CREATE POLICY documents_update_admin_review 
  ON staff_compliance_documents
  FOR UPDATE
  USING (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'))
  WITH CHECK (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'));

-- Policy 3b: UPDATE (Staff narrow exception for reference metadata correction)
-- Staff can ONLY update reference_number and checked_date
-- ONLY on their own documents
-- ONLY when status='submitted' (before review)
-- Used by PATCH /api/compliance/documents/[id]/reference endpoint
CREATE POLICY documents_update_own_reference_metadata 
  ON staff_compliance_documents
  FOR UPDATE
  USING (
    user_id = auth.uid()
    AND status = 'submitted'
    AND public.user_has_membership(auth.uid(), tenant_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'submitted'
    AND public.user_has_membership(auth.uid(), tenant_id)
  );

-- Policy 4: DELETE (Own documents + Admin)
-- Staff can delete their own documents (to replace/remove)
-- Admins can delete any tenant documents
CREATE POLICY documents_delete_own_or_admin 
  ON staff_compliance_documents
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
  );

-- Comments
COMMENT ON POLICY requirements_select_members ON tenant_compliance_requirements IS 'All tenant members can read requirements to know what to upload';
COMMENT ON POLICY documents_update_own_reference_metadata ON staff_compliance_documents IS 'Narrow exception: staff can correct reference metadata typos when status=submitted. Server enforces only these columns are updated.';


