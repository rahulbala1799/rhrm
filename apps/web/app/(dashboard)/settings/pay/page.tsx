'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import { getCurrentPayPeriod } from '@/lib/pay-period/utils'
import type { PayPeriodConfig } from '@/lib/pay-period/utils'

export default function PayPeriodSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [config, setConfig] = useState<PayPeriodConfig>({
    type: 'weekly',
    week_starts_on: 'monday'
  })
  const [preview, setPreview] = useState<Array<{ start: string, end: string }>>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  useEffect(() => {
    fetchConfig()
    fetchRole()
  }, [])

  useEffect(() => {
    if (config.type) {
      generatePreview()
    }
  }, [config])

  const fetchRole = async () => {
    try {
      const response = await fetch('/api/auth/role')
      if (response.ok) {
        const data = await response.json()
        setRole(data.role)
      }
    } catch (error) {
      console.error('Error fetching role:', error)
    }
  }

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/settings/pay-period')
      if (!response.ok) throw new Error('Failed to fetch')
      const { config: fetchedConfig } = await response.json()
      setConfig(fetchedConfig)
    } catch (error) {
      console.error('Error fetching config:', error)
      setError('Failed to load pay period settings')
    } finally {
      setLoading(false)
    }
  }

  const generatePreview = () => {
    try {
      const previews = []
      let currentDate = new Date()
      const timezone = 'UTC' // TODO: Get from tenant settings
      
      for (let i = 0; i < 3; i++) {
        const period = getCurrentPayPeriod(currentDate, config, timezone)
        previews.push({
          start: period.start.toISOString().split('T')[0],
          end: period.end.toISOString().split('T')[0]
        })
        currentDate = period.end
      }
      
      setPreview(previews)
    } catch (error) {
      console.error('Error generating preview:', error)
      setPreview([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // Validate fortnightly requires first_period_start
      if (config.type === 'fortnightly' && !config.first_period_start) {
        setError('Fortnightly pay period requires a start date')
        setSaving(false)
        return
      }

      const confirmed = window.confirm(
        'Changing pay period configuration will affect future overtime calculations.\n' +
        'The change will apply immediately to all future pay period calculations.\n' +
        'Historical overtime calculations will NOT be recalculated.\n\n' +
        'Are you sure you want to proceed?'
      )

      if (!confirmed) {
        setSaving(false)
        return
      }

      const response = await fetch('/api/settings/pay-period', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error: any) {
      setError(error.message || 'Failed to save pay period settings')
    } finally {
      setSaving(false)
    }
  }

  const canEdit = role === 'admin' || role === 'superadmin'
  const canView = role === 'admin' || role === 'superadmin' || role === 'manager'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p className="ml-3 text-sm text-gray-600">Loading pay period settings...</p>
      </div>
    )
  }

  if (!canView) {
    return (
      <div>
        <PageHeader
          title="Pay Period Settings"
          description="Configure pay periods for overtime calculations"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Settings', href: '/settings/company' },
            { label: 'Pay Period' },
          ]}
        />
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">You don't have permission to view pay period settings.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Pay Period Settings"
        description="Configure pay periods for overtime calculations"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings/company' },
          { label: 'Pay Period' },
        ]}
      />

      {!canEdit && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>View Only:</strong> You can view pay period settings but cannot make changes. Only admins can modify these settings.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">Pay period settings saved successfully!</p>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pay Period Type <span className="text-red-500">*</span>
            </label>
            <select
              value={config.type}
              onChange={(e) => {
                const newType = e.target.value as PayPeriodConfig['type']
                setConfig({
                  ...config,
                  type: newType,
                  // Reset type-specific fields when changing type
                  week_starts_on: newType === 'weekly' ? 'monday' : config.week_starts_on,
                  first_period_start: newType === 'fortnightly' ? config.first_period_start : undefined,
                  first_period_end: newType === 'semi-monthly' ? 15 : config.first_period_end,
                  monthly_starts_on: newType === 'monthly' ? 1 : config.monthly_starts_on,
                })
              }}
              disabled={!canEdit}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            >
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="semi-monthly">Semi-Monthly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {config.type === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Week Starts On <span className="text-red-500">*</span>
              </label>
              <select
                value={config.week_starts_on || 'monday'}
                onChange={(e) => setConfig({ ...config, week_starts_on: e.target.value })}
                disabled={!canEdit}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="monday">Monday</option>
                <option value="tuesday">Tuesday</option>
                <option value="wednesday">Wednesday</option>
                <option value="thursday">Thursday</option>
                <option value="friday">Friday</option>
                <option value="saturday">Saturday</option>
                <option value="sunday">Sunday</option>
              </select>
            </div>
          )}

          {config.type === 'fortnightly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Period Starts On <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={config.first_period_start || ''}
                onChange={(e) => setConfig({ ...config, first_period_start: e.target.value })}
                disabled={!canEdit}
                required={config.type === 'fortnightly'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                The date when the first pay period starts. All subsequent periods will be calculated from this date.
              </p>
            </div>
          )}

          {config.type === 'semi-monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Period Ends On (Day of Month) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="15"
                value={config.first_period_end || 15}
                onChange={(e) => setConfig({ ...config, first_period_end: parseInt(e.target.value) })}
                disabled={!canEdit}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                The day of the month when the first period ends (1-15). The second period runs from the next day to the end of the month.
              </p>
            </div>
          )}

          {config.type === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Period Starts On (Day of Month) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={config.monthly_starts_on || 1}
                onChange={(e) => setConfig({ ...config, monthly_starts_on: parseInt(e.target.value) })}
                disabled={!canEdit}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                The day of the month when each pay period starts (1-31). For months with fewer days, the period will start on the last day of that month.
              </p>
            </div>
          )}

          {preview.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Preview: Next 3 Pay Periods</h3>
              <div className="space-y-2">
                {preview.map((period, index) => (
                  <div key={index} className="text-sm text-gray-700">
                    <strong>Period {index + 1}:</strong> {period.start} to {period.end}
                  </div>
                ))}
              </div>
            </div>
          )}

          {canEdit && (
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push('/settings/company')}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

