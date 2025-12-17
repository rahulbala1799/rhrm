# Tenant Owner Transfer Runbook

## Overview

Tenant ownership transfer is a critical operation that must be performed safely to prevent orphaned tenants or privilege escalation. This runbook describes the safety checks and procedures.

## Safety Checks (Enforced by Database Function)

### 1. Owner Verification
- **Check**: Current user must be the actual tenant owner
- **Why**: Prevents unauthorized ownership transfers
- **Failure**: Returns error "Current user is not the tenant owner"

### 2. Target User Membership
- **Check**: Target user must have active membership in the tenant
- **Why**: Cannot transfer ownership to someone without access
- **Failure**: Returns error "Target user does not have active membership in this tenant"

### 3. Target User Role
- **Check**: Target user must be at least admin (or gets promoted during transfer)
- **Why**: Owner must have admin privileges to manage the tenant
- **Action**: If target is not admin, automatically promotes to admin during transfer

### 4. Minimum Admin Requirement
- **Check**: At least one admin must remain after transfer
- **Why**: Prevents tenant from being left without any admins
- **Calculation**: Counts admins excluding current owner (if being demoted)
- **Failure**: Returns error "Transfer would leave tenant without any admins"

## Transfer Procedure

### Step 1: Owner Initiates Transfer
- Owner calls `/api/tenants/transfer-ownership` with:
  - `newOwnerUserId`: UUID of new owner
  - `demoteOldOwner`: Boolean (optional, default false)

### Step 2: Server-Side Validation
- API route verifies current user is owner (additional check)
- Calls database function `transfer_tenant_ownership()` with service role

### Step 3: Database Function Executes
- Performs all safety checks (1-4 above)
- If all checks pass:
  - Updates `tenants.owner_user_id` to new owner
  - Optionally demotes old owner to manager (if requested and safe)
  - Returns success

### Step 4: Audit Logging
- Ownership transfer logged to `audit_logs` with:
  - `action`: 'update'
  - `resource_type`: 'tenant_ownership'
  - `changes`: Contains old_owner_id, new_owner_id, demote_old_owner flag

## Edge Cases

### Owner Steps Down (Demotes Self)
- Owner can transfer ownership and request demotion
- System ensures at least one other admin exists before allowing demotion
- If no other admin exists, demotion is blocked (ownership transfer still succeeds)

### Owner Removes Self
- Owner cannot delete their own membership (protected by RLS)
- Must transfer ownership first, then new owner can manage old owner's membership

### Last Admin Scenario
- If owner is the only admin, cannot demote self
- Must promote another user to admin first, then transfer ownership

## Protection Mechanisms

### Database Level
- Trigger prevents `owner_user_id` changes from client sessions
- RLS policies prevent owner membership modification by other admins
- Function-level checks ensure safety even if RLS is bypassed

### Application Level
- API route requires authentication
- Additional owner verification before calling database function
- Service role used for actual transfer (bypasses RLS safely)

## Rollback

If transfer fails:
- Database function uses transactions (implicit in function execution)
- If any check fails, entire operation rolls back
- No partial state changes possible

## Monitoring

Monitor these audit log entries:
- `resource_type = 'tenant_ownership'` - All ownership transfers
- `resource_type = 'membership'` with `role_change = true` - Role changes
- `resource_type = 'membership'` with `is_owner = true` - Owner membership changes

## Emergency Procedures

### Owner Account Compromised
1. Platform admin (superadmin) can manually update `tenants.owner_user_id` via service role
2. Must verify new owner has active membership
3. Must ensure at least one admin remains
4. Log action with full context in audit_logs

### Owner Account Deleted
- `owner_user_id` has `ON DELETE RESTRICT` constraint
- Prevents accidental deletion
- If owner account must be deleted:
  1. Transfer ownership first (via emergency procedure)
  2. Then delete account


