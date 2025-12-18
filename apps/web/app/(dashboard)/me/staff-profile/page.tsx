'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'

interface Staff {
  id: string
  preferred_name: string | null
  email: string | null
  phone: string | null
  date_of_birth: string | null
  address_line_1: string | null
  address_line_2: string | null
  city: string | null
  postcode: string | null
  country: string | null
  emergency_contact_name: string | null
  emergency_contact_relationship: string | null
  emergency_contact_phone: string | null
  // Read-only admin fields (for transparency)
  employment_type: string | null
  job_title: string | null
  department: string | null
  location_id: string | null
  status: string
  pay_type: string | null
  hourly_rate: number | null
  salary_amount: number | null
  pay_frequency: string | null
  contracted_weekly_hours: number | null
  min_hours_per_week: number | null
  max_hours_per_week: number | null
  locations: {
    id: string
    name: string
  } | null
}

export default function StaffProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [staff, setStaff] = useState<Staff | null>(null)
  const [formData, setFormData] = useState({
    preferred_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    postcode: '',
    country: '',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_phone: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/me/staff-profile')
      if (response.ok) {
        const data = await response.json()
        setStaff(data.staff)
        setFormData({
          preferred_name: data.staff.preferred_name || '',
          email: data.staff.email || '',
          phone: data.staff.phone || '',
          date_of_birth: data.staff.date_of_birth || '',
          address_line_1: data.staff.address_line_1 || '',
          address_line_2: data.staff.address_line_2 || '',
          city: data.staff.city || '',
          postcode: data.staff.postcode || '',
          country: data.staff.country || '',
          emergency_contact_name: data.staff.emergency_contact_name || '',
          emergency_contact_relationship: data.staff.emergency_contact_relationship || '',
          emergency_contact_phone: data.staff.emergency_contact_phone || '',
        })
      } else if (response.status === 404) {
        setError('Staff record not found. Please contact your administrator.')
      } else {
        setError('Failed to load profile')
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/me/staff-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save profile')
      }

      const data = await response.json()
      setStaff(data.staff)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const formatEmploymentType = (type: string | null) => {
    if (!type) return '—'
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '—'
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount)
  }

  if (loading) {
    return (
      <div>
        <PageHeader
          title="My Staff Profile"
          description="Update your personal information"
        />
        <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !staff) {
    return (
      <div>
        <PageHeader
          title="My Staff Profile"
          description="Update your personal information"
        />
        <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchProfile}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="My Staff Profile"
        description="Update your personal information"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'My Staff Profile' },
        ]}
      />

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">Profile updated successfully!</p>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {/* Identity & Contact Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Identity & Contact</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Name
              </label>
              <input
                type="text"
                value={formData.preferred_name}
                onChange={(e) => setFormData({ ...formData, preferred_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Address Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Address</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Line 1
              </label>
              <input
                type="text"
                value={formData.address_line_1}
                onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Line 2
              </label>
              <input
                type="text"
                value={formData.address_line_2}
                onChange={(e) => setFormData({ ...formData, address_line_2: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postcode
                </label>
                <input
                  type="text"
                  value={formData.postcode}
                  onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Emergency Contact Name
              </label>
              <input
                type="text"
                value={formData.emergency_contact_name}
                onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Emergency Contact Relationship
              </label>
              <input
                type="text"
                value={formData.emergency_contact_relationship}
                onChange={(e) => setFormData({ ...formData, emergency_contact_relationship: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Spouse, Parent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Emergency Contact Phone
              </label>
              <input
                type="tel"
                value={formData.emergency_contact_phone}
                onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Read-Only Admin Fields (Optional - for transparency) */}
        {staff && (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Information (Read-Only)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Employment Type</label>
                <p className="text-gray-900">{formatEmploymentType(staff.employment_type)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Job Title</label>
                <p className="text-gray-900">{staff.job_title || '—'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Department</label>
                <p className="text-gray-900">{staff.department || '—'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Location</label>
                <p className="text-gray-900">{staff.locations?.name || '—'}</p>
              </div>
              {staff.pay_type && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Pay Type</label>
                    <p className="text-gray-900">
                      {staff.pay_type === 'hourly' && staff.hourly_rate
                        ? `${formatCurrency(staff.hourly_rate)} per hour, ${staff.pay_frequency || ''}`
                        : staff.pay_type === 'salary' && staff.salary_amount
                        ? `${formatCurrency(staff.salary_amount)} per ${staff.pay_frequency || ''}`
                        : '—'}
                    </p>
                  </div>
                  {(staff.contracted_weekly_hours || (staff.min_hours_per_week && staff.max_hours_per_week)) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Working Hours</label>
                      <p className="text-gray-900">
                        {staff.contracted_weekly_hours
                          ? `${staff.contracted_weekly_hours} hours/week`
                          : staff.min_hours_per_week && staff.max_hours_per_week
                          ? `${staff.min_hours_per_week}-${staff.max_hours_per_week} hours/week`
                          : '—'}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}


