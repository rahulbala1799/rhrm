import { createClient } from '@/lib/supabase/server'
import { verifyTenantAccess } from '@/lib/auth/get-tenant-context'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * GET /api/set-active-tenant?tenant_id=UUID
 * Sets the active_tenant_id cookie and redirects to /dashboard.
 * Used when user has a membership but no cookie (e.g. after fresh login).
 */
export async function GET(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenant_id')

  if (!tenantId) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  const hasAccess = await verifyTenantAccess(tenantId, 'staff')
  if (!hasAccess) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  const cookieStore = await cookies()
  cookieStore.set('active_tenant_id', tenantId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
