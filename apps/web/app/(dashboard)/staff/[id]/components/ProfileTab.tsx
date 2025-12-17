'use client'

import { useState } from 'react'

interface Staff {
  id: string
  employee_number: string
  first_name: string
  last_name: string
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
  national_insurance_number: string | null
}

interface ProfileTabProps {
  staff: Staff
  editing: boolean
  formRef?: (ref: HTMLFormElement | null) => void
  onSave: (data: any) => Promise<void>
}

export default function ProfileTab({ staff, editing, formRef, onSave }: ProfileTabProps) {
  const [formData, setFormData] = useState({
    preferred_name: staff.preferred_name || '',
    email: staff.email || '',
    phone: staff.phone || '',
    date_of_birth: staff.date_of_birth || '',
    address_line_1: staff.address_line_1 || '',
    address_line_2: staff.address_line_2 || '',
    city: staff.city || '',
    postcode: staff.postcode || '',
    country: staff.country || '',
    emergency_contact_name: staff.emergency_contact_name || '',
    emergency_contact_relationship: staff.emergency_contact_relationship || '',
    emergency_contact_phone: staff.emergency_contact_phone || '',
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(formData)
  }

  if (editing) {
    return (
      <form
        ref={(el) => formRef?.(el)}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* Entered by Staff Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Entered by Staff</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="md:col-span-2">
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
            <div className="md:col-span-2">
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

        {/* HR Information Section (Read-only) */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">HR Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">First Name</label>
              <p className="text-gray-900">{staff.first_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Last Name</label>
              <p className="text-gray-900">{staff.last_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Employee Number</label>
              <p className="text-gray-900 font-mono">{staff.employee_number}</p>
            </div>
            {staff.national_insurance_number && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">National Insurance Number</label>
                <p className="text-gray-900 font-mono">{staff.national_insurance_number}</p>
              </div>
            )}
          </div>
        </div>
      </form>
    )
  }

  // View Mode
  return (
    <div className="space-y-6">
      {/* Entered by Staff Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Entered by Staff</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Preferred Name</label>
            <p className="text-gray-900">{staff.preferred_name || '—'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
            <p className="text-gray-900">{staff.email || '—'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
            <p className="text-gray-900">{staff.phone || '—'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Date of Birth</label>
            <p className="text-gray-900">{formatDate(staff.date_of_birth)}</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
            <p className="text-gray-900">
              {staff.address_line_1 || staff.city || staff.postcode ? (
                <>
                  {staff.address_line_1 && <>{staff.address_line_1}<br /></>}
                  {staff.address_line_2 && <>{staff.address_line_2}<br /></>}
                  {staff.city && staff.postcode ? `${staff.city}, ${staff.postcode}` : staff.city || staff.postcode}
                  {staff.country && <><br />{staff.country}</>}
                </>
              ) : '—'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Emergency Contact Name</label>
            <p className="text-gray-900">{staff.emergency_contact_name || '—'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Emergency Contact Relationship</label>
            <p className="text-gray-900">{staff.emergency_contact_relationship || '—'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Emergency Contact Phone</label>
            <p className="text-gray-900">{staff.emergency_contact_phone || '—'}</p>
          </div>
        </div>
      </div>

      {/* HR Information Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">HR Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">First Name</label>
            <p className="text-gray-900">{staff.first_name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Last Name</label>
            <p className="text-gray-900">{staff.last_name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Employee Number</label>
            <p className="text-gray-900 font-mono">{staff.employee_number}</p>
          </div>
          {staff.national_insurance_number && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">National Insurance Number</label>
              <p className="text-gray-900 font-mono">{staff.national_insurance_number}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

