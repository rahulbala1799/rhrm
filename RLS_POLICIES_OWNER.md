# Updated RLS Policies with Owner Protection

## Core Tables RLS Policies (After Owner Implementation)

### TENANTS TABLE

```sql
-- Users can only read tenants where they have an active membership
CREATE POLICY tenants_select_policy_members ON tenants
    FOR SELECT
    USING (
        public.user_has_membership(auth.uid(), id)
    );

-- Admin: can update tenant where they have admin role
-- Note: owner_user_id changes are blocked by trigger
-- Note: subscription_tier changes are blocked by trigger
CREATE POLICY tenants_update_policy_admin ON tenants
    FOR UPDATE
    USING (
        public.user_has_role_in_tenant(auth.uid(), id, 'admin')
    )
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), id, 'admin')
    );
```

**Protections**:
- `owner_user_id` cannot be changed via client (trigger blocks it)
- `subscription_tier` cannot be changed via client (trigger blocks it)
- Only server-side procedures can modify these fields

### PROFILES TABLE (Optimized)

```sql
-- Users can read their own profile
-- Users can read profiles of users in same tenant (optimized check)
CREATE POLICY profiles_select_policy_all ON profiles
    FOR SELECT
    USING (
        id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM memberships m_viewer
            WHERE m_viewer.user_id = auth.uid()
                AND m_viewer.status = 'active'
                AND EXISTS (
                    SELECT 1
                    FROM memberships m_profile
                    WHERE m_profile.user_id = profiles.id
                        AND m_profile.tenant_id = m_viewer.tenant_id
                        AND m_profile.status = 'active'
                )
        )
    );
```

**Optimization**: Replaced expensive self-join with two EXISTS subqueries for better performance.

### MEMBERSHIPS TABLE (With Owner Protection)

```sql
-- Users can read memberships in tenants where they have active membership
CREATE POLICY memberships_select_policy_tenant_members ON memberships
    FOR SELECT
    USING (
        public.user_has_membership(auth.uid(), tenant_id)
    );

-- Admin: can insert memberships with status='invited' only
-- Active memberships created server-side when invitations are accepted
CREATE POLICY memberships_insert_policy_admin ON memberships
    FOR INSERT
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
        AND status = 'invited' -- Only invited status allowed from client
        AND role != 'superadmin' -- Cannot create superadmin from client
    );

-- Admin: can update memberships EXCEPT:
-- 1. Their own membership
-- 2. The owner's membership (protected)
CREATE POLICY memberships_update_policy_admin ON memberships
    FOR UPDATE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
        AND user_id != auth.uid() -- Cannot modify own membership
        AND NOT public.is_tenant_owner(user_id, tenant_id) -- Cannot modify owner's membership
    )
    WITH CHECK (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
        AND user_id != auth.uid()
        AND NOT public.is_tenant_owner(user_id, tenant_id)
    );

-- Admin: can delete memberships EXCEPT:
-- 1. Their own membership
-- 2. The owner's membership (protected)
CREATE POLICY memberships_delete_policy_admin ON memberships
    FOR DELETE
    USING (
        public.user_has_role_in_tenant(auth.uid(), tenant_id, 'admin')
        AND user_id != auth.uid() -- Cannot delete own membership
        AND NOT public.is_tenant_owner(user_id, tenant_id) -- Cannot delete owner's membership
    );
```

**Owner Protection**:
- Owner's membership cannot be updated by other admins
- Owner's membership cannot be deleted by other admins
- Owner cannot modify their own membership (existing rule)
- Owner can only transfer ownership via server-side procedure

## Helper Functions

### `is_tenant_owner(user_uuid, tenant_uuid)`
- Returns true if user is the tenant owner
- Used in RLS policies to protect owner membership
- SECURITY DEFINER with safe search_path

### `transfer_tenant_ownership(...)`
- Server-side only (no grants to authenticated)
- Performs all safety checks
- Updates owner_user_id (bypasses trigger via service role)
- Returns success/failure with message

## Security Guarantees

1. **Owner Protection**: Owner membership is immutable by other admins
2. **Ownership Transfer**: Only via secure server-side procedure
3. **Minimum Admin**: Transfer ensures at least one admin remains
4. **Invite-Only**: Active memberships created server-side only
5. **Audit Trail**: All ownership and membership changes logged

