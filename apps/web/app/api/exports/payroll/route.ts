import { createClient } from '@/lib/supabase/server'
import { verifyTenantAccess } from '@/lib/auth/get-tenant-context'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getRatesForStaffBatch, findRateForDate } from '@/lib/staff-rates/utils'

/**
 * Export payroll data (CSV)
 * Requires admin role - uses service role for data access
 * Logs export action to audit_logs
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { startDate, endDate, tenantId } = await request.json()

  if (!startDate || !endDate || !tenantId) {
    return NextResponse.json(
      { error: 'startDate, endDate, and tenantId required' },
      { status: 400 }
    )
  }

  // CRITICAL: Validate tenantId against memberships (never trust client state alone)
  // Verify user has active membership in this tenant
  // Verify user has required role (admin) in this tenant
  const hasAccess = await verifyTenantAccess(tenantId, 'admin')
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Admin role required' },
      { status: 403 }
    )
  }

  // Use service role client for data access (bypasses RLS)
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  // Fetch timesheet data
  const { data: timesheets, error } = await serviceClient
    .from('timesheets')
    .select(`
      *,
      staff:staff_id (
        id,
        first_name,
        last_name,
        employee_number
      ),
      shift:shift_id (
        id,
        start_time
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'approved')
    .gte('date', startDate)
    .lte('date', endDate)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 🚨 CRITICAL: Batch fetch rates to avoid N+1 queries
  // Get all unique staff IDs and max date
  const staffIds = Array.from(new Set((timesheets || []).map((ts: any) => ts.staff_id)))
  const maxDate = (timesheets || []).reduce((max: Date, ts: any) => {
    const shiftDate = ts.shift?.start_time ? new Date(ts.shift.start_time) : new Date(ts.date)
    return shiftDate > max ? shiftDate : max
  }, new Date(0))

  // Single query for all rates
  const ratesByStaff = await getRatesForStaffBatch(staffIds, maxDate, serviceClient)

  // Log export action to audit_logs
  await serviceClient.from('audit_logs').insert({
    tenant_id: tenantId,
    user_id: user.id,
    action: 'export',
    resource_type: 'payroll',
    changes: {
      start_date: startDate,
      end_date: endDate,
      record_count: timesheets?.length || 0,
    },
  })

  // Generate CSV
  const headers = [
    'Employee Number',
    'Name',
    'Date',
    'Hours',
    'Rate Used',
    'Total',
  ]

  // Resolve rates in memory (no additional queries)
  const rows = (timesheets || []).map((ts: any) => {
    const staff = ts.staff
    const shiftDate = ts.shift?.start_time 
      ? new Date(ts.shift.start_time)
      : new Date(ts.date)
    
    const staffRates = ratesByStaff.get(ts.staff_id) || []
    const rate = findRateForDate(staffRates, shiftDate) || 0
    
    return [
      staff?.employee_number || '',
      `${staff?.first_name || ''} ${staff?.last_name || ''}`.trim(),
      ts.date,
      ts.total_hours || 0,
      rate,
      (ts.total_hours || 0) * rate,
    ]
  })

  const csv = [
    headers.join(','),
    ...rows.map((row: any[]) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n')

  // Return CSV as download
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="payroll-${tenantId}-${Date.now()}.csv"`,
    },
  })
}

