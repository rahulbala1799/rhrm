import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * GET /api/staff/debug
 * Diagnostic endpoint to check staff records and their visibility
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

  // Get all staff for this tenant (no filters)
  const { data: allStaff, error } = await supabase
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
      created_at,
      updated_at
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching staff for debug:', error)
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
  }

  // Group by status
  const byStatus = {
    active: allStaff?.filter(s => s.status === 'active') || [],
    on_leave: allStaff?.filter(s => s.status === 'on_leave') || [],
    terminated: allStaff?.filter(s => s.status === 'terminated') || [],
    null_or_other: allStaff?.filter(s => !s.status || !['active', 'on_leave', 'terminated'].includes(s.status)) || [],
  }

  return NextResponse.json({
    total: allStaff?.length || 0,
    by_status: byStatus,
    all_staff: allStaff || [],
    message: 'This is a diagnostic endpoint. Check the by_status breakdown to see if staff are being filtered out.',
  })
}

