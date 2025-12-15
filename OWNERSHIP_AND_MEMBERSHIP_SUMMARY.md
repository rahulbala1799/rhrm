# Ownership and Membership Management - Implementation Summary

## ✅ Completed Features

### 1. Tenant Owner Implementation
- ✅ `owner_user_id` column on `tenants` table (set only at tenant creation)
- ✅ `is_tenant_owner(user_id, tenant_id)` helper function
- ✅ Owner protection: Owner's membership cannot be modified/deleted by other admins
- ✅ Owner cannot leave tenant (must transfer ownership first)

**Migrations:**
- `20240101000013_tenant_owner.sql` - Adds owner_user_id and helper function
- `20240101000014_update_tenant_creation_with_owner.sql` - Sets owner during tenant creation
- `20240101000015_protect_owner_membership.sql` - Protects owner from admin actions

### 2. Membership Policies
- ✅ **Client INSERT**: Only allowed with `status='invited'` (admin role required)
- ✅ **Client UPDATE/DELETE**: Blocked for owner rows
- ✅ **Client Activation**: Cannot change status to `'active'` from client
  - Only server-side invitation acceptance can create active memberships

**Migrations:**
- `20240101000019_invite_only_memberships.sql` - Invite-only INSERT policy
- `20240101000021_membership_activation_restrictions.sql` - Prevents client-side activation

### 3. Server-Only Flows

#### ✅ Create Tenant + First Owner/Admin Membership (Atomic)
- **Function**: `create_tenant_with_admin(p_tenant_name, p_tenant_slug, p_admin_user_id)`
- **API Route**: `POST /api/tenants/create`
- **Behavior**: Creates tenant with `owner_user_id` set, creates first admin membership atomically
- **Security**: Uses service role, canonical path only

**Migration**: `20240101000011_tenant_creation_function.sql` + `20240101000014_update_tenant_creation_with_owner.sql`

#### ✅ Accept Invitation → Activates Membership
- **API Route**: `POST /api/invitations/accept`
- **Behavior**: 
  - Validates invitation token
  - Creates active membership (server-side only)
  - Updates invitation status to 'accepted'
  - Logs to audit

**File**: `apps/web/app/api/invitations/accept/route.ts`

#### ✅ Transfer Ownership (with Safety Checks)
- **Function**: `transfer_tenant_ownership(p_tenant_id, p_current_owner_id, p_new_owner_id, p_demote_old_owner)`
- **API Route**: `POST /api/tenants/transfer-ownership`
- **Safety Checks**:
  - Verifies current user is owner
  - Verifies new owner has active membership
  - Promotes new owner to admin if needed
  - Ensures at least one admin remains
- **Audit**: Logs ownership transfer

**Migration**: `20240101000016_owner_transfer_function.sql`

#### ✅ Self-Leave Tenant (with Safety Checks)
- **Function**: `self_leave_tenant(p_tenant_id, p_user_id)`
- **API Route**: `POST /api/tenants/leave`
- **Safety Checks**:
  - Owner cannot leave (must transfer ownership first)
  - Last admin cannot leave (must promote another admin first)
  - Verifies user has active membership
- **Behavior**: Sets membership status to 'suspended' (soft delete)
- **Audit**: Logs self-leave action

**Migration**: `20240101000022_self_leave_tenant.sql`
**File**: `apps/web/app/api/tenants/leave/route.ts`

### 4. Audit Logging

#### ✅ Invitation Created/Revoked
- **Trigger**: `audit_invitations_changes()` on `invitations` table
- **Tracks**:
  - Invitation creation (with email, role, invited_by)
  - Status changes (accepted, revoked, expired)
  - Invitation deletion

**Migration**: `20240101000023_audit_invitations.sql`

#### ✅ Membership Activated
- **Location**: `apps/web/app/api/invitations/accept/route.ts`
- **Logs**: Membership creation via invitation acceptance
- **Includes**: invitation_id, role, created_via='invitation'

#### ✅ Role Changes
- **Trigger**: `audit_memberships_changes()` on `memberships` table
- **Tracks**: Role changes with old_role/new_role
- **Special handling**: Flags privilege escalation risks

**Migration**: `20240101000020_audit_membership_changes.sql`

#### ✅ Ownership Transfer
- **Trigger**: `audit_tenant_ownership_changes()` on `tenants` table
- **Tracks**: `owner_user_id` changes
- **Includes**: old_owner_id, new_owner_id, ownership_transfer flag

**Migration**: `20240101000020_audit_membership_changes.sql`

## Security Model

### Client-Side Restrictions
- ❌ Cannot create active memberships (only 'invited' status)
- ❌ Cannot activate memberships (status change to 'active' blocked)
- ❌ Cannot modify/delete owner's membership
- ❌ Cannot change `owner_user_id` on tenants
- ❌ Owner cannot leave tenant

### Server-Side Only Operations
- ✅ Tenant creation (atomic with first admin membership)
- ✅ Invitation acceptance (creates active membership)
- ✅ Ownership transfer (with safety checks)
- ✅ Self-leave tenant (with safety checks)

### Audit Coverage
- ✅ All invitation lifecycle events
- ✅ All membership changes (create, update, delete)
- ✅ Role changes (privilege escalation tracking)
- ✅ Ownership transfers
- ✅ Self-leave actions

## API Routes

| Route | Method | Description | Auth Required |
|-------|--------|-------------|---------------|
| `/api/tenants/create` | POST | Create tenant + first admin (atomic) | Authenticated |
| `/api/invitations/send` | POST | Send invitation (admin only) | Admin role |
| `/api/invitations/accept` | POST | Accept invitation → activate membership | Authenticated |
| `/api/tenants/transfer-ownership` | POST | Transfer ownership (owner only) | Owner |
| `/api/tenants/leave` | POST | Self-leave tenant (with safety checks) | Authenticated |

## Database Functions

| Function | Purpose | Access |
|----------|---------|--------|
| `is_tenant_owner(user_id, tenant_id)` | Check if user is tenant owner | Authenticated (for RLS) |
| `create_tenant_with_admin(...)` | Atomic tenant + admin creation | Service role only |
| `transfer_tenant_ownership(...)` | Safe ownership transfer | Service role only |
| `self_leave_tenant(...)` | Safe self-leave with checks | Service role only |

## Migration Order

1. `20240101000013_tenant_owner.sql` - Owner column and helper
2. `20240101000014_update_tenant_creation_with_owner.sql` - Set owner on creation
3. `20240101000015_protect_owner_membership.sql` - Protect owner membership
4. `20240101000016_owner_transfer_function.sql` - Ownership transfer
5. `20240101000019_invite_only_memberships.sql` - Invite-only INSERT
6. `20240101000020_audit_membership_changes.sql` - Membership audit
7. `20240101000021_membership_activation_restrictions.sql` - Prevent client activation
8. `20240101000022_self_leave_tenant.sql` - Self-leave function
9. `20240101000023_audit_invitations.sql` - Invitation audit

## Testing Checklist

- [ ] Tenant creation sets owner_user_id correctly
- [ ] Owner cannot be demoted/removed by other admins
- [ ] Client cannot create active memberships (only 'invited')
- [ ] Client cannot activate memberships (status change blocked)
- [ ] Invitation acceptance creates active membership (server-side)
- [ ] Ownership transfer works with all safety checks
- [ ] Owner cannot leave tenant
- [ ] Last admin cannot leave tenant
- [ ] All audit logs are created correctly
- [ ] Invitation created/revoked events are logged
- [ ] Role changes are logged with old/new roles
- [ ] Ownership transfers are logged

