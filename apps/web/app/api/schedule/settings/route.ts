import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'
import { getTenantSettings } from '@/lib/schedule/utils'

/**
 * GET /api/schedule/settings
 * Get tenant settings (timezone and staff accept/decline setting)
 */
export async function GET() {
  const { tenantId } = await getTenantContext()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const settings = await getTenantSettings()
    
    if (!settings) {
      return NextResponse.json({
        timezone: 'UTC',
        staff_can_accept_decline_shifts: false,
      })
    }

    return NextResponse.json(settings)
  } catch (error: any) {
    console.error('Error fetching tenant settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

