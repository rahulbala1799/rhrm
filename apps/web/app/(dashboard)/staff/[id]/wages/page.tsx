'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import { useFormatCurrency } from '@/app/(dashboard)/hooks/useFormatCurrency'

interface Wages {
  staff_id: string
  first_name: string
  last_name: string
  hourly_rate: number | null
  employment_type: string | null
  updated_at?: string
}

export default function StaffWagesPage() {
  const params = useParams()
  const { format, symbol } = useFormatCurrency()
  const [wages, setWages] = useState<Wages | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [hourlyRate, setHourlyRate] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (params.id) {
      fetchWages()
    }
  }, [params.id])

  const fetchWages = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/staff/${params.id}/wages`)
      if (response.ok) {
        const data = await response.json()
        setWages(data.wages)
        setHourlyRate(data.wages.hourly_rate?.toString() || '')
      }
    } catch (error) {
      console.error('Error fetching wages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const rate = parseFloat(hourlyRate)
    if (isNaN(rate) || rate < 0) {
      setError('Please enter a valid hourly rate')
      return
    }

    try {
      const response = await fetch(`/api/staff/${params.id}/wages`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hourly_rate: rate }),
      })

      const data = await response.json()

      if (response.ok) {
        setWages(data.wages)
        setEditing(false)
        setSuccess('Hourly rate updated successfully')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Failed to update hourly rate')
      }
    } catch (error) {
      console.error('Error updating wages:', error)
      setError('An unexpected error occurred')
    }
  }

  const formatEmploymentType = (type: string | null) => {
    if (!type) return '-'
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const calculateWeeklyEarnings = (hourlyRate: number, hoursPerWeek: number) => {
    return (hourlyRate * hoursPerWeek).toFixed(2)
  }

  const calculateMonthlyEarnings = (hourlyRate: number, hoursPerWeek: number) => {
    return ((hourlyRate * hoursPerWeek * 52) / 12).toFixed(2)
  }

  const calculateAnnualEarnings = (hourlyRate: number, hoursPerWeek: number) => {
    return (hourlyRate * hoursPerWeek * 52).toFixed(2)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p className="ml-3 text-sm text-gray-600">Loading wages...</p>
      </div>
    )
  }

  if (!wages) {
    return null
  }

  return (
    <div>
      <PageHeader
        title="Wages & Pay Rules"
        description="Configure pay rates and wage rules for this staff member"
        action={
          wages.hourly_rate && !editing ? (
            <button 
              onClick={() => setEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
            >
              Update Pay Rate
            </button>
          ) : null
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Staff', href: '/staff' },
          { label: 'Profile', href: `/staff/${params.id}` },
          { label: 'Wages' },
        ]}
      />

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {success}
        </div>
      )}

      {!wages.hourly_rate || editing ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {wages.hourly_rate ? 'Update Hourly Rate' : 'Set Hourly Rate'}
          </h3>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Staff Member
              </label>
              <p className="text-gray-900">{wages.first_name} {wages.last_name}</p>
              <p className="text-sm text-gray-500 mt-1">
                Employment Type: {formatEmploymentType(wages.employment_type)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hourly Rate ({symbol}) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">{symbol}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  required
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="12.50"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Note: Ensure the hourly rate complies with your local minimum wage regulations.
              </p>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                {wages.hourly_rate ? 'Update Rate' : 'Set Rate'}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false)
                    setHourlyRate(wages.hourly_rate?.toString() || '')
                    setError('')
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Pay Rate</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-600">Staff Member</label>
                <p className="text-gray-900 mt-1 text-lg">{wages.first_name} {wages.last_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Employment Type</label>
                <p className="text-gray-900 mt-1 text-lg">{formatEmploymentType(wages.employment_type)}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-600">Hourly Rate</label>
                <p className="text-gray-900 mt-1 text-3xl font-bold">{format(wages.hourly_rate)}</p>
                <p className="text-xs text-gray-500 mt-1">per hour</p>
              </div>
            </div>
          </div>

          {wages.hourly_rate && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Estimated Earnings</h3>
              <p className="text-sm text-gray-600 mb-4">Based on different weekly hour scenarios</p>
              
              <div className="space-y-4">
                {[20, 37.5, 40].map((hours) => {
                  const rate = wages.hourly_rate!
                  return (
                    <div key={hours} className="border-t border-gray-200 pt-4 first:border-0 first:pt-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900">{hours} hours per week</h4>
                        <span className="text-xs text-gray-500">
                          {hours >= 37.5 ? 'Full-time' : 'Part-time'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-600">Weekly</label>
                          <p className="text-gray-900 mt-1 font-semibold">{format(parseFloat(calculateWeeklyEarnings(rate, hours)))}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Monthly</label>
                          <p className="text-gray-900 mt-1 font-semibold">{format(parseFloat(calculateMonthlyEarnings(rate, hours)))}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Annual</label>
                          <p className="text-gray-900 mt-1 font-semibold">{format(parseFloat(calculateAnnualEarnings(rate, hours)))}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> These are gross earnings estimates before tax, National Insurance, and other deductions. 
                  Actual earnings will vary based on hours worked, overtime, and other factors.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
