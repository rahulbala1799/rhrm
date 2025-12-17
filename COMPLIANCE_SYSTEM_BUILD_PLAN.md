# Compliance Documents System - Implementation Plan

---

## Document Status

**File:** `COMPLIANCE_SYSTEM_BUILD_PLAN.md`  
**Last Updated:** December 17, 2025  
**Status:** ✅ **This document is approved as the final build specification**

This is the single source of truth for implementing the Compliance Documents system. All design decisions have been finalized and hardened for production use.

### Key Hardening Decisions Made

| Area | Decision | Rationale |
|------|----------|-----------|
| **User Identity** | `auth.uid()` is canonical, profiles.id = auth.users.id (1:1) | Profiles are 1:1 with auth users; auth.uid() is authoritative for all security |
| **Staff Permissions** | Narrow UPDATE exception for reference metadata | RLS policy allows UPDATE only reference_number/checked_date when status=submitted |
| **Reference Metadata** | Staff can correct via PATCH endpoint with RLS | Uses anon key + narrow RLS policy; no service role needed |
| **"Not Uploaded" Model** | No row = not uploaded | Cleaner data model, no placeholder rows, simpler queries |
| **"Expired" Status** | Computed, never stored in database | Query computes; database status only stores submitted/approved/rejected |
| **Submission Types** | Support upload, reference, both | Single table with nullable file fields + generic CHECK constraints |
| **Collection Method** | Enforced at API level, not database | DB has generic rules; API validates against requirement.collection_method |
| **Uniqueness** | UNIQUE (tenant_id, user_id, doc_type) | Prevents duplicates even when requirement_id is NULL |
| **File Paths** | Server-generated only | Client never supplies paths; prevents path traversal attacks |
| **File Validation** | Server-side enforcement | MIME type, size, extension validated server-side; client validation is UX only |
| **Old File Cleanup** | Automatic on replacement | Server deletes old file from storage when document replaced |
| **Signed URLs** | Required for viewing files | Private bucket; 1-hour signed URLs; no public access |
| **Storage Membership** | Required for ALL access | Even "own files" require active membership in tenant |
| **Expiry Calculation** | On submit + recalc on approval | Expires_at = submitted_at/reviewed_at + expires_in_months |
| **Expiry Detection** | Computed (canonical) | Query computes expired status; cron optional for notifications only |
| **Role/Location Filter** | OR logic, server-side | Filtering happens in API; client displays pre-filtered list |
| **Service Role Key** | NOT used in this feature | All operations use anon key + RLS; no service role needed |
| **Rate Limiting** | 10 uploads per 10 min | Prevents abuse; enforced server-side |
| **Status Transitions** | Locked down by role | Table defines who can transition; expired is computed not transitioned |

---

## Overview

Building a complete, production-ready Compliance Documents system with two distinct user interfaces:

1. **Admin UI** → Settings → Compliance documents (configure required docs)
2. **Staff UI** → Upload compliance documents (upload + track status)

This system will be fully integrated with Supabase using:
- **Supabase Storage** for file storage
- **Postgres tables** for configuration + document statuses
- **RLS policies** for secure, tenant-isolated access
- **Migrations** for all database schema changes

---

## Data Model Foundation (Authoritative)

### User Identification

**Canonical User ID:** `auth.uid()`

- `auth.uid()` from Supabase Auth is the **authoritative** user identifier for all security decisions
- `staff_compliance_documents.user_id` **MUST** always equal `auth.uid()` of the authenticated user
- `profiles` table exists and has a **strict 1:1 relationship** with `auth.users`:
  - `profiles.id` is a foreign key to `auth.users(id) ON DELETE CASCADE`
  - Every auth user has exactly one profile row (created via trigger on auth.users insert)
  - `profiles.id` = `auth.users.id` (same UUID value)
- For security: All RLS policies use `auth.uid()` for user identity checks
- For referential integrity: Foreign keys to users reference `profiles(id)` (which equals `auth.users.id`)
- **Migration enforcement:**
  ```sql
  -- This relationship already exists in initial schema:
  CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    ...
  );
  ```

### "Not Uploaded" Model (Production Decision)

**Decision:** No row in `staff_compliance_documents` = document not uploaded ✅

**Rationale:**
- Cleaner data model (no pre-seeding required)
- Lower storage overhead
- Simpler queries (no need to filter out placeholder rows)

**Implementation:**
- Staff UI: Join requirements with documents (LEFT JOIN), null document = not uploaded
- API: Return requirements + documents separately; client merges
- Database: No "not_uploaded" status rows exist; status only applies to uploaded documents

**Status Flow:**
```
[No row] → submitted → approved
                    ↘ rejected → [replaced] → submitted
                    ↘ expired → [replaced] → submitted
```

### Status Transition Rules (Non-negotiable)

**Database-Stored Status Transitions:**

| From Status    | To Status  | Who Can Perform              | How                                    |
|----------------|------------|------------------------------|----------------------------------------|
| [No row]       | submitted  | Staff (own documents)        | Server API: POST /api/compliance/upload (file or reference)|
| submitted      | approved   | Admin only                   | Server API: POST /api/compliance/review/[id]/approve |
| submitted      | rejected   | Admin only                   | Server API: POST /api/compliance/review/[id]/reject  |
| rejected       | submitted  | Staff (own documents)        | Server API: POST /api/compliance/upload (replace) |

**Computed Status (Not Stored in Database):**

| Computed Status | Condition | Notes |
|-----------------|-----------|-------|
| `not_uploaded` | No row exists for (tenant, user, doc_type) | UI shows "Not uploaded" |
| `expired` | status='approved' AND expires_at < CURRENT_DATE | Query computes at read-time; replaces 'approved' in UI |

**Notes:**
- **"expired" is NEVER stored in database:** Always computed at query time. No database status transition to 'expired'.
- **Critical:** Staff CANNOT directly UPDATE status, reviewed_by, reviewed_at, or rejection_reason fields. These are admin-controlled and set only via dedicated server endpoints.
- **Reference metadata correction:** Staff CAN update reference_number/checked_date when status=submitted via dedicated PATCH endpoint (narrow RLS exception, see below).

---

## Security Architecture (Non-negotiable)

### Hard Security Rules

1. ✅ **Service Role Key is NEVER exposed in client code**
   - Web client: Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` only
   - Mobile client: Uses anon key only
   - Service role key: Server environment variables only (`process.env.SUPABASE_SERVICE_ROLE_KEY`)
   - **This system does NOT require service role key** - all operations use RLS with anon key

2. ✅ **All operations use RLS-protected queries**
   - Client → Supabase direct queries (anon key + RLS policies)
   - Server API routes → validate permissions → Supabase queries (anon key + RLS)
   - No service role bypassing in this feature

3. ✅ **Storage protected by RLS policies**
   - Staff can only access their own files
   - Tenant admins can access all tenant files
   - File paths are **server-generated** (never client-supplied)
   - Path format: `{tenantId}/{userId}/{docType}/{yyyy-mm}/{uuid}.{ext}`

4. ✅ **Membership required for ALL storage access**
   - All storage policies verify active membership in tenant
   - Path-based isolation enforced
   - Signed URLs used for viewing/downloading from private bucket

---

## Database & Storage Design

### A) Storage Bucket

**Bucket Name:** `compliance-documents` (private)

**File Path Structure:**
```
{tenantId}/{userId}/{docType}/{yyyy-mm}/{uuid}.{ext}

Example:
550e8400-e29b-41d4-a716-446655440000/
  123e4567-e89b-12d3-a456-426614174000/
    right_to_work/
      2025-01/
        f47ac10b-58cc-4372-a567-0e02b2c3d479.pdf
```

### B) Database Tables

#### Table 1: `tenant_compliance_requirements`
Stores admin-configured requirements.

```sql
CREATE TABLE tenant_compliance_requirements (
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (tenant_id, country_code, doc_type)
);
```

**Indexes:**
```sql
CREATE INDEX idx_requirements_tenant_country ON tenant_compliance_requirements(tenant_id, country_code, is_enabled);
CREATE INDEX idx_requirements_tenant_doctype ON tenant_compliance_requirements(tenant_id, doc_type);
CREATE INDEX idx_requirements_sort ON tenant_compliance_requirements(tenant_id, country_code, sort_order);
```

**Triggers:**
```sql
-- Auto-update updated_at timestamp
CREATE TRIGGER update_requirements_updated_at 
  BEFORE UPDATE ON tenant_compliance_requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Uniqueness Constraints:**
- `UNIQUE (tenant_id, country_code, doc_type)` - prevents duplicate doc types per country per tenant
- This ensures deterministic requirement lookups

**Doc Types (Canonical):**
- UK: `right_to_work`, `contract_terms`, `pay_records`, `working_time_holiday`
- IE: `payroll_records`, `pps_payroll_id`, `permission_to_work`, `contract_terms`, `working_time_holiday`
- US: `i9`, `w4`, `payroll_wage_hour`

---

#### Table 2: `staff_compliance_documents`
Tracks staff uploads + status.

**Important:** This table only contains rows for documents that have been submitted (uploaded file and/or reference data). No row = not uploaded.

**Submission Types Supported:**
1. **Upload-only:** File uploaded (collection_method = 'upload')
2. **Reference-only:** Reference number/date provided (collection_method = 'reference')
3. **Both:** File + reference data (collection_method = 'both')

```sql
CREATE TABLE staff_compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requirement_id UUID NULL REFERENCES tenant_compliance_requirements(id) ON DELETE SET NULL,
  doc_type TEXT NOT NULL,
  
  -- Status: only contains actual submitted documents
  -- No 'not_uploaded' status - absence of row = not uploaded
  -- No 'expired' status - expired is computed (approved + expires_at < CURRENT_DATE)
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
  
  -- Review tracking (admin-controlled, staff cannot set)
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
  -- collection_method validation happens at API level (see note below)
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

-- Why DB doesn't enforce collection_method-specific rules:
-- 1. collection_method is stored in tenant_compliance_requirements (different table)
-- 2. Requirement can change after document is submitted
-- 3. Document row doesn't store collection_method (denormalization would cause sync issues)
-- 4. API-level validation is more flexible and provides better error messages
-- Solution: Generic CHECK constraints ensure data integrity (file fields atomic, something submitted)
--           API enforces collection_method rules at submission time
```

**Submission Type Logic:**

| Collection Method | File Required | Reference Required | Both Allowed |
|-------------------|---------------|-------------------|-------------|
| `upload`          | ✅ Yes        | ❌ No             | ❌ No       |
| `reference`       | ❌ No         | ✅ Yes            | ❌ No       |
| `both`            | ✅ Yes        | ⚠️ Optional       | ✅ Yes      |

**Clarification for `collection_method = 'both'`:**
- File is **required** (primary evidence)
- Reference fields are **optional** (supplementary data)
- Example: I-9 form requires both the uploaded document + reference details (date checked, ID number)

**Collection Method Enforcement (API-Level):**

The database CHECK constraints are **generic** (ensure something is submitted + file fields are atomic). The **specific collection_method rules** are enforced in the API layer:

1. **Server endpoint:** POST `/api/compliance/upload`
2. **Validation logic:**
   ```typescript
   // Fetch requirement to get collection_method
   const requirement = await fetchRequirement(requirementId)
   
   // Validate submission matches collection_method
   if (requirement.collection_method === 'upload' && !hasFile) {
     return 400: "File required for this document type"
   }
   if (requirement.collection_method === 'reference' && hasFile) {
     return 400: "File not allowed for reference-only document"
   }
   if (requirement.collection_method === 'reference' && !hasReference) {
     return 400: "Reference number required"
   }
   if (requirement.collection_method === 'both' && !hasFile) {
     return 400: "File required (reference optional)"
   }
   ```

**Why API-level enforcement (not database):**
- `collection_method` is in `tenant_compliance_requirements` table (foreign reference)
- Requirement can change after document submitted (wouldn't want to invalidate existing documents)
- Document row doesn't duplicate `collection_method` (avoid denormalization)
- API provides better error messages and user experience
- Database enforces data integrity (generic rules), API enforces business rules (specific to requirement)


**Indexes:**
```sql
CREATE INDEX idx_documents_tenant_user ON staff_compliance_documents(tenant_id, user_id, status);
CREATE INDEX idx_documents_tenant_doctype ON staff_compliance_documents(tenant_id, doc_type);
CREATE INDEX idx_documents_tenant_status ON staff_compliance_documents(tenant_id, status);
CREATE INDEX idx_documents_user_doctype ON staff_compliance_documents(user_id, doc_type, status);
CREATE INDEX idx_documents_expires ON staff_compliance_documents(tenant_id, expires_at) WHERE expires_at IS NOT NULL;
```

**Triggers:**
```sql
-- Auto-update updated_at timestamp
CREATE TRIGGER update_documents_updated_at 
  BEFORE UPDATE ON staff_compliance_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Uniqueness Constraints:**
- `UNIQUE (tenant_id, user_id, doc_type)` - enforces one current document per user per doc type
- This prevents duplicates even when `requirement_id` is NULL
- On replacement: Use UPSERT (ON CONFLICT UPDATE) or DELETE + INSERT based on this key

**Field Constraints:**
- `storage_path`, `file_name`, `file_mime`, `file_size` are **nullable** to support reference-only submissions
- CHECK constraint enforces: if any file field is set, all must be set (atomicity)
- CHECK constraint enforces: must have at least file OR reference (no empty submissions)
- `submitted_at` is `NOT NULL DEFAULT NOW()` - every document has a submission timestamp
- Admin-controlled fields (`reviewed_by`, `reviewed_at`, `rejection_reason`) can only be set via admin APIs

**Submission Validation Examples:**
- ✅ Valid: `storage_path='...', file_name='...', file_mime='...', file_size=12345, reference_number=NULL`
- ✅ Valid: `storage_path=NULL, file_name=NULL, file_mime=NULL, file_size=NULL, reference_number='ABC123'`
- ✅ Valid: `storage_path='...', file_name='...', file_mime='...', file_size=12345, reference_number='ABC123'`
- ❌ Invalid: `storage_path='...', file_name=NULL, ...` (file fields incomplete)
- ❌ Invalid: `storage_path=NULL, ..., reference_number=NULL` (no submission data)

---

### C) RLS Policies

#### For `tenant_compliance_requirements`:

**Enable RLS:**
```sql
ALTER TABLE tenant_compliance_requirements ENABLE ROW LEVEL SECURITY;
```

**Policies:**

1. **SELECT** (Tenant Members)
   - All tenant members can read requirements (staff need to see what to upload)
   ```sql
   CREATE POLICY requirements_select_members ON tenant_compliance_requirements
     FOR SELECT
     USING (public.user_has_membership(auth.uid(), tenant_id));
   ```

2. **INSERT** (Admins Only)
   ```sql
   CREATE POLICY requirements_insert_admin ON tenant_compliance_requirements
     FOR INSERT
     WITH CHECK (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'));
   ```

3. **UPDATE** (Admins Only)
   ```sql
   CREATE POLICY requirements_update_admin ON tenant_compliance_requirements
     FOR UPDATE
     USING (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'))
     WITH CHECK (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'));
   ```

4. **DELETE** (Admins Only)
   ```sql
   CREATE POLICY requirements_delete_admin ON tenant_compliance_requirements
     FOR DELETE
     USING (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'));
   ```

---

#### For `staff_compliance_documents`:

**Enable RLS:**
```sql
ALTER TABLE staff_compliance_documents ENABLE ROW LEVEL SECURITY;
```

**Critical Design Decision:** Staff do NOT have direct UPDATE permissions via client. All staff submissions go through server-side API endpoints that validate and set fields correctly.

**Policies:**

1. **SELECT** (Own + Admin)
   - Staff can see their own documents
   - Admins can see all tenant documents
   ```sql
   CREATE POLICY documents_select_own_or_admin ON staff_compliance_documents
     FOR SELECT
     USING (
       user_id = auth.uid()
       OR public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
     );
   ```

2. **INSERT** (Server APIs Only - Authenticated)
   - Staff can only insert their own documents
   - Client cannot supply: status (forced to 'submitted'), reviewed_by, reviewed_at, rejection_reason
   - Server API validates and sets: storage_path, expires_at, submitted_at
   ```sql
   CREATE POLICY documents_insert_own ON staff_compliance_documents
     FOR INSERT
     WITH CHECK (
       user_id = auth.uid()
       AND public.user_has_membership(auth.uid(), tenant_id)
       AND status = 'submitted' -- Enforce initial status
       AND reviewed_by IS NULL -- Staff cannot set review fields
       AND reviewed_at IS NULL
       AND rejection_reason IS NULL
     );
   ```

3. **UPDATE** (Admin + Staff Limited Exception)
   
   **Admin UPDATE Policy:**
   - Admins can update status, reviewed_by, reviewed_at, rejection_reason
   ```sql
   -- Admin can update review fields
   CREATE POLICY documents_update_admin_review ON staff_compliance_documents
     FOR UPDATE
     USING (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'))
     WITH CHECK (public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin'));
   ```
   
   **Staff UPDATE Policy (Narrow Exception for Reference Metadata):**
   - Staff can ONLY update reference_number and checked_date
   - ONLY on their own documents
   - ONLY when status='submitted' (before review)
   - ONLY when they have active membership in tenant
   - Used by PATCH /api/compliance/documents/[id]/reference endpoint
   ```sql
   -- Staff can update ONLY reference metadata, ONLY on submitted documents
   CREATE POLICY documents_update_own_reference_metadata ON staff_compliance_documents
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
   ```
   
   **Critical Security Notes:**
   - This policy allows UPDATE, but the PATCH endpoint ONLY modifies reference_number and checked_date columns
   - Server code enforces: never touch status, file fields, admin fields, or any other columns
   - If staff tries to update other fields via client, RLS passes but server ignores (defense in depth)
   - Staff file replacement still uses DELETE + INSERT (not UPDATE)

4. **DELETE** (Own + Admin)
   - Staff can delete their own documents (to replace/remove)
   - Admins can delete any tenant documents
   ```sql
   CREATE POLICY documents_delete_own_or_admin ON staff_compliance_documents
     FOR DELETE
     USING (
       user_id = auth.uid()
       OR public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
     );
   ```

**Staff Operations Flow:**

| Operation | Method | RLS Policy | Server Validation |
|-----------|--------|------------|-------------------|
| Upload new document | INSERT | documents_insert_own | Server generates storage_path, sets submitted_at, calculates expires_at |
| Replace document | DELETE + INSERT | documents_delete_own + documents_insert_own | Server deletes old file from storage, generates new path |
| View own document | SELECT | documents_select_own_or_admin | Server generates signed URL for private storage |
| Update reference metadata | UPDATE (via PATCH) | documents_update_own_reference_metadata | Server updates ONLY reference_number, checked_date; ONLY when status=submitted |

**Admin Operations Flow:**

| Operation | Method | RLS Policy | Server Validation |
|-----------|--------|------------|-------------------|
| Approve document | UPDATE | documents_update_admin_review | Server sets status='approved', reviewed_by, reviewed_at |
| Reject document | UPDATE | documents_update_admin_review | Server sets status='rejected', rejection_reason, reviewed_by, reviewed_at |
| View any document | SELECT | documents_select_own_or_admin | Server generates signed URL for private storage |
| Delete document | DELETE | documents_delete_own_or_admin | Server deletes file from storage + row |

---

### D) Storage Policies

**Bucket:** `compliance-documents` (private)

**Path Pattern:** `{tenantId}/{userId}/{docType}/{yyyy-mm}/{uuid}.{ext}`

**Helper Function:**
```sql
-- Extract user_id from path
CREATE OR REPLACE FUNCTION extract_user_id_from_compliance_path(path TEXT)
RETURNS UUID AS $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Pattern: {tenantId}/{userId}/{docType}/...
  SELECT (regexp_match(path, '^([0-9a-f-]{36})/([0-9a-f-]{36})/'))[2]::uuid
  INTO user_uuid;
  RETURN user_uuid;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Storage Policies:**

1. **SELECT** (Own Files + Tenant Admins - Both Require Active Membership)
   ```sql
   CREATE POLICY "Staff read own files" ON storage.objects
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
   ```
   
   **Hardening:** Even for "own files", user must have active membership in the tenant (extracted from path folder[1]). This prevents cross-tenant access and ensures revoked users lose access immediately.

2. **INSERT** (Own Files Only)
   ```sql
   CREATE POLICY "Staff upload own files" ON storage.objects
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
   ```

3. **UPDATE** (Own Files + Admins - Both Require Active Membership)
   ```sql
   CREATE POLICY "Staff update own files" ON storage.objects
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
   ```

4. **DELETE** (Own Files + Admins - Both Require Active Membership)
   ```sql
   CREATE POLICY "Staff delete own files" ON storage.objects
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
   ```

---

### E) File Handling & Signed URLs

**Critical File Handling Rules:**

1. **Storage Paths are Server-Generated (Non-negotiable)**
   - Client NEVER supplies storage paths
   - Server generates deterministic paths: `{tenantId}/{userId}/{docType}/{yyyy-mm}/{uuid}.{ext}`
   - Example generation logic:
     ```typescript
     const path = `${tenantId}/${userId}/${docType}/${yyyy}-${mm}/${uuidv4()}.${extension}`
     ```

2. **File Validation (Server-Side Enforcement)**
   - Allowed MIME types: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`
   - Max file size: 5MB (5,242,880 bytes)
   - Validation occurs before upload to storage
   - Reject uploads with invalid type/size with 400 error

3. **Old File Deletion on Replacement**
   - When staff replaces a document:
     1. Server fetches old `storage_path` from database
     2. Server deletes old file from Supabase Storage
     3. Server uploads new file to new path (new UUID)
     4. Server deletes old database row
     5. Server inserts new database row with new path
   - Prevents orphaned files in storage

4. **Signed URLs for Private Bucket Access**
   - Bucket is private (no public read access)
   - To view/download files:
     1. Client requests: GET `/api/compliance/documents/{id}/view`
     2. Server verifies user has access (RLS check via SELECT)
     3. Server generates signed URL: `supabase.storage.from('compliance-documents').createSignedUrl(path, 3600)` (1 hour expiry)
     4. Server returns signed URL to client
     5. Client uses signed URL to fetch file directly from storage
   - Signed URLs expire after 1 hour (configurable)

5. **Rate Limiting for Upload Endpoints**
   - POST `/api/compliance/upload`: Max 10 uploads per user per 10 minutes
   - Prevents abuse and DoS attacks
   - Implementation: Use IP + user ID for rate limit key
   - Return 429 (Too Many Requests) when limit exceeded

6. **File Extension Validation**
   - Extract extension from original filename
   - Validate against allowed extensions: `.pdf`, `.jpg`, `.jpeg`, `.png`, `.webp`
   - Normalize extension to lowercase
   - Reject files with no extension or invalid extension

**Document Submission Flow (Complete):**
```
Client → POST /api/compliance/upload (multipart/form-data or JSON)
  ↓
Server validates:
  - User authenticated (auth.uid())
  - User has membership in tenant
  - Fetch requirement by requirementId
  - Validate submission matches collection_method:
    * upload: file required
    * reference: reference_number required, file not allowed
    * both: file required, reference optional
  - If file provided:
    * File size ≤ 5MB
    * File MIME type allowed
    * File extension valid
    * Rate limit not exceeded
  ↓
If file provided:
  Server generates storage path:
    path = {tenantId}/{userId}/{docType}/{yyyy-mm}/{uuid}.{ext}
  ↓
If replacing (check by tenant_id, user_id, doc_type):
  - SELECT old document row by UNIQUE key
  - If old row has file: DELETE old file from storage
  - DELETE old database row
  ↓
If file provided:
  Server uploads file to Supabase Storage:
    - Uses client's auth session (anon key + RLS)
    - Storage RLS policy validates path ownership
  ↓
Server calculates expires_at:
  - If requirement.expires_in_months exists:
    expires_at = NOW() + expires_in_months
  - Else: expires_at = NULL
  ↓
Server INSERTs staff_compliance_documents row:
  - user_id = auth.uid()
  - tenant_id = from context
  - requirement_id = from request
  - doc_type = from request
  - status = 'submitted'
  - storage_path = generated path (or NULL for reference-only)
  - file_name, file_mime, file_size = from upload (or NULL for reference-only)
  - reference_number, checked_date = from request (or NULL if not provided)
  - expires_at = calculated
  - submitted_at = NOW()
  ↓
Server returns: { document: {...}, message: 'Document submitted successfully' }
```

---

### F) Expiry Logic (Single Source of Truth)

**When `expires_at` is Calculated:**
- **On document submission** (POST `/api/compliance/upload`)
- Calculation: `expires_at = submitted_at + requirement.expires_in_months MONTHS`
- If `requirement.expires_in_months` is NULL → `expires_at = NULL` (no expiry)

**When `expires_at` is Updated:**
- **On document approval** (POST `/api/compliance/review/{id}/approve`)
- Recalculation: `expires_at = reviewed_at + requirement.expires_in_months MONTHS`
- Rationale: Expiry clock starts from approval date, not submission date

**How "Expired" Status is Determined:**

**Canonical Approach (Required):** Computed in query at read-time

```sql
SELECT *,
  CASE
    WHEN status = 'approved' AND expires_at IS NOT NULL AND expires_at < CURRENT_DATE
    THEN 'expired'
    ELSE status
  END AS computed_status
FROM staff_compliance_documents
```

**Why Computed is Canonical:**
- Always accurate (real-time check)
- No lag between expiry date and status update
- Works correctly even if cron jobs fail
- Simpler to reason about
- **Database never stores 'expired' status** - it's computed on every query

**Optional Enhancement:** Scheduled job for notifications ONLY
- Background worker runs daily (e.g., 2 AM UTC)
- **Purpose:** Send expiry notifications to staff + admin
- Query to find expired documents:
  ```sql
  SELECT * FROM staff_compliance_documents
  WHERE status = 'approved'
    AND expires_at IS NOT NULL
    AND expires_at < CURRENT_DATE
  ```
- Send email/notification for each expired document
- **Important:** Job does NOT update database status (expired is always computed, never stored)
- System works correctly without this job (relies on computed status for correctness)

**Future Optimization (Optional, Advanced):**
- If query performance becomes an issue, consider adding a boolean `is_expired_cache` column
- Updated by daily cron for faster filtering (avoid date comparison on every query)
- **Must still compute canonical status in queries** (cache is hint only)
- This is NOT required for MVP - only optimize if proven necessary

**UI Status Display:**
- Always use computed_status from query (accounts for expired documents not yet batch-updated)
- Status badge logic:
  ```typescript
  const displayStatus = (doc) => {
    if (doc.status === 'approved' && doc.expires_at && new Date(doc.expires_at) < new Date()) {
      return 'expired'
    }
    return doc.status
  }
  ```

**Expiry Notifications (Nice-to-Have):**
- 30 days before expiry: Email staff + admin
- 7 days before expiry: Email staff + admin
- On expiry: Email staff + admin
- Implementation: Background worker queries `expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'`

---

### G) Role & Location Applicability (Canonical Rule)

**Matching Logic (WHERE Clause):**

A requirement applies to a staff member if:

```sql
-- Requirement applies if:
(
  requirement.applies_to_all = true
  OR
  (
    requirement.applies_to_all = false
    AND (
      -- Match by role (OR logic within role_ids)
      (requirement.role_ids IS NOT NULL AND staff_membership.role = ANY(requirement.role_ids))
      OR
      -- Match by location (OR logic within location_ids)
      (requirement.location_ids IS NOT NULL AND staff.location_id = ANY(requirement.location_ids))
    )
  )
)
```

**Clarifications:**

1. **applies_to_all = true:**
   - Requirement applies to ALL staff in tenant
   - `role_ids` and `location_ids` are ignored

2. **applies_to_all = false + role_ids set:**
   - Requirement applies only to staff with matching role
   - OR logic: ANY role in array matches

3. **applies_to_all = false + location_ids set:**
   - Requirement applies only to staff at matching location
   - OR logic: ANY location in array matches

4. **applies_to_all = false + role_ids AND location_ids both set:**
   - Requirement applies if (role matches OR location matches)
   - OR logic between role and location

5. **applies_to_all = false + neither set:**
   - Requirement applies to NO staff (edge case, should be prevented in UI)

**Where This Logic Lives:**
- **Server API:** GET `/api/compliance/documents`
- Server queries requirements + joins with staff context (role + location)
- Server returns only applicable requirements to client
- Client displays requirements (no filtering needed)

**Example Query:**
```sql
SELECT r.*
FROM tenant_compliance_requirements r
WHERE r.tenant_id = $1
  AND r.country_code = $2
  AND r.is_enabled = true
  AND (
    r.applies_to_all = true
    OR (
      r.applies_to_all = false
      AND (
        ($3 = ANY(r.role_ids)) -- $3 = user's role
        OR
        ($4 = ANY(r.location_ids)) -- $4 = user's location_id
      )
    )
  )
ORDER BY r.sort_order ASC;
```

---

## Seed Defaults

### Auto-Initialize Recommended Defaults

When a tenant first accesses the admin settings page and has no requirements configured, auto-seed recommended defaults based on tenant's country setting.

**UK Recommended:**
```json
[
  {
    "doc_type": "right_to_work",
    "title": "Right to Work",
    "requirement_level": "required",
    "collection_method": "upload",
    "expires_in_months": null
  },
  {
    "doc_type": "contract_terms",
    "title": "Contract of Employment",
    "requirement_level": "required",
    "collection_method": "upload",
    "expires_in_months": null
  },
  {
    "doc_type": "pay_records",
    "title": "Pay Records (Payslips)",
    "requirement_level": "required",
    "collection_method": "upload",
    "expires_in_months": null
  },
  {
    "doc_type": "working_time_holiday",
    "title": "Working Time & Holiday Records",
    "requirement_level": "required",
    "collection_method": "upload",
    "expires_in_months": 12
  }
]
```

**IE Recommended:**
```json
[
  {
    "doc_type": "payroll_records",
    "title": "Payroll Records",
    "requirement_level": "required",
    "collection_method": "upload",
    "expires_in_months": null
  },
  {
    "doc_type": "pps_payroll_id",
    "title": "PPS Number / Payroll ID",
    "requirement_level": "required",
    "collection_method": "reference",
    "expires_in_months": null
  },
  {
    "doc_type": "permission_to_work",
    "title": "Permission to Work (if non-EU)",
    "requirement_level": "conditional",
    "collection_method": "upload",
    "expires_in_months": 12
  },
  {
    "doc_type": "contract_terms",
    "title": "Contract of Employment",
    "requirement_level": "required",
    "collection_method": "upload",
    "expires_in_months": null
  },
  {
    "doc_type": "working_time_holiday",
    "title": "Working Time & Holiday Records",
    "requirement_level": "required",
    "collection_method": "upload",
    "expires_in_months": 12
  }
]
```

**US Recommended:**
```json
[
  {
    "doc_type": "i9",
    "title": "Form I-9 (Employment Eligibility)",
    "requirement_level": "required",
    "collection_method": "both",
    "expires_in_months": null
  },
  {
    "doc_type": "w4",
    "title": "Form W-4 (Tax Withholding)",
    "requirement_level": "required",
    "collection_method": "upload",
    "expires_in_months": null
  },
  {
    "doc_type": "payroll_wage_hour",
    "title": "Payroll & Wage-Hour Records",
    "requirement_level": "required",
    "collection_method": "upload",
    "expires_in_months": null
  }
]
```

---

## Admin UI

### Route
`/settings/compliance-documents`

### Features

1. **Country Tabs**
   - UK / IE / US tabs
   - Shows requirements for selected country

2. **Preset Selector**
   - Recommended (auto-seed defaults above)
   - Minimal (fewer docs)
   - Custom (manual configuration)

3. **Document Requirements List**
   - Enable/Disable toggle
   - Requirement level: Required / Conditional / Optional
   - Collection method: Upload / Reference / Both
   - Expiry months (optional)
   - Applies-to filters:
     - All staff (default)
     - Specific roles (multi-select)
     - Specific locations (multi-select)
   - Sort order (drag-and-drop or manual)

4. **Preview Panel**
   - "Preview staff view" button
   - Select role/location filters
   - Shows what staff in that role/location would see

5. **Responsive Design**
   - Desktop: Split-pane layout (list left, preview right)
   - Mobile: Accordions + sticky Save button

6. **State Management**
   - Real-time saving states: Idle / Saving / Saved / Error
   - Optimistic updates with rollback on error
   - No localStorage as source of truth (Supabase only)

### UI Components Structure

```
apps/web/app/(dashboard)/settings/compliance-documents/
  ├── page.tsx (main container)
  ├── components/
  │   ├── CountryTabs.tsx
  │   ├── PresetSelector.tsx
  │   ├── RequirementsList.tsx
  │   ├── RequirementCard.tsx
  │   ├── PreviewPanel.tsx
  │   └── SaveButton.tsx
```

---

## Staff UI

### Route
Keep existing `/compliance` route but rename sidebar label and header to:
**"Upload Compliance Documents"** or **"My Compliance Documents"**

### Features

1. **Progress Indicator**
   - Total required documents
   - Completed/Approved count
   - Progress bar: "3 of 5 required documents approved"
   - Logic: Count requirements where matching document.status = 'approved'

2. **Document Cards**
   - One card per applicable requirement (determined server-side)
   - Left join with documents: requirement without matching document = "Not uploaded"
   - Status badge: Not uploaded / Submitted / Approved / Rejected / Expired
   - Upload button (if not uploaded or rejected or expired)
   - View button (if uploaded) - fetches signed URL
   - Replace button (if rejected or expired)

3. **Submission Flow (Upload and/or Reference)**
   
   **For collection_method = 'upload':**
   - File picker (PDF, JPG, PNG, WEBP up to 5MB) - required
   - Client validates file size/type before upload
   - Upload progress bar
   - Server handles: validation, path generation, storage upload, DB insert
   
   **For collection_method = 'reference':**
   - No file picker (file not allowed)
   - Text input for reference number - required
   - Date picker for checked date - optional
   - Submit button (no upload, just data submission)
   - Server validates and creates DB row without file
   
   **For collection_method = 'both':**
   - File picker (PDF, JPG, PNG, WEBP up to 5MB) - required
   - Text input for reference number - optional
   - Date picker for checked date - optional
   - Upload progress bar
   - Server handles: file upload + reference data
   
   - Success confirmation with status badge update

4. **Status Details**
   - Not uploaded: "Upload required" + red badge
   - Submitted: "Submitted on [date], awaiting review" + yellow badge
   - Approved: "Approved on [date]" + green badge
   - Rejected: "Rejected on [date]: [reason]. Please upload a new document." + red badge
   - Expired: "Expired on [date]. Please upload a new document." + orange badge

5. **View Document Flow**
   - Client: Click "View" button
   - Client: POST `/api/compliance/documents/{id}/view`
   - Server: Verify access (RLS SELECT check)
   - Server: Generate signed URL (1 hour expiry)
   - Server: Return signed URL
   - Client: Open signed URL in new tab or iframe

6. **Responsive Design**
   - Mobile-first: stacked cards
   - Desktop: grid layout (2-3 columns)

### UI Components Structure

```
apps/web/app/(dashboard)/compliance/
  ├── page.tsx (main container)
  ├── components/
  │   ├── ProgressBar.tsx
  │   ├── DocumentCard.tsx
  │   ├── UploadModal.tsx (for upload/both methods)
  │   ├── ReferenceModal.tsx (for reference-only method)
  │   ├── StatusBadge.tsx
  │   └── FilePreview.tsx
```

---

## Admin Review UI

### Route
`/settings/compliance-documents/review` (or integrated into main settings page as a tab)

### Features

1. **Submissions List**
   - Table/List of all staff submissions
   - Filters:
     - Status: All / Submitted / Approved / Rejected
     - Doc type: All / [specific types]
     - Staff member: Search/select
   - Sort by: submission date, staff name, doc type

2. **Review Actions**
   - Approve button → sets status to 'approved', reviewed_by, reviewed_at
   - Reject button → modal to enter rejection reason → sets status to 'rejected'

3. **Document Preview**
   - Inline preview or download link
   - File metadata: name, size, upload date

### UI Components Structure

```
apps/web/app/(dashboard)/settings/compliance-documents/review/
  ├── page.tsx (main container)
  ├── components/
  │   ├── SubmissionsList.tsx
  │   ├── SubmissionRow.tsx
  │   ├── ReviewActions.tsx
  │   └── RejectModal.tsx
```

---

## API Routes

### Admin Routes

**`/api/settings/compliance-documents`**

- **GET**: Fetch all requirements for tenant + country
  - Query params: `country` (UK/IE/US)
  - Returns: `{ requirements: [...] }`

- **POST**: Create new requirement (admin only)
  - Body: requirement object
  - Returns: `{ requirement: {...} }`

**`/api/settings/compliance-documents/[id]`**

- **PUT**: Update requirement (admin only)
  - Body: partial requirement object
  - Returns: `{ requirement: {...} }`

- **DELETE**: Delete requirement (admin only)
  - Returns: `{ success: true }`

**`/api/settings/compliance-documents/seed`**

- **POST**: Auto-seed recommended defaults (admin only)
  - Body: `{ country: 'UK'|'IE'|'US' }`
  - Returns: `{ requirements: [...] }`

---

### Staff Routes

**`/api/compliance/documents`**

- **GET**: Fetch staff's applicable requirements + their uploaded documents
  - Auth: Required (auth.uid())
  - Process:
    1. Get tenant context (tenantId, role)
    2. Get user's staff record (location_id)
    3. Query requirements filtered by applicability (role + location)
    4. Query user's documents (LEFT JOIN)
    5. Compute status (check for expired)
  - Returns: 
    ```json
    {
      "requirements": [
        {
          "id": "...",
          "doc_type": "right_to_work",
          "title": "Right to Work",
          "requirement_level": "required",
          "collection_method": "upload",
          "expires_in_months": 12,
          "document": {
            "id": "...",
            "status": "approved",
            "submitted_at": "...",
            "file_name": "...",
            "expires_at": "..."
          } | null
        }
      ]
    }
    ```

**`/api/compliance/upload`**

- **POST**: Upload file and/or submit reference data
  - Auth: Required (auth.uid())
  - Body: FormData or JSON
    - `file`: File (optional for reference-only, max 5MB, PDF/JPG/PNG/WEBP)
    - `requirementId`: UUID (required)
    - `docType`: string (required)
    - `referenceNumber`: string (optional, required for reference-only)
    - `checkedDate`: ISO date string (optional)
  - Server Process:
    1. Validate auth + tenant membership
    2. Fetch requirement to determine collection_method
    3. Validate submission matches collection_method:
       - `upload`: file required, reference optional
       - `reference`: reference_number required, file not allowed
       - `both`: file required, reference optional
    4. If file provided:
       - Validate file size (≤ 5MB)
       - Validate file MIME type
       - Validate file extension
       - Check rate limit (10 per 10 min per user)
    5. Check if replacing existing document (by tenant_id, user_id, doc_type)
       - If exists: DELETE old row + old file from storage
    6. If file provided:
       - Generate storage path: `{tenantId}/{userId}/{docType}/{yyyy-mm}/{uuid}.{ext}`
       - Upload file to Supabase Storage (using client session)
    7. Calculate expires_at: submitted_at + requirement.expires_in_months
    8. INSERT staff_compliance_documents row:
       - status='submitted'
       - File fields if file uploaded
       - Reference fields if provided
  - Returns: 
    ```json
    {
      "document": {
        "id": "...",
        "status": "submitted",
        "storage_path": "..." | null,
        "file_name": "..." | null,
        "reference_number": "..." | null,
        "checked_date": "..." | null,
        "submitted_at": "...",
        "expires_at": "..." | null
      }
    }
    ```
  - Error Codes:
    - 400: Invalid submission (missing required file/reference, or collection_method mismatch)
    - 401: Not authenticated
    - 403: Not authorized
    - 413: File too large
    - 429: Rate limit exceeded

**`/api/compliance/documents/[id]`**

- **DELETE**: Delete document + file (staff own or admin)
  - Auth: Required (auth.uid())
  - Process:
    1. Fetch document row (with RLS - ensures own or admin)
    2. If not found: 404
    3. Delete file from Supabase Storage
    4. Delete staff_compliance_documents row
  - Returns: `{ success: true }`
  - Error Codes:
    - 401: Not authenticated
    - 403: Not authorized
    - 404: Document not found

**`/api/compliance/documents/[id]/view`**

- **GET**: Generate signed URL for viewing/downloading file
  - Auth: Required (auth.uid())
  - Process:
    1. Fetch document row (with RLS - ensures own or admin)
    2. If not found: 404
    3. If storage_path is NULL (reference-only): 400 error
    4. Generate signed URL: `supabase.storage.from('compliance-documents').createSignedUrl(storage_path, 3600)`
    5. Return signed URL
  - Returns:
    ```json
    {
      "signedUrl": "https://...",
      "expiresAt": "2025-12-17T15:30:00Z"
    }
    ```
  - Error Codes:
    - 400: No file attached (reference-only document)
    - 401: Not authenticated
    - 403: Not authorized
    - 404: Document not found

**`/api/compliance/documents/[id]/reference`**

- **PATCH**: Update reference metadata only (staff correction for typos, etc.)
  - Auth: Required (auth.uid())
  - **Uses:** Anon key + RLS (no service role key)
  - **RLS Policy:** `documents_update_own_reference_metadata` (narrow exception for staff)
  - Body:
    ```json
    {
      "reference_number": "string (optional)",
      "checked_date": "ISO date string (optional)"
    }
    ```
  - Server Process:
    1. Validate: user authenticated, has tenant membership
    2. Build UPDATE query for ONLY these columns: reference_number, checked_date
    3. Execute via Supabase client (anon key + auth session)
    4. RLS policy enforces: own document, status='submitted', active membership
    5. Server never touches: status, file fields, admin fields (security by design)
  - Returns:
    ```json
    {
      "document": {
        "id": "...",
        "reference_number": "...",
        "checked_date": "..."
      }
    }
    ```
  - Error Codes:
    - 400: No fields to update or validation error
    - 401: Not authenticated
    - 403: Not your document OR status != 'submitted' (blocked by RLS)
    - 404: Document not found
  
  **Security Architecture:**
  - Uses narrow RLS UPDATE policy (only staff on own submitted documents)
  - Server constructs UPDATE to touch only reference_number, checked_date
  - Even if client modifies request, RLS + server code prevent unauthorized changes
  - No service role key needed (uses anon key + RLS like all other operations)

---

### Admin Review Routes

**`/api/compliance/review`**

- **GET**: Fetch all submissions for tenant (admin only)
  - Query params: `status`, `docType`, `staffId`
  - Returns: `{ submissions: [...] }`

**`/api/compliance/review/[id]/approve`**

- **POST**: Approve document (admin only)
  - Auth: Required (auth.uid() + admin role)
  - Body: `{}` (empty)
  - Server Process:
    1. Verify user has admin role in tenant
    2. Fetch document row (with RLS)
    3. If status != 'submitted': 400 error
    4. Fetch requirement to get expires_in_months
    5. Calculate new expires_at: `reviewed_at + expires_in_months MONTHS` (or NULL)
    6. UPDATE:
       - status = 'approved'
       - reviewed_by = auth.uid()
       - reviewed_at = NOW()
       - expires_at = calculated value
  - Returns: 
    ```json
    {
      "document": {
        "id": "...",
        "status": "approved",
        "reviewed_by": "...",
        "reviewed_at": "...",
        "expires_at": "..." | null
      }
    }
    ```
  - Error Codes:
    - 400: Invalid status transition
    - 401: Not authenticated
    - 403: Not admin
    - 404: Document not found

**`/api/compliance/review/[id]/reject`**

- **POST**: Reject document (admin only)
  - Auth: Required (auth.uid() + admin role)
  - Body: 
    ```json
    {
      "reason": "string (required, min 10 chars)"
    }
    ```
  - Server Process:
    1. Verify user has admin role in tenant
    2. Validate reason (required, min 10 chars)
    3. Fetch document row (with RLS)
    4. If status != 'submitted': 400 error
    5. UPDATE:
       - status = 'rejected'
       - rejection_reason = reason
       - reviewed_by = auth.uid()
       - reviewed_at = NOW()
  - Returns: 
    ```json
    {
      "document": {
        "id": "...",
        "status": "rejected",
        "rejection_reason": "...",
        "reviewed_by": "...",
        "reviewed_at": "..."
      }
    }
    ```
  - Error Codes:
    - 400: Missing/invalid reason or invalid status transition
    - 401: Not authenticated
    - 403: Not admin
    - 404: Document not found

---

**Note:** Admins use the same staff endpoints above for viewing documents and downloading files. RLS policies allow admins to access all tenant documents.

---

## Implementation Steps

### Phase 1: Database Setup ✅

1. ✅ Create migration: `tenant_compliance_requirements` table
2. ✅ Create migration: `staff_compliance_documents` table
3. ✅ Create migration: RLS policies for both tables
4. ✅ Create migration: Storage bucket + policies
5. ✅ Apply migrations: `supabase migration up`
6. ✅ Verify in Supabase Dashboard: tables, RLS, storage

### Phase 2: Admin UI 🔧

1. Create route: `/settings/compliance-documents/page.tsx`
2. Build components:
   - CountryTabs
   - PresetSelector
   - RequirementsList
   - RequirementCard
   - PreviewPanel
3. Implement API routes:
   - GET/POST `/api/settings/compliance-documents`
   - PUT/DELETE `/api/settings/compliance-documents/[id]`
   - POST `/api/settings/compliance-documents/seed`
4. Wire up frontend → API → Supabase
5. Test: Create/update/delete requirements

### Phase 3: Staff UI 🔧

1. Update route: `/compliance/page.tsx` (rename label)
2. Build components:
   - ProgressBar
   - DocumentCard
   - UploadModal
   - StatusBadge
3. Implement API routes:
   - GET/POST `/api/compliance/documents`
   - POST `/api/compliance/upload`
   - DELETE `/api/compliance/documents/[id]`
4. Wire up upload flow:
   - File picker → upload to Supabase Storage
   - Create/update document record
5. Test: Upload, view, replace documents

### Phase 4: Admin Review 🔧

1. Create route: `/settings/compliance-documents/review/page.tsx`
2. Build components:
   - SubmissionsList
   - ReviewActions
   - RejectModal
3. Implement API routes:
   - GET `/api/compliance/review`
   - POST `/api/compliance/review/[id]/approve`
   - POST `/api/compliance/review/[id]/reject`
4. Wire up review flow
5. Test: Approve/reject submissions

### Phase 5: Testing & Polish 🧪

1. Run typecheck: `npm run build --dry-run` (or repo's command)
2. Run lint: `npm run lint` + fix errors
3. Manual testing:
   - Admin: configure requirements (UK/IE/US)
   - Staff: upload documents
   - Admin: approve/reject
   - Verify RLS: staff can't see other staff's docs
   - Verify storage: files protected by path
4. Edge cases:
   - Expired documents
   - Rejected + replace flow
   - Role/location filtering

### Phase 6: Commit & Push 📦

1. Stage all changes: `git add .`
2. Commit: `git commit -m "feat: compliance documents (admin config + staff uploads)"`
3. Push: `git push origin [current-branch]`

---

## File Structure

```
hr-and-staff/
├── supabase/
│   └── migrations/
│       ├── 20251217120000_compliance_requirements_table.sql
│       ├── 20251217120001_compliance_documents_table.sql
│       ├── 20251217120002_compliance_rls_policies.sql
│       └── 20251217120003_compliance_storage_setup.sql
│
├── apps/web/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── compliance/
│   │   │   │   ├── page.tsx (staff UI - renamed)
│   │   │   │   └── components/
│   │   │   │       ├── ProgressBar.tsx
│   │   │   │       ├── DocumentCard.tsx
│   │   │   │       ├── UploadModal.tsx
│   │   │   │       ├── StatusBadge.tsx
│   │   │   │       └── FilePreview.tsx
│   │   │   │
│   │   │   └── settings/
│   │   │       └── compliance-documents/
│   │   │           ├── page.tsx (admin config UI)
│   │   │           ├── review/
│   │   │           │   └── page.tsx (admin review UI)
│   │   │           └── components/
│   │   │               ├── CountryTabs.tsx
│   │   │               ├── PresetSelector.tsx
│   │   │               ├── RequirementsList.tsx
│   │   │               ├── RequirementCard.tsx
│   │   │               ├── PreviewPanel.tsx
│   │   │               ├── SubmissionsList.tsx
│   │   │               ├── ReviewActions.tsx
│   │   │               └── RejectModal.tsx
│   │   │
│   │   └── api/
│   │       ├── settings/
│   │       │   └── compliance-documents/
│   │       │       ├── route.ts (GET/POST)
│   │       │       ├── [id]/
│   │       │       │   └── route.ts (PUT/DELETE)
│   │       │       └── seed/
│   │       │           └── route.ts (POST)
│   │       │
│   │       └── compliance/
│   │           ├── documents/
│   │           │   ├── route.ts (GET/POST)
│   │           │   └── [id]/
│   │           │       ├── route.ts (DELETE)
│   │           │       ├── view/
│   │           │       │   └── route.ts (GET - signed URL)
│   │           │       └── reference/
│   │           │           └── route.ts (PATCH - update ref data)
│   │           ├── upload/
│   │           │   └── route.ts (POST)
│   │           └── review/
│   │               ├── route.ts (GET)
│   │               └── [id]/
│   │                   ├── approve/
│   │                   │   └── route.ts (POST)
│   │                   └── reject/
│   │                       └── route.ts (POST)
│   │
│   └── lib/
│       └── compliance/
│           ├── types.ts (TypeScript interfaces)
│           └── seed-defaults.ts (UK/IE/US defaults)
│
└── COMPLIANCE_SYSTEM_BUILD_PLAN.md (this file)
```

---

## TypeScript Interfaces

```typescript
// lib/compliance/types.ts

export type CountryCode = 'UK' | 'IE' | 'US'
export type RequirementLevel = 'required' | 'conditional' | 'optional'
export type CollectionMethod = 'upload' | 'reference' | 'both'

// Database status (stored in database)
// No 'expired' - expired is computed, not stored
// No 'not_uploaded' - absence of row = not uploaded
export type DocumentStatus = 'submitted' | 'approved' | 'rejected'

// UI computed status (includes computed statuses)
export type DocumentStatusUI = DocumentStatus | 'expired' | 'not_uploaded'

export interface TenantComplianceRequirement {
  id: string
  tenant_id: string
  country_code: CountryCode
  doc_type: string
  title: string
  requirement_level: RequirementLevel
  collection_method: CollectionMethod
  expires_in_months: number | null
  applies_to_all: boolean
  role_ids: string[] | null
  location_ids: string[] | null
  is_enabled: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface StaffComplianceDocument {
  id: string
  tenant_id: string
  user_id: string
  requirement_id: string | null
  doc_type: string
  status: DocumentStatus // Only contains database-stored statuses: submitted | approved | rejected
  storage_bucket: string
  storage_path: string | null // Nullable for reference-only submissions
  file_name: string | null // Nullable for reference-only submissions
  file_mime: string | null // Nullable for reference-only submissions
  file_size: number | null // Nullable for reference-only submissions
  reference_number: string | null
  checked_date: string | null
  expires_at: string | null
  rejection_reason: string | null
  submitted_at: string // NOT NULL in database
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

// Type guard to check if document has a file
export function hasFile(doc: StaffComplianceDocument): boolean {
  return doc.storage_path !== null && doc.file_name !== null
}

// Type guard to check if document has reference data
export function hasReference(doc: StaffComplianceDocument): boolean {
  return doc.reference_number !== null
}

// Client-side joined type for UI
export interface RequirementWithDocument {
  requirement: TenantComplianceRequirement
  document: StaffComplianceDocument | null // null = not uploaded
  computedStatus: DocumentStatusUI // Includes expiry check
}

// Helper to compute UI status
export function computeDocumentStatus(doc: StaffComplianceDocument | null): DocumentStatusUI {
  if (!doc) return 'not_uploaded'
  
  // Check if expired
  if (doc.status === 'approved' && doc.expires_at) {
    const expiryDate = new Date(doc.expires_at)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (expiryDate < today) {
      return 'expired'
    }
  }
  
  return doc.status
}
```

---

## Testing Checklist

### Admin UI Tests
- [ ] Load page → see empty state or existing requirements
- [ ] Switch country tabs → see correct requirements
- [ ] Click preset → auto-populate requirements
- [ ] Enable/disable requirement → saves correctly
- [ ] Change requirement level → saves correctly
- [ ] Change collection method → saves correctly
- [ ] Set expiry months → saves correctly
- [ ] Set role/location filters → saves correctly
- [ ] Delete requirement → removes from DB
- [ ] Preview panel → shows filtered requirements

### Staff UI Tests
- [ ] Load page → see applicable requirements (role/location filtered)
- [ ] Requirements without documents show "Not uploaded" status
- [ ] Progress bar → shows correct count (approved / total required)
- [ ] Upload document (upload method) → file saved, status=submitted, row created
- [ ] Enter reference (reference method) → data saved, status=submitted
- [ ] View uploaded document → signed URL generated, file accessible
- [ ] Replace rejected document → old file deleted, old row deleted, new file uploaded, new row created
- [ ] Replace expired document → same as rejected flow
- [ ] Can't see other staff's documents (RLS enforced)
- [ ] Can't upload to other user's storage path (Storage RLS enforced)
- [ ] File validation: reject files > 5MB
- [ ] File validation: reject invalid MIME types
- [ ] Rate limit: 11th upload in 10 min rejected with 429
- [ ] PATCH reference metadata: works when status=submitted
- [ ] PATCH reference metadata: blocked when status=approved/rejected (403)
- [ ] PATCH reference metadata: only updates reference fields, never touches status/file fields

### Admin Review Tests
- [ ] Load review page → see all submissions
- [ ] Filter by status → works
- [ ] Filter by doc type → works
- [ ] Approve document → status=approved, reviewed_by set
- [ ] Reject document → status=rejected, rejection_reason set
- [ ] Staff sees rejection reason

### Security Tests
- [ ] Staff can't access admin routes (403 Forbidden)
- [ ] Staff can't read other staff's documents (RLS blocks SELECT)
- [ ] Staff can't upload to other user's storage path (Storage RLS blocks INSERT)
- [ ] Staff can UPDATE only reference metadata via PATCH endpoint (narrow RLS policy tested)
- [ ] Staff can't set admin-controlled fields (reviewed_by, status=approved)
- [ ] Staff can't approve/reject documents (403 on admin endpoints)
- [ ] Admins can view all tenant documents
- [ ] Admins can approve/reject any tenant document
- [ ] Anon users can't access any endpoints (401 Unauthorized)
- [ ] Service role key not exposed in web client bundle (grep/scan)
- [ ] Service role key not exposed in mobile client bundle (grep/scan)
- [ ] Service role key NOT used in server code (this feature uses RLS only)
- [ ] Signed URLs expire after 1 hour (test with old URL)
- [ ] Storage paths are server-generated (code review confirms)
- [ ] File uploads respect rate limits (11th upload blocked)

### Edge Cases & Error Scenarios
- [ ] Upload with no file attached → 400 error
- [ ] Upload file > 5MB → 413 error
- [ ] Upload invalid MIME type (e.g., .exe) → 400 error
- [ ] Upload with tampered requirementId → 404 or 403
- [ ] Replace document that doesn't exist → creates new
- [ ] Delete document that's already deleted → 404
- [ ] Approve document that's not 'submitted' → 400
- [ ] Reject without reason → 400
- [ ] Reject with reason < 10 chars → 400
- [ ] View document from different tenant → 403
- [ ] Expired document computed correctly (real-time)
- [ ] Requirement deleted → document.requirement_id = NULL (still viewable)
- [ ] User deleted → documents deleted (cascade)
- [ ] Tenant deleted → all requirements + documents deleted (cascade)
- [ ] Duplicate upload (same requirement) → UPSERT or reject
- [ ] Network error during upload → graceful retry or error message
- [ ] Storage full/quota exceeded → graceful error message

---

## Acceptance Criteria

### Must Have ✅
- [x] Two separate UIs: Admin + Staff
- [x] Full Supabase integration: Storage + Postgres
- [x] RLS policies for secure tenant isolation
- [x] Storage policies for file protection
- [x] Migrations for all schema changes
- [x] Auto-seed defaults for UK/IE/US
- [x] Upload + approval flow
- [x] No service role key in client code

### Nice to Have 🎯
- [ ] Drag-and-drop file upload
- [ ] Image preview in modal
- [ ] Email notifications on approval/rejection
- [ ] Expiry reminders (via worker/cron)
- [ ] Bulk approve/reject
- [ ] Export compliance report (CSV/PDF)

---

## Deliverables

1. ✅ Database migrations (4 files)
2. ✅ Admin UI route + components
3. ✅ Staff UI route + components (renamed)
4. ✅ Admin review UI route + components
5. ✅ API routes (12 endpoints: 4 admin, 5 staff, 3 review)
6. ✅ Storage bucket + policies
7. ✅ TypeScript types
8. ✅ Seed defaults (UK/IE/US)
9. ✅ Passing typecheck/lint
10. ✅ Git commit + push

---

## Timeline Estimate

- **Phase 1 (Database):** 30-45 min
- **Phase 2 (Admin UI):** 60-90 min
- **Phase 3 (Staff UI):** 60-90 min
- **Phase 4 (Admin Review):** 30-45 min
- **Phase 5 (Testing):** 30-45 min
- **Phase 6 (Commit):** 5-10 min

**Total:** ~4-6 hours

---

## Production Safeguards

### Database Safeguards

1. ✅ **Updated_at Triggers**
   - Both tables have automatic `updated_at` timestamp updates
   - Uses existing `update_updated_at_column()` function

2. ✅ **Uniqueness Constraints**
  - `tenant_compliance_requirements`: `UNIQUE (tenant_id, country_code, doc_type)`
  - `staff_compliance_documents`: `UNIQUE (tenant_id, user_id, doc_type)`
  - Prevents duplicate requirements and documents (even when requirement_id is NULL)

3. ✅ **Deterministic Ordering**
   - `tenant_compliance_requirements.sort_order` column
   - Indexed for efficient sorting
   - UI allows drag-and-drop reordering

4. ✅ **Foreign Key Cascades**
   - tenant_id: ON DELETE CASCADE (tenant deletion removes all requirements + documents)
   - user_id: ON DELETE CASCADE (user deletion removes their documents)
   - requirement_id: ON DELETE SET NULL (requirement deletion doesn't delete documents)
   - reviewed_by: No cascade (preserves audit trail)

5. ✅ **NOT NULL Constraints**
   - All uploaded documents must have: storage_path, file_name, file_mime, file_size, submitted_at
   - Enforces data integrity

### Storage Safeguards

1. ✅ **Membership Required for ALL Access**
   - All storage policies check for active membership in tenant
   - Path-based isolation enforced (user can only access own folder)
   - Admin access requires active admin role in tenant

2. ✅ **RLS on Storage Objects**
   - 4 policies: SELECT, INSERT, UPDATE, DELETE
   - Each validates membership + path ownership
   - No public access to compliance-documents bucket

3. ✅ **Path Validation**
   - Storage policies use `storage.foldername(name)` to extract path components
   - Verify: `(foldername)[1] = tenantId` AND `(foldername)[2] = userId`
   - Reject paths that don't match pattern

### API Safeguards

1. ✅ **Service Role Key Never Exposed**
   - Not used in this feature at all
   - All operations use anon key + RLS
   - Web + mobile clients use same security model

2. ✅ **Rate Limiting**
   - POST `/api/compliance/upload`: 10 requests per 10 minutes per user
   - Prevents abuse and storage flooding
   - Implemented with IP + user ID composite key

3. ✅ **File Validation**
   - Server-side only (client validation is UX, not security)
   - MIME type whitelist: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`
   - File size limit: 5MB (5,242,880 bytes)
   - Extension validation: `.pdf`, `.jpg`, `.jpeg`, `.png`, `.webp`

4. ✅ **Input Sanitization**
   - File names sanitized before storage
   - Rejection reasons sanitized (prevent XSS)
   - Doc types validated against known list

5. ✅ **Authorization Checks**
   - Every API route verifies tenant membership
   - Admin routes verify admin role
   - Staff routes verify own-resource access
   - Use existing `getTenantContext()` and `verifyTenantAccess()` helpers

### Audit & Monitoring

1. ✅ **Audit Trail**
   - `reviewed_by` and `reviewed_at` track who approved/rejected
   - `submitted_at` tracks when document was uploaded
   - `created_at` and `updated_at` track record lifecycle

2. ✅ **Error Logging**
   - All API errors logged server-side with context
   - Include: user ID, tenant ID, operation, error message
   - Never log sensitive data (file contents, keys)

3. ✅ **Metrics to Track**
   - Upload success/failure rate
   - Average review time (submitted_at → reviewed_at)
   - Expiry rate (how many documents expire)
   - Storage usage per tenant

---

## Production Readiness Checklist

### Before Deployment

#### Database

- [ ] All migrations applied successfully
- [ ] RLS enabled on both tables
- [ ] RLS policies tested as staff user
- [ ] RLS policies tested as admin user
- [ ] Storage bucket created (`compliance-documents`)
- [ ] Storage policies applied and tested
- [ ] Indexes created and analyzed
- [ ] Uniqueness constraints verified
- [ ] Triggers tested (updated_at auto-updates)

#### Security

- [ ] Service role key NOT used in any client code
- [ ] Service role key NOT used in any server code (feature uses RLS only)
- [ ] Web build scanned for exposed secrets
- [ ] Mobile build scanned for exposed secrets
- [ ] Storage paths are server-generated (verified in code review)
- [ ] File validation enforced server-side
- [ ] Rate limiting implemented and tested
- [ ] Signed URLs expire after 1 hour
- [ ] Staff cannot update admin-controlled fields (tested)
- [ ] Staff cannot see other staff's documents (tested)

#### Functionality

- [ ] Admin can create/update/delete requirements
- [ ] Admin can seed recommended defaults (UK/IE/US)
- [ ] Staff can view applicable requirements only
- [ ] Staff can upload documents (all collection methods)
- [ ] Staff can replace rejected/expired documents
- [ ] Staff can view their own documents (signed URLs)
- [ ] Admin can view all submissions
- [ ] Admin can approve documents
- [ ] Admin can reject documents with reason
- [ ] Expiry calculation correct (on submit + on approval)
- [ ] Expired documents marked correctly (computed status)
- [ ] Role/location filtering works correctly
- [ ] Preview panel shows correct requirements

#### Testing

- [ ] Unit tests for file validation logic
- [ ] Unit tests for expiry calculation
- [ ] Unit tests for applicability filtering
- [ ] Integration tests for upload flow
- [ ] Integration tests for approval/rejection flow
- [ ] Integration tests for file replacement
- [ ] E2E tests for admin workflow
- [ ] E2E tests for staff workflow
- [ ] RLS policy tests (staff isolation)
- [ ] RLS policy tests (admin access)
- [ ] Storage policy tests (own files only)
- [ ] Storage policy tests (admin access)

#### Performance

- [ ] Queries use indexes (EXPLAIN ANALYZE run)
- [ ] No N+1 queries in list views
- [ ] File uploads stream (don't load into memory)
- [ ] Signed URLs cached client-side (1 hour)
- [ ] Large file uploads show progress
- [ ] Optimistic UI updates implemented

#### Error Handling

- [ ] All API routes return proper HTTP status codes
- [ ] User-friendly error messages (no stack traces exposed)
- [ ] File upload errors handled gracefully
- [ ] Storage errors handled gracefully
- [ ] Database errors handled gracefully
- [ ] Network errors handled gracefully
- [ ] Rate limit errors show clear message

#### Mobile Support

- [ ] Same API routes work for web + mobile
- [ ] Same RLS policies work for web + mobile
- [ ] Mobile file picker integration works
- [ ] Mobile file upload shows progress
- [ ] Mobile signed URLs open correctly
- [ ] Mobile UI responsive and tested

#### Documentation

- [ ] API routes documented (this file)
- [ ] Database schema documented (this file)
- [ ] RLS policies documented (this file)
- [ ] File handling flow documented (this file)
- [ ] Status transitions documented (this file)
- [ ] Admin user guide created (optional)
- [ ] Staff user guide created (optional)

#### Code Quality

- [ ] TypeScript: No type errors (`npm run build`)
- [ ] Linting: No lint errors (`npm run lint`)
- [ ] Formatting: Code formatted (`prettier`)
- [ ] No console.log in production code
- [ ] No TODO/FIXME comments unresolved
- [ ] Code reviewed by another developer
- [ ] Security review completed

#### Deployment

- [ ] Environment variables set (Vercel/hosting)
- [ ] Database migrations run on production
- [ ] Storage bucket created on production
- [ ] Storage policies applied on production
- [ ] Rollback plan documented
- [ ] Monitoring/alerting configured
- [ ] Error tracking configured (Sentry, etc.)

---

## Notes

- Use existing component patterns (`PageHeader`, `StatCard`, `SectionCard`)
- Follow existing API route patterns (`getTenantContext`, role checks)
- Reuse existing helper functions (`user_has_membership`, `user_has_role_in_tenant`)
- Match existing UI styling (Tailwind classes)
- Keep code DRY (extract common logic to utility functions)

---

---

## Spec Fixes Applied (Final Update)

This section documents the contradictions resolved to make the spec 100% consistent and build-ready:

### 1. ✅ Fixed Reference Collection Method vs NOT NULL File Columns

**Problem:** Schema had `storage_path`, `file_name`, etc. as NOT NULL, making reference-only submissions impossible.

**Solution:**
- Made file fields nullable (`storage_path`, `file_name`, `file_mime`, `file_size`)
- Added CHECK constraints to enforce submission type integrity:
  - `check_submission_type`: Must have file OR reference (or both)
  - `check_file_fields_complete`: If any file field set, all must be set
- Documented clear rules for each collection_method:
  - `upload`: file required
  - `reference`: reference_number required, file not allowed
  - `both`: file required, reference optional
- Updated API routes to validate submission matches collection_method
- Updated Staff UI flow to support reference-only submissions (no file picker)

### 2. ✅ Made User Identity / FK Model Unambiguous

**Problem:** Spec said `auth.uid()` is canonical but didn't clarify relationship with profiles table.

**Solution:**
- Explicitly documented: `profiles.id = auth.users.id` (strict 1:1 relationship)
- Clarified profiles table is created via trigger on auth.users insert
- Kept foreign keys to `profiles(id)` (matches existing schema pattern)
- Confirmed: All RLS policies use `auth.uid()` (which equals `profiles.id`)
- Added migration enforcement example showing FK to auth.users(id)

### 3. ✅ Fixed Uniqueness Constraint for NULL requirement_id

**Problem:** `UNIQUE (tenant_id, user_id, requirement_id, doc_type)` allows duplicates when requirement_id is NULL.

**Solution:**
- Changed to: `UNIQUE (tenant_id, user_id, doc_type)`
- Enforces one current document per user per doc type (regardless of requirement_id)
- Updated replacement flow to use this key for UPSERT or DELETE+INSERT
- Prevents duplicates in all scenarios

### 4. ✅ Hardened Storage SELECT Policy

**Problem:** "Own files" access didn't explicitly require active membership.

**Solution:**
- Updated all storage policies (SELECT, INSERT, UPDATE, DELETE)
- Now ALL access requires: `EXISTS (SELECT 1 FROM memberships WHERE user_id = auth.uid() AND tenant_id = folder[1] AND status = 'active')`
- Even for "own files", user must have active membership in tenant
- Prevents cross-tenant access and ensures revoked users lose access immediately

### 5. ✅ Declared Canonical Expiry Approach

**Problem:** Spec described both computed expiry and scheduled job without stating which is authoritative.

**Solution:**
- **Canonical:** Computed expiry in queries (real-time check: `expires_at < CURRENT_DATE`)
- **Optional:** Scheduled job only for cleanup/notifications (NOT required for correctness)
- Updated status transition table: "expired" is computed by system, not set by cron
- System works correctly even if cron jobs fail (relies on computed status)

### 6. ✅ Added Safe Reference Metadata Correction

**Problem:** Staff couldn't correct typos in reference data without re-uploading.

**Solution:**
- Added: `PATCH /api/compliance/documents/[id]/reference` endpoint
- Allows updating only `reference_number` and `checked_date`
- Only when `status = 'submitted'` (before review)
- Server-validated, controlled endpoint (preserves "no staff UPDATE" rule)
- Never touches admin fields or file fields

---

## Spec Fixes Applied (Final Hardening Pass)

This section documents the final contradictions resolved to make the spec 100% consistent and implementable without service role key:

### 7. ✅ Made "Expired" Treatment Consistent

**Problem:** Spec was ambiguous about whether 'expired' is stored in database or computed.

**Solution:**
- **Database status:** Only stores `'submitted' | 'approved' | 'rejected'`
- **Computed status:** UI/API computes 'expired' when `status='approved' AND expires_at < CURRENT_DATE`
- **CHECK constraint:** Removed 'expired' from allowed values
- **Status transition table:** Updated to show 'expired' is computed, not stored
- **Cron job:** Clarified as optional for notifications only (does NOT update database status)
- **Future optimization:** Noted optional cache column for performance (but computed status remains canonical)

### 8. ✅ Fixed PATCH Reference Endpoint to Work with RLS (No Service Role)

**Problem:** Staff had no UPDATE RLS policy, so PATCH endpoint couldn't work without service role key.

**Solution:**
- Added narrow RLS UPDATE policy: `documents_update_own_reference_metadata`
- Allows staff to UPDATE only when:
  - Own document (`user_id = auth.uid()`)
  - Status is 'submitted' (before review)
  - Active membership in tenant
- Server enforces: ONLY `reference_number` and `checked_date` columns touched
- Uses anon key + RLS (no service role key needed)
- Updated Staff Operations Flow table: Changed "Update metadata ❌ Not allowed" to "✅ Allowed via PATCH endpoint"

### 9. ✅ Clarified Collection Method Enforcement

**Problem:** Spec wasn't clear where collection_method rules are enforced (DB vs API).

**Solution:**
- **Database CHECK constraints:** Generic (ensure something submitted, file fields atomic)
- **API-level enforcement:** POST `/api/compliance/upload` validates submission matches requirement's collection_method
- **Added note in schema:** Explains why DB doesn't enforce method-specific rules:
  - collection_method is in different table (tenant_compliance_requirements)
  - Requirements can change after submission
  - API provides better error messages
- **Added code example:** Shows validation logic in API layer

### 10. ✅ Updated TypeScript Types for Status Model

**Problem:** TypeScript types weren't consistent with new status model.

**Solution:**
- `DocumentStatus`: Only includes `'submitted' | 'approved' | 'rejected'` (database-stored values)
- `DocumentStatusUI`: Includes `'submitted' | 'approved' | 'rejected' | 'expired' | 'not_uploaded'` (computed for UI)
- Clarified comments: 'expired' is computed, not stored; 'not_uploaded' is absence of row
- Verified `/view` endpoint returns 400 for NULL storage_path (reference-only documents)

---

## Final Approval

**This specification is approved and safe to build against.**

All design decisions have been finalized and contradictions resolved:
- ✅ Data model is unambiguous (`auth.uid()` is canonical, profiles.id = auth.users.id)
- ✅ Staff permissions locked down (narrow RLS UPDATE exception for reference metadata only)
- ✅ Reference metadata correction enabled (via dedicated PATCH endpoint with RLS)
- ✅ "Not uploaded" model decided (no row = not uploaded)
- ✅ "Expired" treatment consistent (computed, never stored in database)
- ✅ Submission types supported (upload, reference, both) with CHECK constraints
- ✅ Collection method enforcement clarified (API-level validation, not database)
- ✅ Uniqueness enforced correctly (even with NULL requirement_id)
- ✅ File handling secure (server-generated paths, validation, signed URLs)
- ✅ Storage access hardened (membership required for ALL access, including own files)
- ✅ Expiry logic canonical (computed in queries, cron for notifications only)
- ✅ Role/location applicability rule defined (OR logic, server-side)
- ✅ Production safeguards documented
- ✅ Service role key NOT used in this feature (all operations use anon key + RLS)
- ✅ TypeScript types consistent with status model
- ✅ Compatible with web + Expo clients (same RLS policies, same anon key)
- ✅ Comprehensive testing checklist provided

**Ready to implement. No further clarifications needed. Spec is internally consistent and fully implementable.**

