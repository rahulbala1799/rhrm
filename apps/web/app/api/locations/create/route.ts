import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Create location after tenant creation
 * Non-atomic: Tenant creation succeeds even if locations fail
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { tenantId, name, addressLine1, city, postcode, country, phone, isDefault } = body

  if (!tenantId || !name || !addressLine1 || !city || !postcode) {
    return NextResponse.json(
      { error: 'tenantId, name, addressLine1, city, and postcode are required' },
      { status: 400 }
    )
  }

  // Verify user has admin access to tenant
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .single()

  if (!membership || (membership.role !== 'admin' && membership.role !== 'superadmin')) {
    return NextResponse.json(
      { error: 'Unauthorized - admin access required' },
      { status: 403 }
    )
  }

  // Get existing locations to check for default
  if (isDefault) {
    // Unset other defaults by updating their settings
    const { data: existingLocations } = await supabase
      .from('locations')
      .select('id, settings')
      .eq('tenant_id', tenantId)

    if (existingLocations) {
      for (const loc of existingLocations) {
        const settings = (loc.settings as any) || {}
        if (settings.isDefault) {
          await supabase
            .from('locations')
            .update({
              settings: { ...settings, isDefault: false },
            })
            .eq('id', loc.id)
        }
      }
    }
  }

  // Create location - store address details in settings JSONB
  const settings: any = {
    addressLine1: addressLine1,
    city: city,
    country: country || null,
    isDefault: isDefault || false,
  }

  const { data: location, error } = await supabase
    .from('locations')
    .insert({
      tenant_id: tenantId,
      name,
      address: addressLine1, // Store primary address line
      postcode,
      phone: phone || null,
      settings,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating location:', error)
    return NextResponse.json(
      { error: 'Failed to create location', details: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    location,
  })
}

