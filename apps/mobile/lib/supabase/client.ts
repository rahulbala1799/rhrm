import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// Custom storage adapter for Expo SecureStore
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    return await SecureStore.getItemAsync(key)
  },
  setItem: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value)
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key)
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

/**
 * Get active tenant ID from secure storage
 */
export async function getActiveTenantId(): Promise<string | null> {
  return await SecureStore.getItemAsync('active_tenant_id')
}

/**
 * Set active tenant ID in secure storage
 */
export async function setActiveTenantId(tenantId: string): Promise<void> {
  await SecureStore.setItemAsync('active_tenant_id', tenantId)
}

/**
 * Get user's memberships (for tenant switching)
 */
export async function getUserMemberships() {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data: memberships } = await supabase
    .from('memberships')
    .select('tenant_id, role, id, tenants(id, name, slug)')
    .eq('user_id', user.id)
    .eq('status', 'active')

  return memberships || []
}

/**
 * Verify user has access to tenant (client-side check)
 * Note: Server-side validation still required for sensitive operations
 */
export async function verifyTenantAccess(tenantId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return false
  }

  const { data: membership } = await supabase
    .from('memberships')
    .select('id')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .single()

  return !!membership
}


