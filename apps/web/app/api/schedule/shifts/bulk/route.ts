import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'
import { createShiftAuditLog } from '@/lib/schedule/utils'

/**
 * POST /api/schedule/shifts/bulk
 * Bulk operations on shifts
 */
export async function POST(request: Request) {
  const { tenantId, role } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin and manager can perform bulk operations
  if (role !== 'admin' && role !== 'manager' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
  const body = await request.json()

  const { operation, shifts } = body

  if (!operation || !shifts || !Array.isArray(shifts)) {
    return NextResponse.json(
      { error: 'Missing required fields: operation, shifts (array)' },
      { status: 400 }
    )
  }

  const validOperations = ['create', 'update', 'delete', 'publish', 'unpublish']
  if (!validOperations.includes(operation)) {
    return NextResponse.json(
      { error: `Invalid operation. Must be one of: ${validOperations.join(', ')}` },
      { status: 400 }
    )
  }

  const results = {
    created: 0,
    updated: 0,
    deleted: 0,
    errors: [] as any[],
  }

  // Get user for audit logs
  const {
    data: { user },
  } = await supabase.auth.getUser()

  for (const shift of shifts) {
    try {
      if (operation === 'create') {
        // Similar to POST /api/schedule/shifts
        const { error } = await supabase
          .from('shifts')
          .insert({
            tenant_id: tenantId,
            staff_id: shift.staff_id,
            location_id: shift.location_id,
            start_time: shift.start_time,
            end_time: shift.end_time,
            break_duration_minutes: shift.break_duration_minutes || 0,
            notes: shift.notes || null,
            status: shift.status || 'draft',
            created_by: user?.id || null,
          })

        if (error) {
          results.errors.push({ shift, error: error.message })
        } else {
          results.created++
        }
      } else if (operation === 'update') {
        const { error } = await supabase
          .from('shifts')
          .update(shift)
          .eq('id', shift.id)
          .eq('tenant_id', tenantId)

        if (error) {
          results.errors.push({ shift, error: error.message })
        } else {
          results.updated++
        }
      } else if (operation === 'delete') {
        const { error } = await supabase
          .from('shifts')
          .delete()
          .eq('id', shift.id)
          .eq('tenant_id', tenantId)

        if (error) {
          results.errors.push({ shift, error: error.message })
        } else {
          results.deleted++
        }
      } else if (operation === 'publish') {
        const { error } = await supabase
          .from('shifts')
          .update({ status: 'published' })
          .eq('id', shift.id)
          .eq('tenant_id', tenantId)

        if (error) {
          results.errors.push({ shift, error: error.message })
        } else {
          results.updated++
        }
      } else if (operation === 'unpublish') {
        const { error } = await supabase
          .from('shifts')
          .update({ status: 'draft' })
          .eq('id', shift.id)
          .eq('tenant_id', tenantId)

        if (error) {
          results.errors.push({ shift, error: error.message })
        } else {
          results.updated++
        }
      }
    } catch (error: any) {
      results.errors.push({ shift, error: error.message })
    }
  }

  return NextResponse.json({
    success: true,
    ...results,
  })
}

