import { createClient } from '@/lib/supabase/server'
import { verifyTenantAccess } from '@/lib/auth/get-tenant-context'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * Switch active tenant (sets cookie)
 * User must have active membership in the tenant
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tenantId } = await request.json()

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
  }

  // Verify user has active membership in this tenant
  const hasAccess = await verifyTenantAccess(tenantId, 'staff')
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Access denied to this tenant' },
      { status: 403 }
    )
  }

  // Set active tenant cookie
  const cookieStore = await cookies()
  cookieStore.set('active_tenant_id', tenantId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })

  return NextResponse.json({ success: true, tenantId })
}

