import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * Check slug availability (advisory only)
 * Final authority is database UNIQUE constraint on tenants.slug
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  if (!slug) {
    return NextResponse.json(
      { error: 'slug parameter is required' },
      { status: 400 }
    )
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: 'Invalid slug format' },
      { status: 400 }
    )
  }

  // Use service role to check availability
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

  const { data: existingTenant } = await serviceClient
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single()

  return NextResponse.json({
    available: !existingTenant,
  })
}


