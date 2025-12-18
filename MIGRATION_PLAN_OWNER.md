# Tenant Owner Implementation - Migration Plan

## Overview

This plan implements a Tenant Owner concept where the first admin who creates a tenant is protected and cannot be demoted/removed by other admins. Owner can only transfer ownership or step down via secure server-side procedures.

## Migration Order

### Phase 1: Core Owner Infrastructure

**Migration 013: `tenant_owner.sql`**
- Add `owner_user_id` column to tenants (nullable first)
- Backfill owner for existing tenants (earliest admin, or earliest membership)
- Make `owner_user_id` NOT NULL after backfill
- Create `is_tenant_owner()` helper function
- Add trigger to prevent client-side owner changes
- **Dependencies**: None (runs on existing schema)

**Migration 014: `update_tenant_creation_with_owner.sql`**
- Update `create_tenant_with_admin()` function to set `owner_user_id`
- Ensures new tenants always have owner set
- **Dependencies**: 013 (needs owner_user_id column)

### Phase 2: Owner Protection

**Migration 015: `protect_owner_membership.sql`**
- Update memberships RLS policies to protect owner
- Owner's membership cannot be updated/deleted by other admins
- **Dependencies**: 013 (needs `is_tenant_owner()` function)

**Migration 016: `owner_transfer_function.sql`**
- Create `transfer_tenant_ownership()` function
- Includes all safety checks (owner verification, admin requirement, etc.)
- **Dependencies**: 013 (needs `is_tenant_owner()` function)

### Phase 3: Performance & Security Improvements

**Migration 017: `fix_profiles_rls_performance.sql`**
- Optimize profiles RLS policy (remove expensive self-join)
- **Dependencies**: None (standalone optimization)

**Migration 018: `restrict_sensitive_tenant_fields.sql`**
- Add trigger to prevent subscription_tier changes from clients
- **Dependencies**: None (standalone security improvement)

### Phase 4: Invite-Only Onboarding

**Migration 019: `invite_only_memberships.sql`**
- Update memberships insert policy to only allow `status='invited'`
- Active memberships created server-side only
- **Dependencies**: None (policy change only)

### Phase 5: Enhanced Audit Logging

**Migration 020: `audit_membership_changes.sql`**
- Enhance membership audit trigger with owner context
- Add tenant ownership change audit trigger
- **Dependencies**: 013 (needs owner concept)

## API Endpoints Created

### `/api/tenants/transfer-ownership` (POST)
- Server-side only
- Verifies current user is owner
- Calls `transfer_tenant_ownership()` function
- Logs to audit

### `/api/invitations/accept` (POST)
- Server-side only
- Validates invitation token
- Creates active membership (invite-only onboarding)
- Logs to audit

## Testing Checklist

- [ ] New tenant creation sets owner correctly
- [ ] Existing tenants have owner backfilled
- [ ] Owner cannot be demoted by other admins
- [ ] Owner cannot be removed by other admins
- [ ] Owner can transfer ownership successfully
- [ ] Owner transfer fails if no other admin exists
- [ ] Owner transfer promotes target to admin if needed
- [ ] Profiles RLS policy performs well (no heavy joins)
- [ ] Subscription tier cannot be changed by tenant admins
- [ ] Active memberships can only be created via invitation acceptance
- [ ] All ownership transfers logged to audit
- [ ] All membership changes logged with owner context

## Rollback Plan

If issues arise:

1. **Remove owner protection** (migration 015): Drop and recreate policies without owner checks
2. **Disable owner transfer** (migration 016): Revoke execute on function
3. **Revert invite-only** (migration 019): Restore original insert policy
4. **Keep owner_user_id** (migration 013): Column can remain (non-breaking)

## Notes

- Owner is a tenant attribute, not a role
- Owner protection is enforced at RLS level (database-enforced)
- Owner transfer requires service role (server-side only)
- All operations are audit-logged




