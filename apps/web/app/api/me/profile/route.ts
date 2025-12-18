import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/me/profile
 * Get current user's profile
 */
export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, avatar_url, created_at, updated_at')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }

  // If profile doesn't exist, create it
  if (!profile) {
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email || '',
        full_name: null,
        phone: null,
      })
      .select('id, email, full_name, phone, avatar_url, created_at, updated_at')
      .single()

    if (createError) {
      console.error('Error creating profile:', createError)
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
    }

    return NextResponse.json({ profile: newProfile })
  }

  return NextResponse.json({ profile })
}

/**
 * PUT /api/me/profile
 * Update current user's profile
 */
export async function PUT(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { full_name, phone } = body

  const updates: any = {}
  if (full_name !== undefined) updates.full_name = full_name || null
  if (phone !== undefined) updates.phone = phone || null

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select('id, email, full_name, phone, avatar_url, updated_at')
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }

  return NextResponse.json({ profile })
}




