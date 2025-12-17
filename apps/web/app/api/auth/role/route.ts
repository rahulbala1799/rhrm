import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'

/**
 * Get current user's role
 */
export async function GET() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { role } = await getTenantContext()

  return NextResponse.json({
    role: role || 'staff',
    userId: user.id,
  })
}

