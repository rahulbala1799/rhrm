import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * GET /api/staff/debug-invitations
 * Diagnostic endpoint to check invitations and their corresponding staff records
 * Only accessible to admins/managers for troubleshooting
 */
export async function GET() {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and manager can access this
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()

  // Get all accepted invitations for this tenant
  const { data: acceptedInvitations, error: inviteError } = await supabase
    .from('invitations')
    .select(`
      id,
      email,
      role,
      status,
      accepted_at,
      tenant_id
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'accepted')
    .order('accepted_at', { ascending: false })

  if (inviteError) {
    console.error('Error fetching invitations:', inviteError)
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
  }

  // Get all staff for this tenant
  const { data: allStaff, error: staffError } = await supabase
    .from('staff')
    .select(`
      id,
      employee_number,
      first_name,
      last_name,
      email,
      status,
      user_id,
      tenant_id,
      created_at
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (staffError) {
    console.error('Error fetching staff:', staffError)
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
  }

  // Get memberships to link invitations to users
  const { data: memberships, error: membershipError } = await supabase
    .from('memberships')
    .select(`
      id,
      user_id,
      tenant_id,
      role,
      status,
      joined_at
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  if (membershipError) {
    console.error('Error fetching memberships:', membershipError)
  }

  // Match invitations to staff records via user_id
  const matched = (acceptedInvitations || []).map((invitation) => {
    // Find membership for this invitation email
    const membership = memberships?.find((m) => {
      // We need to find membership by matching invitation email to user email
      // This is a bit indirect - we'll need to check profiles
      return true // Placeholder
    })

    // Find staff record by email or user_id
    const staffRecord = allStaff?.find((s) => {
      if (membership && s.user_id === membership.user_id) {
        return true
      }
      if (s.email === invitation.email) {
        return true
      }
      return false
    })

    return {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        accepted_at: invitation.accepted_at,
      },
      has_membership: !!membership,
      membership: membership ? {
        user_id: membership.user_id,
        role: membership.role,
        joined_at: membership.joined_at,
      } : null,
      has_staff_record: !!staffRecord,
      staff_record: staffRecord ? {
        id: staffRecord.id,
        employee_number: staffRecord.employee_number,
        name: `${staffRecord.first_name} ${staffRecord.last_name}`,
        email: staffRecord.email,
        status: staffRecord.status,
        created_at: staffRecord.created_at,
      } : null,
    }
  })

  // Get all user emails for accepted invitations to match with memberships
  const userEmails = (acceptedInvitations || []).map((inv) => inv.email)
  
  // Get profiles for these emails
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('email', userEmails)

  // Better matching: link invitation -> profile -> membership -> staff
  const betterMatched = (acceptedInvitations || []).map((invitation) => {
    const profile = profiles?.find((p) => p.email === invitation.email)
    const membership = profile ? memberships?.find((m) => m.user_id === profile.id) : null
    const staffRecord = membership ? allStaff?.find((s) => s.user_id === membership.user_id) : null

    return {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        accepted_at: invitation.accepted_at,
      },
      profile: profile ? {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
      } : null,
      membership: membership ? {
        id: membership.id,
        user_id: membership.user_id,
        role: membership.role,
        joined_at: membership.joined_at,
      } : null,
      staff_record: staffRecord ? {
        id: staffRecord.id,
        employee_number: staffRecord.employee_number,
        name: `${staffRecord.first_name} ${staffRecord.last_name}`,
        email: staffRecord.email,
        status: staffRecord.status,
        created_at: staffRecord.created_at,
      } : null,
      issue: !profile ? 'No profile found for invitation email' :
             !membership ? 'No membership found (invitation may not have been accepted properly)' :
             !staffRecord && invitation.role === 'staff' ? 'No staff record found (should have been created on acceptance)' :
             null,
    }
  })

  return NextResponse.json({
    summary: {
      total_accepted_invitations: acceptedInvitations?.length || 0,
      total_staff_records: allStaff?.length || 0,
      total_memberships: memberships?.length || 0,
      staff_without_invitations: allStaff?.filter((s) => {
        // Staff that don't have a corresponding accepted invitation
        return !betterMatched.some((m) => m.staff_record?.id === s.id)
      }).length || 0,
    },
    matched_invitations: betterMatched,
    all_staff: allStaff || [],
    message: 'Check the matched_invitations array to see which invitations have staff records and which are missing them.',
  })
}

