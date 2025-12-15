import { getActiveTenantId } from '../supabase/client'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'

/**
 * API client for server-side operations
 * Used for sensitive actions that require server validation
 */
export class ApiClient {
  private async getHeaders() {
    const { supabase } = await import('../supabase/client')
    const {
      data: { session },
    } = await supabase.auth.getSession()

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token || ''}`,
    }
  }

  async sendInvitation(email: string, role: string) {
    const tenantId = await getActiveTenantId()
    if (!tenantId) {
      throw new Error('No active tenant')
    }

    const response = await fetch(`${API_URL}/api/invitations/send`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ email, role }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to send invitation')
    }

    return response.json()
  }

  async exportPayroll(startDate: string, endDate: string) {
    const tenantId = await getActiveTenantId()
    if (!tenantId) {
      throw new Error('No active tenant')
    }

    const response = await fetch(`${API_URL}/api/exports/payroll`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ startDate, endDate }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to export payroll')
    }

    // Return blob for download
    return response.blob()
  }

  async switchTenant(tenantId: string) {
    const response = await fetch(`${API_URL}/api/tenants/switch`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ tenantId }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to switch tenant')
    }

    const { setActiveTenantId } = await import('../supabase/client')
    await setActiveTenantId(tenantId)

    return response.json()
  }
}

export const apiClient = new ApiClient()

