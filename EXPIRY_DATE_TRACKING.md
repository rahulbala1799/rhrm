# Expiry Date Tracking for Compliance Documents

## Feature Scope

**What this feature does:**
- Adds **optional** expiry date tracking to compliance document types
- Controlled by **Admin only** via a per-document-type toggle
- When enabled, staff **must** provide an expiry date when submitting documents
- When disabled, no expiry date is required or shown

**Applies to:**
- ✅ Pre-seeded document types (built-in templates)
- ✅ Custom document types (created by admins)

**Does NOT apply to:**
- ❌ No global "all documents require expiry" setting
- ❌ Not enforced at tenant level
- ❌ Not retroactively applied to existing submissions

**Goal:**
Enable flexible compliance tracking where admins decide which document types need expiry dates (e.g., certifications, licenses) and which don't (e.g., one-time training certificates).

---

## ⚠️ Critical Implementation Notes

**Before implementing, pay special attention to these three areas:**

### 1. Date Parsing - Strict Format Handling

**Rule:** Keep dd/mm/yyyy format throughout the frontend, convert to ISO (YYYY-MM-DD) **only** at API layer before database write.

```
User Input (Frontend) → dd/mm/yyyy (validation happens here)
    ↓
API Receives → dd/mm/yyyy string
    ↓
API Validates → strict dd/mm/yyyy format check
    ↓
API Converts → YYYY-MM-DD (ISO 8601)
    ↓
Database Stores → DATE type (YYYY-MM-DD)
    ↓
API Returns → YYYY-MM-DD (ISO string)
    ↓
Frontend Displays → dd/mm/yyyy (convert for display)
```

**Why:** Prevents date ambiguity (is 03/04/2025 = March 4th or April 3rd?) and ensures consistent parsing.

**Implementation:**
- Frontend: Accept only dd/mm/yyyy, validate format, send as-is to API
- API: Parse dd/mm/yyyy explicitly (don't use auto-parsing), convert to ISO
- Database: Store as DATE type in ISO format
- Display: Convert ISO back to dd/mm/yyyy for all UI views

---

### 2. Server-Side Validation - Never Trust the Client

**Rule:** Enforce expiry date requirement in API, not just in UI.

**Why:** Users can bypass client-side validation via:
- Browser dev tools
- Direct API calls (curl, Postman)
- Modified frontend code
- Browser extensions

**Implementation:**

```typescript
// API validation logic (pseudo-code)
async function submitDocument(data) {
  // 1. Lookup the document type
  const docType = await getDocumentType(data.requirement_id);
  
  // 2. Check if expiry is required
  if (docType.requires_expiry_date === true) {
    // 3. Validate expiry_date is present
    if (!data.expiry_date || data.expiry_date.trim() === '') {
      return error(400, 'Expiry date is required for this document type');
    }
    
    // 4. Validate format (dd/mm/yyyy)
    if (!isValidDateFormat(data.expiry_date, 'dd/mm/yyyy')) {
      return error(400, 'Invalid date format. Use dd/mm/yyyy');
    }
    
    // 5. Convert to ISO for storage
    data.expiry_date = convertToISO(data.expiry_date);
  }
  
  // 6. Proceed with insert
  await insertDocument(data);
}
```

**Critical:** This validation must happen **before** the database INSERT, on every submission.

---

### 3. Table Names - Use Correct Schema

**Rule:** Always use the correct table names in migrations, queries, and API code.

**Correct Names:**
- ✅ `tenant_compliance_requirements` (NOT `compliance_requirements`)
- ✅ `staff_compliance_documents` (NOT `compliance_documents`)
- ✅ `idx_staff_compliance_documents_expiry_date` (index name)

**Where This Matters:**
- Database migrations (ALTER TABLE statements)
- SQL queries (SELECT, INSERT, UPDATE)
- TypeScript types (generated from Supabase schema)
- API endpoint queries
- RLS policies (if modified)

**Quick Check:**
```bash
# Search codebase for old names - should return zero results
grep -r "compliance_requirements" --exclude-dir=node_modules
grep -r "compliance_documents" --exclude-dir=node_modules

# Should only find the correct names
grep -r "tenant_compliance_requirements" --exclude-dir=node_modules
grep -r "staff_compliance_documents" --exclude-dir=node_modules
```

---

## Admin: Document Type Settings

### Location

The expiry tracking toggle is available in:
1. **Document Type create modal** - when creating a new document type
2. **Document Type edit screen** - when editing existing document types

### Control Specification

**UI Element:** Toggle switch

**Label:** "Track expiry date"

**States:**
- **OFF** → Expiry date not tracked; staff never see date field
- **ON** → Expiry date required; staff must provide date when submitting

**Helper Text:**
```
When enabled, staff must enter an expiry date when submitting this document.

• OFF: No expiry date required
• ON: Staff must enter an expiry date when submitting this document
```

**Visual Design:**
```
┌─────────────────────────────────────────────────────────────┐
│ Track Expiry Date                                           │
│                                             [Toggle: ON]    │
│                                                             │
│ When enabled, staff must enter an expiry date when         │
│ submitting this document.                                   │
│                                                             │
│ • OFF: No expiry date required                              │
│ • ON: Staff must enter an expiry date when submitting      │
│       this document                                         │
└─────────────────────────────────────────────────────────────┘
```

### Behavior Rules

1. **Default State:** OFF (for new document types)
2. **Pre-seeded Document Types:**
   - Are **editable** for this setting (not locked by default)
   - Admins can toggle expiry tracking on/off
   - Unless explicitly locked in future enhancement
3. **Custom Document Types:**
   - Fully editable by tenant admins
   - Can be toggled freely
4. **Changes Take Effect:**
   - Immediately on save
   - Apply only to NEW submissions going forward
   - Do not affect existing submissions

### Document Type List Display

In the document types list, show the current state:

```
┌─────────────────────────────────────────────────────────────┐
│ Document Types                                    [+ Create] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Working with Children Check                                  │
│ 📄 Pre-seeded  │  ✓ Expiry tracking enabled                  │
│ [Edit]                                                        │
│                                                               │
│ First Aid Certificate                                        │
│ 📄 Pre-seeded  │  ○ No expiry tracking                       │
│ [Edit]                                                        │
│                                                               │
│ COVID-19 Vaccination Certificate                             │
│ 👤 Custom     │  ✓ Expiry tracking enabled                   │
│ [Edit]  [Delete]                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Staff: Document Submission UX

### Conditional Display Rule

**Expiry date field appears ONLY if:**
- Admin has enabled "Track expiry date" for that document type

**If tracking is OFF:**
- No expiry date field shown
- Staff cannot enter expiry date
- Form submits without expiry information

**If tracking is ON:**
- Expiry date field is **required** (blocking submit)
- Field is clearly marked with asterisk (*)
- Validation prevents submission if empty or invalid

### Expiry Date Field Specification

**Field Label:** "Expiry Date *"

**Input Type:** Date picker with manual entry fallback

**Note on File Types:** Accepted file types (PDF, JPG, PNG, WEBP, DOC, DOCX) are unchanged by this feature. This feature only adds the expiry date field.

**Format:**
- **Display format:** dd/mm/yyyy
- **User input format:** dd/mm/yyyy
- **Storage format:** ISO 8601 date (YYYY-MM-DD)

**UI Components:**
1. **Calendar icon** - Visual indicator of date field
2. **Date picker popover** - Opens on click
3. **Manual typing** - Allowed in dd/mm/yyyy format
4. **Helper text** - "Format: dd/mm/yyyy"

**Calendar Picker Features:**
- Click field or calendar icon to open
- Month/year navigation
- Today button for quick selection
- Clear button to reset
- Visual highlight on selected date

**Manual Entry Features:**
- Type directly in field
- Auto-formatting as user types (e.g., "15012026" → "15/01/2026")
  - **Best-effort feature:** May vary by browser/component
  - **Validation must still work without auto-formatting**
- Accepts slashes or hyphens (converts to slashes)
- Validates format in real-time

### Validation Rules

**Required Field:**
- Cannot be empty/blank
- Submit button blocked if empty
- Error message: "Expiry date is required for this document type"

**Format Validation:**
- Must match dd/mm/yyyy exactly
- Error message: "Please enter a valid date in dd/mm/yyyy format"

**Date Validity:**
- Must be a real date (no 32/13/2025 or 29/02/2023)
- Leap year validation (29/02/2024 ✓, 29/02/2025 ✗)
- Month day limits (31/04/2025 ✗)
- Error message: "Invalid date"

**Timing Validation:**
- **No restriction on past dates** (system accepts them)
- **Rationale:** This allows admins to approve/reject based on context rather than blocking uploads automatically
- Use cases: backdating documents, historical records, admin discretion
- Admin reviews and decides to approve/reject during review process
- Optional future enhancement: warning for past dates (non-blocking)

**Validation Triggers:**
- On blur (user leaves field)
- On submit button click
- Real-time for format errors (after 10 characters entered)

### Form Layout Examples

**Expiry Tracking OFF:**
```
┌─────────────────────────────────────────────────────────────┐
│ Submit Document: Training Acknowledgment Form                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Select Document Type *                                        │
│ [Training Acknowledgment Form                          ▼]    │
│                                                               │
│ Upload File *                                                 │
│ [Choose File]  No file chosen                                │
│ Accepted: PDF, JPG, PNG, WEBP, DOC, DOCX (max 5MB)           │
│                                                               │
│ Notes (optional)                                              │
│ [                                              ]              │
│                                                               │
│ [Cancel]                                        [Submit]     │
└─────────────────────────────────────────────────────────────┘
```

**Expiry Tracking ON:**
```
┌─────────────────────────────────────────────────────────────┐
│ Submit Document: Working with Children Check                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Select Document Type *                                        │
│ [Working with Children Check                           ▼]    │
│                                                               │
│ Upload File *                                                 │
│ [Choose File]  wwcc_certificate.pdf                          │
│ Accepted: PDF, JPG, PNG, WEBP, DOC, DOCX (max 5MB)           │
│                                                               │
│ Expiry Date *                                                 │
│ [📅]  15/01/2026                                         ▼   │
│ Format: dd/mm/yyyy                                            │
│                                                               │
│ Notes (optional)                                              │
│ [Renewed certificate valid until January 2026]               │
│                                                               │
│ [Cancel]                                        [Submit]     │
└─────────────────────────────────────────────────────────────┘
```

### Validation Error States

**Missing Required Field:**
```
Expiry Date *
[📅]  DD/MM/YYYY                                            ▼
⚠️ Expiry date is required for this document type
```

**Invalid Format:**
```
Expiry Date *
[📅]  32/13/2025                                            ▼
⚠️ Please enter a valid date in dd/mm/yyyy format
```

**Valid Entry:**
```
Expiry Date *
[📅]  15/01/2026                                            ▼  ✓
Format: dd/mm/yyyy
```

---

## Data Model Changes

### Tables Modified

#### 1. `tenant_compliance_requirements` (Document Types)

**New Column:**

| Column Name | Type | Nullable | Default | Description |
|-------------|------|----------|---------|-------------|
| `requires_expiry_date` | `boolean` | NOT NULL | `false` | When true, staff must provide expiry date for this document type |

**Constraint:**
- No database-level constraint needed
- Application layer enforces the requirement

---

#### 2. `staff_compliance_documents` (Document Submissions)

**New Column:**

| Column Name | Type | Nullable | Default | Description |
|-------------|------|----------|---------|-------------|
| `expiry_date` | `date` | NULL | NULL | Expiry date of submitted document (dd/mm/yyyy format for display) |

**Constraint:**
- `expiry_date` must be non-null **only when** `requires_expiry_date = true`
- **Database does not enforce cross-table constraint**; validation is enforced in API before insert/update
- This design allows flexibility and avoids complex triggers that reference multiple tables

**Index:**
```sql
CREATE INDEX idx_staff_compliance_documents_expiry_date 
ON staff_compliance_documents(expiry_date) 
WHERE expiry_date IS NOT NULL;
```

**Purpose:** Future queries for expiring documents (notifications, reports)

---

### Data Type Details

**Storage Format:**
- Database stores as `DATE` type (no time component)
- ISO 8601 format: YYYY-MM-DD (e.g., 2026-01-15)

**Display Format:**
- UI displays as dd/mm/yyyy (e.g., 15/01/2026)
- No timezone conversion needed (calendar date, not timestamp)

**Null Values:**
- `expiry_date = NULL` is valid when `requires_expiry_date = false`
- `expiry_date = NULL` is also valid for legacy documents (submitted before tracking was enabled)

---

## Edge Cases

### 1. Admin Enables Expiry Tracking After Documents Already Exist

**Scenario:**
- Document type "First Aid Certificate" has 50 existing submissions
- Admin toggles `requires_expiry_date` from `false` to `true`

**Behavior:**

**Existing Submissions (50 documents):**
- `expiry_date` field remains NULL
- Documents remain valid and approved
- Display shows: "⚠️ Expiry date not provided (submitted before expiry tracking)"

**New Submissions (after toggle):**
- Staff **must** provide expiry date
- Upload form shows required field
- Cannot submit without date

**Admin Actions:**
- Can view which documents are missing expiry dates
- Can manually request re-submission (not automated)
- Can filter/sort by expiry status

---

### 2. Admin Disables Expiry Tracking After Documents Submitted

**Scenario:**
- Document type "COVID Vaccination" has tracking enabled
- 100 documents submitted with expiry dates
- Admin toggles `requires_expiry_date` from `true` to `false`

**Behavior:**

**Existing Submissions:**
- `expiry_date` values are **preserved** in database
- Still displayed in document details
- Historical compliance data maintained

**New Submissions:**
- Expiry date field **not shown** in upload form
- Staff cannot enter expiry date
- `expiry_date` stored as NULL

**Display Logic:**
- If document has `expiry_date` value: Show it (regardless of current toggle state)
- If document has NULL: Don't show expiry field

**Rationale:**
- Non-destructive operation
- Preserves historical compliance records
- Allows policy changes without data loss

---

### 3. Date Storage Without Timezone

**Why DATE Type:**
- Expiry dates represent calendar days, not moments in time
- "Certificate expires on 15/01/2026" means the same day worldwide
- No timezone conversion needed
- No time component (00:00:00) stored

**Storage:**
- Database: `DATE` column (not `TIMESTAMP`)
- Value: 2026-01-15

**Display:**
- UI: 15/01/2026
- No time shown
- No timezone indicator

**Benefit:**
- Simplicity
- No ambiguity across timezones
- Consistent display for all users

---

### 4. Missing Expiry Date on Old Documents

**When It Happens:**
- Document type had tracking disabled
- Documents were submitted
- Admin later enabled tracking

**Display Handling:**

**Staff View:**
```
Status: ✓ Approved
Submitted: 05/06/2023
Expiry Date: ⚠️ Not provided (submitted before expiry tracking)
```

**Admin View:**
```
John Smith - Police Check
Submitted: 15/02/2023  │  Expiry: ⚠️ Missing  │  Status: Approved
```

**Action Options:**
- Display warning badge
- Allow admin to request updated submission
- No automatic enforcement (legacy data protected)

---

## Implementation Workflow

### Step 1: Database Migration

**Create migration file:**
```bash
supabase migration new add_expiry_date_tracking
```

**Migration SQL:**
```sql
-- Add expiry tracking toggle to document types
ALTER TABLE tenant_compliance_requirements
ADD COLUMN requires_expiry_date BOOLEAN NOT NULL DEFAULT false;

-- Add expiry date to document submissions
ALTER TABLE staff_compliance_documents
ADD COLUMN expiry_date DATE NULL;

-- Index for future expiry queries
CREATE INDEX idx_staff_compliance_documents_expiry_date 
ON staff_compliance_documents(expiry_date) 
WHERE expiry_date IS NOT NULL;

-- Documentation comments
COMMENT ON COLUMN tenant_compliance_requirements.requires_expiry_date IS 
  'When true, staff must provide an expiry date when submitting documents of this type';

COMMENT ON COLUMN staff_compliance_documents.expiry_date IS 
  'Expiry date of the submitted document. Stored as DATE, displayed as dd/mm/yyyy';
```

**Apply locally:**
```bash
supabase db reset
```

---

### Step 2: Regenerate TypeScript Types

**Command:**
```bash
cd apps/web
supabase gen types typescript --local > lib/supabase-types.ts
```

**Expected type changes:**
```typescript
tenant_compliance_requirements: {
  Row: {
    // ... existing fields
    requires_expiry_date: boolean  // NEW
  }
}

staff_compliance_documents: {
  Row: {
    // ... existing fields
    expiry_date: string | null  // NEW (ISO date string)
  }
}
```

---

### Step 3: Implement UI Components

**Files to create/modify:**

1. **Admin Document Type Form**
   - Add toggle switch for `requires_expiry_date`
   - Connect to API endpoint
   - Show helper text

2. **Staff Upload Form**
   - Conditionally render expiry date field
   - Implement date picker component
   - Add validation logic

3. **Date Picker Component** (if not exists)
   - Create reusable date input
   - Calendar popover
   - dd/mm/yyyy formatting

4. **Document Display Components**
   - Show expiry date when present
   - Show warning badge when missing
   - Hide field when not applicable

---

### Step 4: Implement API Validation

**Files to create/modify:**

1. **Document Submission Endpoint**
   - Validate `expiry_date` if required
   - Convert dd/mm/yyyy to ISO date
   - Return clear error messages

2. **Document Type Update Endpoint**
   - Allow updating `requires_expiry_date`
   - Validate admin permissions

3. **Date Validation Utilities**
   - Format validation (dd/mm/yyyy)
   - Date existence validation
   - Conversion functions (dd/mm/yyyy ↔ ISO)

---

### Step 5: Testing

**Test all scenarios in acceptance criteria (see below)**

---

### Step 6: Deploy to Production

**Deployment steps:**
```bash
# Link to production
supabase link --project-ref YOUR_PROJECT_REF

# Push migration
supabase db push

# Commit and push code
git add .
git commit -m "Add expiry date tracking for compliance documents"
git push origin main

# Verify deployment
# (Vercel auto-deploys from main)
```

---

## Acceptance Criteria

### Admin Functionality
- [ ] Admin can toggle expiry tracking per document type
- [ ] Toggle works for pre-seeded document types
- [ ] Toggle works for custom document types
- [ ] Toggle state displays clearly in document type list
- [ ] Toggle state displays clearly in edit screen
- [ ] Helper text explains toggle behavior
- [ ] Changes apply to new submissions only (not retroactive)

### Staff Upload Experience
- [ ] Staff sees expiry date field **only when** tracking enabled
- [ ] Expiry date field is required (blocks submit)
- [ ] Date picker calendar opens and works
- [ ] Can select date from calendar
- [ ] Can type date manually in dd/mm/yyyy format
- [ ] Auto-formatting works correctly
- [ ] Validation prevents invalid dates (32/13/2025, etc.)
- [ ] Validation prevents submission with empty expiry (when required)
- [ ] Validation prevents submission with invalid format
- [ ] Error messages are clear and helpful
- [ ] Helper text "Format: dd/mm/yyyy" is visible
- [ ] Submission succeeds with valid expiry date
- [ ] Submission succeeds without expiry (when tracking OFF)

### Display & Viewing
- [ ] Expiry date displays as dd/mm/yyyy in document details
- [ ] Expiry date displays as dd/mm/yyyy in document lists
- [ ] Expiry date NOT shown when tracking disabled
- [ ] Warning badge shown for missing expiry (when tracking enabled)
- [ ] Legacy submissions display gracefully
- [ ] Admin view shows expiry dates correctly
- [ ] Staff view shows their expiry dates correctly

### Data Persistence
- [ ] Expiry date saves to database correctly
- [ ] Database stores date in ISO format (YYYY-MM-DD)
- [ ] Date retrieves and displays correctly
- [ ] `requires_expiry_date` toggle persists in database
- [ ] Migration creates columns successfully
- [ ] Index on `expiry_date` is created
- [ ] TypeScript types regenerated correctly

### Edge Cases
- [ ] Past dates are accepted (non-blocking)
- [ ] Leap year dates validate correctly (29/02/2024 ✓)
- [ ] Non-leap year Feb 29 rejected (29/02/2025 ✗)
- [ ] Invalid dates rejected (31/04/2025 ✗)
- [ ] No timezone issues (DATE type, no time component)
- [ ] Empty string rejected when required
- [ ] NULL accepted when tracking disabled
- [ ] Enabling tracking doesn't break old submissions
- [ ] Disabling tracking preserves existing dates
- [ ] Pre-seeded and custom types behave identically

### API & Backend
- [ ] GET requirement (document type row from `tenant_compliance_requirements`) returns `requires_expiry_date` flag
- [ ] POST document validates expiry when required
- [ ] POST document accepts NULL expiry when not required
- [ ] PATCH requirement (document type row from `tenant_compliance_requirements`) allows updating `requires_expiry_date`
- [ ] Date conversion utilities work (dd/mm/yyyy ↔ ISO)
- [ ] Validation errors return clear messages
- [ ] HTTP 400 returned for validation failures

### Deployment
- [ ] Migration file created and tested locally
- [ ] Migration applied to production database
- [ ] TypeScript types regenerated
- [ ] Changes committed to git
- [ ] Changes deployed to production
- [ ] End-to-end testing on production environment

---

## What NOT to Change

This feature does **NOT** require changes to:

- ❌ **Deployment checklist** - No infrastructure changes
- ❌ **Storage setup docs** - No new storage buckets
- ❌ **RLS policies** - Expiry doesn't affect access control
- ❌ **Security policies** - No new security requirements
- ❌ **Build instructions** - Standard build process applies
- ❌ **Email setup** - No notification features yet
- ❌ **Authentication** - No auth changes needed

**This is a feature-level specification, not infrastructure.**

---

## Future Enhancements (Out of Scope)

Features NOT included in initial implementation:

1. **Expiry Notifications**
   - Email alerts for expiring documents
   - Dashboard widgets showing upcoming expiries
   - Configurable notification thresholds

2. **Advanced Validation**
   - Block past dates at upload time
   - Maximum expiry duration limits
   - Minimum expiry duration requirements

3. **Bulk Management**
   - Bulk update expiry dates
   - Bulk request re-submissions
   - Export expiring documents list

4. **Renewal Workflow**
   - Auto-prompt staff to renew
   - Link old and new submissions
   - Renewal history tracking

5. **Compliance Dashboard**
   - Visual charts of expiry status
   - Compliance percentage metrics
   - Risk alerts for expired documents

6. **Mobile Optimization**
   - Native date pickers (iOS/Android)
   - Mobile-friendly calendar UI
   - Push notifications

---

## Summary

**What this feature adds:**
- Admin-controlled expiry date tracking per document type
- Conditional required field on staff upload form
- Date storage and display (dd/mm/yyyy format)
- Validation and error handling
- Support for pre-seeded and custom document types

**Key Design Principles:**
- **Optional by design** - Not all documents need expiry dates
- **Admin controlled** - Tenant decides per document type
- **Non-destructive** - Toggling settings preserves existing data
- **Simple storage** - DATE type, no timezone complexity
- **Clear UX** - dd/mm/yyyy format, helpful validation messages

**Implementation Approach:**
1. Database migration (2 columns + 1 index)
2. Regenerate types
3. Admin toggle UI
4. Staff date picker UI
5. API validation logic
6. Test all edge cases
7. Deploy to production

---

**End of Specification**

