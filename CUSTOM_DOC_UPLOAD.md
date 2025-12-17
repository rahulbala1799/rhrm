# Custom Compliance Documents (Admin-Defined Requirements)

## Feature Overview

**Custom Compliance Documents** allow tenant administrators to create custom compliance requirements that are scoped to their tenant. These requirements appear in the staff compliance document list alongside standard system-defined requirements (e.g., "Right to Work", "DBS Check").

Staff members must submit custom compliance documents exactly as they would any other requirement. The feature behaves identically to standard requirements in terms of:

- Status flow (not uploaded → submitted → approved/rejected → expired)
- Review flow (admin approval/rejection)
- Expiry computation (based on months configured)
- Row-Level Security (RLS) enforcement
- Storage security (private bucket, signed URLs, tenant isolation)

**Goal**: Enable admins to define tenant-specific compliance needs without requiring system-level changes, while maintaining the same security posture and user experience as built-in requirements.

---

## Supported File Types

Custom compliance documents may be submitted in the following formats:

### Allowed File Types

- **Images**: `.jpg`, `.jpeg`, `.png`, `.webp`
- **PDF**: `.pdf`
- **Word Documents**: `.doc`, `.docx`

### File Validation Rules

**Server-side validation is MANDATORY:**

- MIME types must be allowlisted on the server to match the above extensions
- File size limits are enforced server-side (5MB max = 5,242,880 bytes)
- The server determines the storage path; the client never supplies it
- File extension and MIME type must match expected patterns

**Client-side validation:**

- Provided for UX only
- Never treated as a security boundary
- Shows friendly error messages before upload attempt

**Storage Security:**

- The `compliance-documents` bucket remains **private**
- Signed URLs are generated server-side with 1-hour expiration
- Staff can only access their own documents
- Admins can access all tenant documents
- No public access is ever granted

---

## No Schema Changes, No Contradictions

This feature **does not introduce new tables or columns**. It uses the existing schema:

### Existing Tables Used

**`tenant_compliance_requirements`**
- Stores both standard and custom compliance requirements
- Custom requirements are distinguished by their `doc_type` value (naming convention only, not a schema flag)
- Fields used: `tenant_id`, `doc_type`, `title`, `requirement_level`, `collection_method`, `expires_in_months`, `role_ids`, `location_ids`, `applies_to_all`, `is_enabled`, `created_at`, `updated_at`

**`staff_compliance_documents`**
- Stores all staff document submissions (standard and custom)
- Uses existing uniqueness constraint: `UNIQUE (tenant_id, user_id, doc_type)`
- Fields used: `tenant_id`, `user_id`, `doc_type`, `status`, `storage_path`, `file_name`, `file_mime`, `file_size`, `reference_number`, `checked_date`, `reviewed_by`, `reviewed_at`, `rejection_reason`, `expires_at`, `submitted_at`, `created_at`, `updated_at`

### Unchanged Data Model

**"Not uploaded" model remains:**
- No row in `staff_compliance_documents` = document not uploaded
- Presence of row = submission exists (in some status)

**"Expired" remains computed:**
- Expiry is computed at read-time: `(reviewed_at + expires_in_months) < current_date` when `status = 'approved'`
- Never stored as a separate status value in the database
- Scheduled jobs (cron/worker) are optional and used only for sending expiry notifications
- Scheduled jobs do NOT update the database status to "expired"

**Auth model remains canonical:**
- `auth.uid()` is the source of truth for current user
- `profiles.id = auth.users.id` (1:1 relationship)
- RLS policies continue to use `auth.uid()`

**Uniqueness constraint remains:**
- One document per (tenant, user, doc_type) triple
- Replace operation is DELETE + INSERT under the UNIQUE (tenant_id, user_id, doc_type) key

**Service role key:**
- **Not used** in this feature
- All operations go through RLS-protected APIs
- No bypass mechanisms introduced

### Distinguishing Custom Documents

Custom documents are identified conceptually by:

- **Doc type naming convention**: Custom docs use a tenant-scoped identifier (e.g., `custom_safety_certificate`, `custom_training_record`)
- **Admin UI only**: Shows a "Custom" badge for visual distinction in admin lists
- **No schema flag**: No `is_custom` column is added; the system treats all requirements uniformly

---

## SaaS-Grade UI Description

### Admin UI: Settings → Compliance Documents

#### Add Custom Document Requirement

**Primary Action:**
- Button labeled: **"Add Custom Document"** (prominent CTA, primary color)
- Opens a modal or side drawer

**Modal/Drawer Form:**

**1. Title Field** (Required)
- Text input
- Label: "Document Title"
- Placeholder: "e.g., Safety Certificate, Fire Warden Training"
- Max length: 100 characters
- Validation: Cannot be empty, must be unique within tenant

**2. Document Identifier** (doc_type)
- **Option A**: Admin types a slug manually (e.g., `custom_safety_cert`)
- **Option B**: System auto-generates from title (e.g., "Safety Certificate" → `custom_safety_certificate`)
- Must be:
  - Lowercase
  - Use underscores (no spaces)
  - Safe for URLs and storage paths
  - Prefixed with `custom_` to avoid collision with system defaults
  - Tenant-scoped (same identifier can exist in different tenants)

**3. Requirement Level** (Required)
- Radio buttons or segmented control:
  - **Required**: All matching staff must submit
  - **Conditional**: Staff must submit if trigger condition met (applies-to rules)
  - **Optional**: Staff may submit but not enforced
- Default: Required

**4. Collection Method** (Required)
- Radio buttons:
  - **Upload**: Staff must upload a file
  - **Reference**: Staff provides reference number only (no file)
  - **Both**: Staff must upload file AND may optionally provide reference
- Default: Upload
- Help text: "Choose how staff will provide this document"

**5. Expiry Months** (Optional)
- Number input
- Label: "Expiry Period (months)"
- Placeholder: "e.g., 12, 24, 36"
- Min: 1, Max: 120
- Leave empty for non-expiring documents
- Help text: "Document expires X months after approval. Leave blank if document does not expire."

**6. Applies-To Rules**
- **All Staff Toggle**:
  - Label: "Required for all staff"
  - If enabled: All staff in tenant see this requirement
  - If disabled: Show role/location selectors

- **Role Multi-Select** (conditional):
  - Label: "Required for roles"
  - Checkboxes or multi-select dropdown
  - Options: All roles in tenant
  - Empty = no role filter

- **Location Multi-Select** (conditional):
  - Label: "Required for locations"
  - Checkboxes or multi-select dropdown
  - Options: All locations in tenant
  - Empty = no location filter

**7. Enable Toggle**
- Label: "Enable this requirement"
- Default: On
- Help text: "Disabled requirements are hidden from staff but remain in the system"

**Form Actions:**
- **Save Button**: Enabled only when form is valid
- **Cancel Button**: Discards changes, closes modal
- **Delete Button** (edit mode only): Soft-delete with confirmation

**Validation & Feedback:**
- Real-time validation on blur
- Clear error messages (e.g., "Title is required", "Document identifier must be unique")
- Disabled save button until all required fields are valid
- Toast notification on successful save: "Custom requirement created"
- Toast notification on error: "Failed to save requirement. Please try again."

**Post-Save Behavior:**
- Modal closes
- New requirement appears immediately in the requirements list
- Sorted alphabetically or by creation date (consistent with other requirements)
- Shows **"Custom"** badge in admin UI only (visual indicator, not stored in DB)

**Empty State:**
- If no custom requirements exist yet:
  - Message: "No custom compliance documents yet"
  - Subtext: "Create tenant-specific requirements that staff must submit"
  - CTA: "Add Custom Document" (same button as above)

**Loading/Saving States:**
- Show spinner or skeleton during initial load
- Disable form during save operation
- Show inline progress indicator

**Metadata Display:**
- In list view or detail panel, show:
  - Created at (timestamp from `created_at`)
  - Last updated at (timestamp from `updated_at`)
- Metadata visible only in admin UI, not to staff
- Additional actor tracking (created by, updated by) depends on platform-level audit system (optional)

---

#### Admin Review UI: Review Custom Document Submissions

Custom document submissions appear in the **same review table** as standard requirements.

**Review Table Columns:**
- Staff name
- Document type (includes custom doc titles)
- Status badge (Submitted, Approved, Rejected, Expired)
- Submitted date
- Expiry date (if applicable)
- Actions (View, Approve, Reject)

**Filters:**
- Document type: Multi-select (includes both standard and custom)
- Staff member: Search/select
- Status: Multi-select (Submitted, Approved, Rejected, Expired)
- Submitted date range

**Row Actions:**

**View Submission:**
- Opens detail panel or modal
- Shows:
  - Staff name and role
  - Document title
  - File preview (if upload) via signed URL
  - Download link (signed URL, 1-hour expiration)
  - Reference number and checked date (if provided)
  - Submission date
  - Review history (if previously reviewed)

**Approve:**
- Button: "Approve"
- Confirmation: "Approve [Document Title] for [Staff Name]?"
- On confirm:
  - Status → Approved
  - `reviewed_by` set to current admin
  - `reviewed_at` set to now
  - If `expires_in_months` configured: compute `expires_at` (reviewed_at + expires_in_months)
  - Toast: "Document approved"

**Reject:**
- Button: "Reject"
- Modal: "Reason for rejection" (text area, required)
- On confirm:
  - Status → Rejected
  - `rejection_reason` saved
  - `reviewed_by` and `reviewed_at` set
  - Toast: "Document rejected"
  - Staff sees rejection reason in their UI

**Bulk Actions:**
- Select multiple submissions
- Bulk approve (with confirmation)
- Bulk reject (requires single reason for all)

**Preview/View Behavior:**
- All file viewing uses signed URLs
- Supported types display inline (images, PDFs in modern browsers)
- Unsupported types (Word docs) trigger download
- Reference-only submissions: No file preview available

**Same Flow as Standard Requirements:**
- No UI distinction between custom and standard docs in review flow
- Same validation rules
- Same audit logging
- Same notification triggers (staff notified of approval/rejection)

---

### Staff UI: /compliance

Staff members see custom compliance requirements in the **same list/cards** as standard requirements.

**Staff has no knowledge of whether a requirement is custom or built-in.** The UI is identical.

#### Requirements List/Cards

**Card Layout:**

Each requirement displays as a card with:

**Header:**
- Document title (e.g., "Safety Certificate")
- Status badge (see below)

**Body:**
- Description (if provided by admin)
- Requirement level indicator (Required, Optional)
- Expiry information (if applicable): "Expires in 45 days" or "Expired 3 days ago"

**Actions:**
- Upload button (if not yet submitted or if rejected/expired)
- View button (if file uploaded and approved)
- Replace button (if rejected or expired and upload allowed)

---

#### Status Badge & Microcopy

**Not Uploaded:**
- Badge: Gray/neutral color
- Text: "Not Uploaded"
- Microcopy: "Upload your [Document Title] to complete this requirement"
- Action: "Upload" button (primary)

**Submitted:**
- Badge: Yellow/warning color
- Text: "Awaiting Review"
- Microcopy: "Your submission is being reviewed by your administrator"
- Action: None (cannot replace until reviewed)

**Approved:**
- Badge: Green/success color
- Text: "Approved"
- Microcopy: "Valid until [expiry date]" (if expiring) or "No action needed" (if non-expiring)
- Action: "View" button (opens signed URL)

**Rejected:**
- Badge: Red/error color
- Text: "Rejected"
- Microcopy: "Reason: [rejection_reason]"
- Action: "Upload Again" button (primary, replaces old submission)

**Expired:**
- Badge: Red/error color
- Text: "Expired"
- Microcopy: "Expired on [expiry date]. Upload a new document."
- Action: "Replace" button (primary)

---

#### Upload UX (collection_method = "upload" or "both")

**File Picker:**
- Drag-and-drop zone: "Drag file here or click to browse"
- Click-to-upload: Opens native file picker
- Allowed types displayed: "Accepted: JPG, PNG, WEBP, PDF, DOC, DOCX • Max 5MB"

**Client-Side Validation (UX only):**
- Shows error if file type not allowed
- Shows error if file size exceeds limit
- Does not proceed with upload if validation fails

**Upload Progress:**
- Progress bar (0-100%)
- Cancel button (aborts upload)
- Shows filename and size during upload

**Post-Upload:**
- Status changes to "Submitted"
- Card updates to "Awaiting Review" state
- Toast notification: "[Document Title] uploaded successfully"
- No further action until admin reviews

---

#### Reference-Only UX (collection_method = "reference")

**No File Picker Shown**

**Form Fields:**
- **Reference Number** (required):
  - Text input
  - Label: "Reference Number"
  - Placeholder: "e.g., CERT-12345"
  - Max length: 100 characters

- **Checked Date** (optional):
  - Date picker
  - Label: "Verification Date"
  - Help text: "Date this reference was verified (optional)"

**Submit Button:**
- Enabled when reference number provided
- On submit:
  - Status → Submitted
  - `reference_number` and `checked_date` saved
  - Toast: "Reference submitted successfully"

**No View Button:**
- Once approved, card shows "Approved" status
- No file to view (no View button or it's disabled/hidden)

---

#### Both UX (collection_method = "both")

**File Upload:**
- Required (same UX as "upload" mode)

**Reference Fields:**
- Optional (same fields as "reference" mode)
- Displayed below file picker
- Help text: "Reference number is optional but may speed up verification"

**Submit:**
- Must upload file (required)
- May provide reference (optional)
- Both saved together

---

#### View UX (Approved Documents)

**View Button:**
- Only appears when `storage_path` is non-null (file was uploaded)
- Label: "View Document"
- Opens signed URL in new tab/window
- Signed URL expires in 1 hour

**Supported Types:**
- Images: Display inline in browser
- PDFs: Open in browser PDF viewer
- Word docs: Trigger download (cannot display inline in browser)

**Reference-Only Documents:**
- `storage_path` is null (no file uploaded)
- No View button shown (or button is disabled/hidden)
- Reference number displayed in card body (read-only)
- Attempting to view reference-only document returns error (no file attached)

---

#### Replace UX (Rejected or Expired)

**Replace Button:**
- Available only when:
  - Status = Rejected OR
  - Status = Expired (computed)
- Label: "Upload Again" (rejected) or "Replace Expired Document" (expired)

**Replace Flow:**
- Opens same upload UI as initial submission
- Shows previous rejection reason (if rejected)
- Uploading new file:
  - Server deletes old storage object (if `storage_path` is non-null)
  - Server deletes old row from `staff_compliance_documents`
  - Server inserts new row with `status = 'submitted'`
  - New `submitted_at` set to current timestamp
  - All review fields (`reviewed_by`, `reviewed_at`, `rejection_reason`) are null in new row
  - **Delete + insert must be atomic (single transaction) OR use a safe upsert strategy; never leave the staff member without a row if anything fails**
  - Awaits new admin review

**No Duplicate Rows:**
- Uniqueness constraint (`tenant_id`, `user_id`, `doc_type`) enforced
- Replace operation is DELETE + INSERT (not UPDATE)
- Old data is removed; new submission is clean

---

#### UX Quality Standards

**Hierarchy & Clarity:**
- Clear visual distinction between statuses
- Consistent badge styling across all requirements
- Prominent CTAs for actionable states

**Friendly Copy:**
- No jargon (e.g., "Awaiting Review" not "Status: Pending")
- Action-oriented microcopy (e.g., "Upload your document" not "No file")
- Specific rejection reasons shown to staff

**Predictable Flows:**
- Upload → Submitted → Approved/Rejected → (optional) Expired → Replace
- No surprise states or missing transitions
- Loading states for all async operations

**Responsive:**
- Works on desktop, tablet, mobile
- Touch-friendly upload zones on mobile
- File picker adapts to device (camera on mobile if applicable)

**Accessible:**
- ARIA labels for screen readers
- Keyboard navigation support
- Focus management in modals
- Sufficient color contrast

---

## Security Model (Unchanged and Enforced)

This feature **does not relax or change** the existing security model. All protections remain in place.

### Tenant Isolation via RLS (Required)

**All database operations enforce:**
- Tenant isolation via `tenant_id` filters in RLS policies
- No cross-tenant data leakage possible
- Custom requirements scoped to `tenant_id` in `tenant_compliance_requirements`
- Staff submissions scoped to `tenant_id` in `staff_compliance_documents`

### Membership Required for ALL Storage Access

**Storage access rules:**
- Staff can only access their own documents (`user_id = auth.uid()`)
- Admins can access all documents within their tenant
- **Even staff cannot access their own files** if they are not an active tenant member
- Membership is checked via RLS policies on `tenant_memberships`

### Storage Paths Are Server-Generated Only

**Client cannot supply storage path:**
- Server constructs path: `{tenantId}/{userId}/{docType}/{yyyy-mm}/{uuid}.{ext}`
- Client sends file; server decides where it goes
- Filename is a UUID with original extension (prevents collisions and path traversal)
- Date-based folder structure (`yyyy-mm`) for organization
- No path traversal vulnerabilities
- No cross-tenant storage access

### Signed URLs Expire

**All file viewing uses signed URLs:**
- Generated server-side via Supabase Storage API
- Expiration: 1 hour (configurable)
- Cannot be reused after expiration
- Cannot be guessed or forged

### Staff Cannot Approve/Reject or Change Admin Fields

**Staff permissions are limited to:**
- Insert: Create new submission (only for their own `user_id`)
- Update: **Narrow exception for reference metadata**
  - Only when `status = 'submitted'`
  - Only fields: `reference_number`, `checked_date`
  - Cannot change `status`, `reviewed_by`, `rejection_reason`, `expires_at`
- Select: Read only their own documents

**Staff cannot:**
- Change document status
- Approve or reject submissions
- Modify admin-controlled fields (`requirement_level`, `expires_in_months`, etc.)
- Delete requirements
- Access other users' documents

### Rate Limiting

**Upload rate limiting is enforced:**
- Per-user rate limits on file uploads (e.g., 10 uploads per minute)
- Prevents abuse and storage exhaustion
- Enforced at API or middleware layer

### No Service Role Key Used

**This feature does not use the Supabase service role key:**
- All operations go through RLS-protected APIs
- No bypass mechanisms
- No elevated privileges granted to client

### No Public Bucket Access

**Storage bucket remains private:**
- `compliance-documents` bucket has `public: false`
- No public URLs generated
- No anonymous access allowed
- All access mediated by signed URLs with membership checks

---

## Operational "Ship Checklist" (Must Pass Before Deploy)

**Do not deploy if any checklist item fails.**

### 1. Confirm All Existing Migrations Are Applied

**Before deployment:**
- Run `supabase migration up` (or equivalent in CI/CD pipeline)
- Verify all migrations in `supabase/migrations/` have been applied
- Check migration status: `supabase migration list`
- Confirm no pending migrations

**Target environments:**
- Staging: All migrations applied
- Production: All migrations applied (after staging verification)

### 2. Verify Schema + RLS + Storage Policies Exist

**Schema verification:**
- `tenant_compliance_requirements` table exists with correct columns
- `staff_compliance_documents` table exists with correct columns
- Uniqueness constraint exists: `UNIQUE (tenant_id, user_id, doc_type)`

**RLS verification:**
- RLS is **enabled** on:
  - `tenant_compliance_requirements`
  - `staff_compliance_documents`
  - `storage.objects`
- Policies exist for:
  - Admin read/write on requirements
  - Staff read on requirements (only enabled ones)
  - Staff insert/update on their own documents
  - Admin read on all tenant documents
  - Storage policies enforce tenant isolation

**Storage policies verification:**
- Storage bucket `compliance-documents` exists
- Bucket is **private** (`public: false`)
- INSERT policy: Staff can upload to their own path
- SELECT policy: Staff can read own files, admins can read tenant files
- UPDATE policy: Admins can modify (for cleanup/migration)
- DELETE policy: Admins can delete (for cleanup)

### 3. Run Build & Lint

**Build verification:**
- `npm run build` (in `/apps/web` and any other app directories)
- Build completes without errors
- No TypeScript errors
- No missing dependencies

**Lint verification:**
- `npm run lint` (in all app directories)
- No linting errors (warnings acceptable if documented)
- Code follows project style guidelines

### 4. Confirm No Secrets Exposed in Client Bundle

**Security audit:**
- **Service role key MUST NOT appear** in client bundle
- Run: `grep -r "SUPABASE_SERVICE_ROLE_KEY" apps/web/.next/` (or equivalent build output)
- Run: `grep -r "SUPABASE_SERVICE_ROLE_KEY" apps/web/out/` (if using static export)
- Verify only `NEXT_PUBLIC_` prefixed Supabase keys are in client code
- Anon key is acceptable (public by design)

**Environment variable check:**
- Staging: Verify `.env` or Vercel environment variables
- Production: Verify `.env` or Vercel environment variables
- Confirm service role key is server-only (e.g., in API routes or worker)

### 5. Confirm Custom Doc Creation Does Not Allow Path Traversal or Cross-Tenant Leakage

**Security testing:**

**Path Traversal Prevention:**
- Test: Attempt to create doc_type with `../`, `..\\`, or `/` characters
- Expected: Server rejects or sanitizes input
- Test: Attempt to create doc_type with null bytes, Unicode exploits
- Expected: Server rejects

**Cross-Tenant Leakage Prevention:**
- Test: User in Tenant A creates custom requirement
- Test: User in Tenant B attempts to access or list Tenant A's custom requirements
- Expected: Tenant B user cannot see Tenant A's requirements
- Test: Staff in Tenant A submits document for custom requirement
- Test: Admin in Tenant B attempts to access Tenant A's submission
- Expected: Tenant B admin cannot see Tenant A's submissions

**Storage Path Validation:**
- Test: Upload file for custom doc_type
- Verify storage path is: `{tenantId}/{userId}/{docType}/{yyyy-mm}/{uuid}.{ext}`
- Verify filename is a UUID with original extension (not client-supplied filename)
- Verify no path traversal possible in any path segment
- Verify `{tenantId}`, `{userId}`, and date folder are server-generated, not client-supplied

**RLS Enforcement:**
- Test: Query `tenant_compliance_requirements` as user in Tenant A
- Expected: Only Tenant A's requirements returned
- Test: Query `staff_compliance_documents` as staff in Tenant A
- Expected: Only own documents returned
- Test: Query as admin in Tenant A
- Expected: All Tenant A documents returned, no Tenant B documents

### 6. Verify Storage Bucket Exists and Is Private

**Bucket verification:**
- Navigate to Supabase Dashboard → Storage
- Confirm `compliance-documents` bucket exists
- Confirm bucket is **Private** (not Public)
- Confirm no files are publicly accessible

**Policy verification:**
- Check bucket policies in Supabase Dashboard or via SQL
- Confirm policies enforce:
  - Tenant isolation
  - Membership requirement
  - Staff can only access own files
  - Admins can access all tenant files

### 7. Run Smoke Tests

**Post-deployment smoke tests:**

**Admin Flow:**
1. Log in as tenant admin
2. Navigate to Settings → Compliance Documents
3. Create a new custom requirement
4. Verify it appears in the list
5. Disable and re-enable the requirement
6. Verify staff can see it (when enabled) and cannot see it (when disabled)

**Staff Flow:**
1. Log in as staff member
2. Navigate to /compliance
3. Verify custom requirement appears
4. Upload a document
5. Verify status changes to "Submitted"

**Admin Review Flow:**
1. Log in as tenant admin
2. Navigate to review submissions
3. Find custom document submission
4. Approve or reject
5. Verify staff sees updated status

**Expiry Flow (if applicable):**
1. Create custom requirement with `expires_in_months = 1`
2. Approve a submission
3. Manually adjust `reviewed_at` to > 1 month ago (in dev/staging)
4. Verify document shows as "Expired" in staff UI (computed as expired)
5. Verify staff can replace expired document

### 8. Audit Logging (Optional)

**If your platform already has an audit log system**, consider logging the following events:
- Admin creates custom requirement
- Admin edits custom requirement
- Admin disables custom requirement
- Staff submits document
- Admin approves document
- Admin rejects document

**Typical audit log fields** (if implemented):
- Actor (who performed the action)
- Action type (create, update, delete, approve, reject)
- Target (requirement or submission)
- Timestamp
- Tenant ID (for isolation)

**Note:** Audit logging is not required to ship this feature. It is a platform-level concern, not a compliance feature requirement.

---

## Contradiction-Free Checklist

Before finalizing this document, confirm:

✅ **Does not contradict existing build spec**
- Feature aligns with existing compliance system architecture
- No new requirements that conflict with documented behavior

✅ **Does not invent new tables/columns**
- Uses existing `tenant_compliance_requirements` table
- Uses existing `staff_compliance_documents` table
- No schema changes proposed

✅ **Does not relax security**
- All RLS policies remain enforced
- No new bypass mechanisms introduced
- No service role key used in client
- Tenant isolation maintained

✅ **Matches status model**
- No row = not uploaded
- Expired is computed, not stored
- Status flow matches existing: not uploaded → submitted → approved/rejected → expired

✅ **Matches allowed submission types**
- Upload: File required
- Reference: Reference number required, no file
- Both: File required, reference optional

✅ **Respects collection_method enforcement at API level**
- Validation occurs server-side
- Client-side validation is UX only
- API rejects invalid submissions (e.g., missing file when upload required)

✅ **No contradictions with RLS policies**
- Staff can only see their own documents
- Admins can see all tenant documents
- Membership is required for all access
- No public access to storage

✅ **No contradictions with auth model**
- `auth.uid()` remains canonical
- `profiles.id = auth.users.id`
- No alternative auth methods introduced

✅ **No contradictions with storage model**
- Bucket remains private
- Signed URLs with expiration
- Server-generated paths only
- No client-supplied storage paths

---

## Summary

This document defines **Custom Compliance Documents** as a natural extension of the existing compliance system. It:

- Enables tenant admins to create custom requirements scoped to their tenant
- Provides staff with a consistent, seamless submission experience
- Maintains all existing security guarantees (RLS, tenant isolation, storage security)
- Requires no schema changes or new tables
- Uses existing status flow and review mechanisms
- Is 100% shippable as documented

**Security is unchanged. UX is consistent. Architecture is respected.**

This feature is ready for implementation using the existing foundation, with no compromises on security or data model integrity.

