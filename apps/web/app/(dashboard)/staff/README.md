# Staff List Page Documentation

## Overview

The Staff List page (`/staff`) displays all staff members for the current tenant. Once invited staff members accept their invitation and complete onboarding, they should appear in this list (after a staff record is created for them).

## Implementation Status: ✅ Ship-Ready

This page is **production-ready** with the following features implemented:

- ✅ **Pagination**: Full pagination support (page, pageSize, total, totalPages)
- ✅ **Search**: Case-insensitive partial match with 400ms debounce
- ✅ **Filtering**: Status and location filters with URL persistence
- ✅ **Sorting**: Default sort by `created_at DESC` (fixed, no user-configurable sorting yet)
- ✅ **Location Data**: Uses existing `/api/settings/locations` endpoint
- ✅ **Permissions**: Role-based UI visibility using `GET /api/auth/role`
- ✅ **Status Mapping**: UI labels properly map to API enum values
- ✅ **Contact Display**: Fallback rules documented ("—" for missing data)
- ✅ **Loading States**: Skeleton loading with shimmer animation
- ✅ **Responsive Design**: Desktop table + mobile card layout
- ✅ **Error Handling**: Comprehensive error states with retry functionality

**Note on Sorting**: Currently fixed to `created_at DESC`. User-configurable sorting (by name, employee_number, status) is a future enhancement.

## Page Location

- **Route**: `/staff`
- **File**: `apps/web/app/(dashboard)/staff/page.tsx`
- **Component**: `StaffPage`

## Features

### Display
- Lists all staff members with key information:
  - Employee Number
  - Name (clickable link to staff detail page)
  - Contact information (email and phone)
  - Location
  - Employment Type
  - Status (Active, On Leave, Terminated)

### Filtering & Search
- **Search**: 
  - Debounced input (400ms delay)
  - Case-insensitive partial match
  - Searches: first name, last name, email, employee number
  - **Note**: Searches fields separately (e.g., "jo" finds "John" but "jo do" won't find "John Doe")
- **Status Filter**: Filter by status (All, Active, On Leave, Terminated)
- **Location Filter**: Filter by location (dropdown populated from `/api/settings/locations`)
- Filters are applied in real-time via query parameters
- URL is shareable (all filters persist in query params)

### Actions
- **Add Staff**: Button to create a new staff member (`/staff/new`)
  - **Visibility**: Only shown to `admin`, `manager`, `superadmin` roles
  - **Role check**: Uses `GET /api/auth/role` endpoint
- **View Details**: Click on staff name or row to view full profile (`/staff/[id]`)

### Pagination
- Default: 25 rows per page
- Shows "Showing X to Y of Z staff" count
- Previous/Next buttons with page numbers
- Filters persist when navigating pages
- URL includes page number (shareable)

### Loading States
- **Skeleton loading**: Shows 5 skeleton rows with shimmer animation during fetch
- **Empty state**: Displays when no staff members exist
- **Error state**: Shows friendly error message with retry button
- Filters disabled during loading

## API Integration

### GET /api/staff

Fetches all staff members for the current tenant with pagination, filtering, and search support.

**Query Parameters:**
- `search` (optional): Search term for name, email, or employee number
  - **Behavior**: Case-insensitive partial match (`ilike`)
  - **Fields searched**: `first_name`, `last_name`, `email`, `employee_number`
  - **Note**: Searches fields separately (e.g., "jo do" will NOT find "John Doe" - search "jo" or "do" separately)
  - **Validation**: Trimmed, empty strings ignored
- `status` (optional): Filter by status (`active`, `on_leave`, `terminated`)
  - **Validation**: Must be one of the valid enum values, invalid values ignored (falls back to no filter)
  - **Invalid examples**: `banana`, `Active`, `on-leave` → ignored
- `location_id` (optional): Filter by location UUID
  - **Validation**: Must be valid UUID format, invalid values ignored
  - **Invalid examples**: `not-a-uuid`, `123`, `abc-def` → ignored
- `page` (optional): Page number (default: 1 if pagination requested)
  - **Validation**: Must be positive integer, invalid values default to 1
  - **Invalid examples**: `0`, `-1`, `abc`, `1.5` → defaults to 1
- `pageSize` (optional): Items per page (default: 25 if pagination requested)
  - **Validation**: Must be positive integer, max 100, invalid values default to 25
  - **Invalid examples**: `0`, `-1`, `abc`, `1000` → defaults to 25 (or capped at 100)

**Pagination:**
- If `page` and `pageSize` are provided, response includes pagination metadata
- If omitted, returns all results (backward compatible)
- Default page size: 25 rows per page

**Sorting:**
- **Default sort**: `created_at DESC` (newest first)
- **Current implementation**: Fixed sort only (no user-configurable sorting)
- Future enhancement: Allow sorting by name, employee_number, status

**Example Request:**
```typescript
GET /api/staff?search=john&status=active&page=1&pageSize=25
```

**Response (with pagination):**
```json
{
  "staff": [
    {
      "id": "uuid",
      "employee_number": "EMP123456",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone": "+44 123 456 7890",
      "employment_type": "full_time",
      "status": "active",
      "locations": {
        "id": "uuid",
        "name": "Main Office"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 150,
    "totalPages": 6
  }
}
```

**Response (without pagination - backward compatible):**
```json
{
  "staff": [
    {
      "id": "uuid",
      "employee_number": "EMP123456",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone": "+44 123 456 7890",
      "employment_type": "full_time",
      "status": "active",
      "locations": {
        "id": "uuid",
        "name": "Main Office"
      }
    }
  ]
}
```

## Staff Creation Flow

### For Invited Staff Members

1. **Invitation Sent**: Admin/Manager sends invitation via `/api/invitations/send`
2. **Invitation Accepted**: Staff member accepts invitation via `/api/invitations/accept`
   - Creates active membership in tenant
3. **Staff Onboarding**: Staff member completes onboarding at `/staff-onboarding/profile`
   - User fills in full name and phone
4. **Onboarding Complete**: Profile marked as complete via `/api/staff-onboarding/complete`
   - **Automatically creates staff record** with:
     - Generated employee number (format: `EMP{timestamp}{random}`)
     - Parsed first_name and last_name from full_name
     - Email and phone from profile
     - Status set to `active`
     - Linked to user_id for proper association
5. **Appears in List**: Staff member now visible in staff list automatically ✅

### Manual Staff Creation

Admins and Managers can manually create staff records:

1. Navigate to `/staff/new`
2. Fill in required fields:
   - Employee Number (required, unique per tenant)
   - First Name (required)
   - Last Name (required)
3. Optionally add:
   - Email, Phone, Date of Birth
   - National Insurance Number
   - Employment Type, Start Date
   - Hourly Rate, Location, Status
4. Submit form → Creates record via `POST /api/staff`

## Related API Routes

### Staff Management

- **GET /api/staff**: List all staff (with filters, pagination, search)
- **POST /api/staff**: Create new staff member
- **GET /api/staff/[id]**: Get staff member details
- **PUT /api/staff/[id]**: Update staff member
- **DELETE /api/staff/[id]**: Delete staff member

### Location Data

- **GET /api/settings/locations**: Get all locations for tenant (used for location filter dropdown)
  - Returns: `{ locations: [{ id, name, address, postcode, ... }] }`
  - Scoped to current tenant automatically

### User Role & Permissions

- **GET /api/auth/role**: Get current user's role in tenant
  - Returns: `{ role: 'admin' | 'manager' | 'staff' | 'superadmin', userId: string }`
  - Used to determine if "Add Staff" button should be visible

### Invitation & Onboarding

- **POST /api/invitations/send**: Send invitation to staff member
- **POST /api/invitations/accept**: Accept invitation (creates membership)
- **GET /api/me/profile**: Get current user profile
- **PUT /api/me/profile**: Update user profile
- **POST /api/staff-onboarding/complete**: Mark staff onboarding as complete

### Staff Details

- **GET /api/staff/[id]/availability**: Get staff availability
- **POST /api/staff/[id]/availability**: Create availability slot
- **GET /api/staff/[id]/documents**: Get staff documents
- **POST /api/staff/[id]/documents**: Upload document
- **GET /api/staff/[id]/wages**: Get staff wage information

## Data Model

### Staff Table Structure

```typescript
interface Staff {
  id: string                    // UUID
  tenant_id: string            // UUID (from context)
  user_id?: string             // UUID (optional, links to profiles)
  employee_number: string      // Unique per tenant
  first_name: string
  last_name: string
  email?: string
  phone?: string
  date_of_birth?: string       // DATE
  national_insurance_number?: string
  employment_type?: 'full_time' | 'part_time' | 'casual' | 'contractor'
  employment_start_date?: string  // DATE
  employment_end_date?: string    // DATE
  hourly_rate?: number         // DECIMAL(10,2)
  location_id?: string         // UUID
  status: 'active' | 'on_leave' | 'terminated'
  created_at: string           // TIMESTAMPTZ
  updated_at: string           // TIMESTAMPTZ
}
```

## Permissions

### Viewing Staff List
- **Allowed Roles**: All authenticated users with active membership
- **RLS Policy**: Users can only see staff from their tenant
- **UI**: No role check needed (all members can view list)

### Creating Staff
- **Allowed Roles**: `admin`, `manager`, `superadmin`
- **Endpoint**: `POST /api/staff`
- **API Enforcement**: Role checked server-side via `getTenantContext()`
- **UI Enforcement**: "Add Staff" button only visible if role from `GET /api/auth/role` is admin/manager/superadmin
- **Validation**: Employee number must be unique per tenant

### Updating Staff
- **Allowed Roles**: `admin`, `manager`, `superadmin`
- **Endpoint**: `PUT /api/staff/[id]`
- **API Enforcement**: Role checked server-side

### Deleting Staff
- **Allowed Roles**: `admin`, `superadmin` only
- **Endpoint**: `DELETE /api/staff/[id]`
- **API Enforcement**: Role checked server-side

## Status Badge Colors & Mapping

**UI Labels → API Values:**
- **"Active"** (UI) → `active` (API) - Green badge (`bg-green-100 text-green-800`)
- **"On Leave"** (UI) → `on_leave` (API) - Yellow badge (`bg-yellow-100 text-yellow-800`)
- **"Terminated"** (UI) → `terminated` (API) - Red badge (`bg-red-100 text-red-800`)

**Important**: UI displays formatted labels (e.g., "On Leave") but API expects enum values (e.g., `on_leave`). The UI automatically converts between formats.

## Display Rules

### Contact Information
- **Email**: Displayed on first line, or "—" if missing
- **Phone**: Displayed on second line (smaller, gray text), or "—" if missing
- **Both missing**: Shows "—" for contact field
- **Text Selection**: Email and phone fields are selectable (users can copy without triggering navigation)
  - Contact column has `onClick` stopPropagation to prevent row navigation
  - Uses `select-text` class to ensure text selection works

### Employment Type Formatting
- `full_time` → "Full-time"
- `part_time` → "Part-time"
- `casual` → "Casual"
- `contractor` → "Contractor"
- `null` → "—"

### Location Display
- Shows `locations.name` from API response
- Displays "—" if location is null or missing

### Name Display
- Format: `{first_name} {last_name}`
- Fallback: If name is empty, shows email
- Final fallback: "Unnamed staff" (should be rare)

## Empty State

When no staff members exist, the page displays:
- Icon: Users/Team icon
- Title: "No staff members yet"
- Description: "Add your first team member to get started. You can add their details, documents, and availability."

## Error Handling

- **401 Unauthorized**: User not authenticated or no tenant context
- **403 Forbidden**: User lacks required permissions
- **404 Not Found**: Staff member not found
- **409 Conflict**: Employee number already exists
- **500 Internal Server Error**: Database or server error

## Responsive Design

### Desktop (>768px)
- Full table view with all columns
- Row hover states
- Clickable rows (navigate to detail page)
- **Text Selection**: Users can select/copy email, phone, or any text without triggering navigation
  - Row click only navigates if no text is selected
  - Contact column stops propagation to allow text selection
  - Name link also clickable (stops propagation)

### Mobile (<768px)
- Card-based layout (no table)
- Each card shows:
  - Name + Status badge (top row)
  - Employee # (monospace, subtle)
  - Contact info (email/phone)
  - Location + Employment Type (with icons)
- Tap entire card to navigate to detail page

## Future Enhancements

- **Sorting**: Allow user to sort by name, employee_number, status, created_at
- **Automatic staff record creation**: Auto-create staff record when onboarding completes
- **Bulk import**: CSV/Excel import functionality
- **Export**: Export staff list to CSV with current filters
- **Advanced filtering**: Date range, employment type, multiple locations
- **Saved views**: Save filter combinations for quick access
- **Staff member linking**: Auto-link staff records to user profiles after onboarding

## Related Pages

- `/staff/new`: Create new staff member
- `/staff/[id]`: View/edit staff member details
- `/settings/invitations`: Manage staff invitations
- `/staff-onboarding/*`: Staff onboarding flow

