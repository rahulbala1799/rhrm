'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import Link from 'next/link'

interface Staff {
  id: string
  employee_number: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  date_of_birth: string | null
  national_insurance_number: string | null
  employment_type: string | null
  employment_start_date: string | null
  employment_end_date: string | null
  hourly_rate: number | null
  status: string
  created_at: string
  updated_at: string
  locations: {
    id: string
    name: string
    address: string | null
    postcode: string | null
  } | null
}

export default function StaffProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [staff, setStaff] = useState<Staff | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchStaff()
    }
  }, [params.id])

  const fetchStaff = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/staff/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setStaff(data.staff)
      } else if (response.status === 404) {
        router.push('/staff')
      }
    } catch (error) {
      console.error('Error fetching staff:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatEmploymentType = (type: string | null) => {
    if (!type) return '-'
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      on_leave: 'bg-yellow-100 text-yellow-800',
      terminated: 'bg-red-100 text-red-800',
    }
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p className="ml-3 text-sm text-gray-600">Loading staff member...</p>
      </div>
    )
  }

  if (!staff) {
    return null
  }

  return (
    <div>
      <PageHeader
        title="Staff Profile"
        description="View and manage staff member details"
        action={
          <button 
            onClick={() => setEditing(!editing)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            {editing ? 'Cancel Edit' : 'Edit Profile'}
          </button>
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Staff', href: '/staff' },
          { label: 'Profile' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
              <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(staff.status)}`}>
                {staff.status.replace('_', ' ')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Employee Number</label>
                <p className="text-gray-900 mt-1">{staff.employee_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Name</label>
                <p className="text-gray-900 mt-1">{staff.first_name} {staff.last_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className="text-gray-900 mt-1">{staff.email || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Phone</label>
                <p className="text-gray-900 mt-1">{staff.phone || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Date of Birth</label>
                <p className="text-gray-900 mt-1">{formatDate(staff.date_of_birth)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">National Insurance</label>
                <p className="text-gray-900 mt-1">{staff.national_insurance_number || '-'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Employment Type</label>
                <p className="text-gray-900 mt-1">{formatEmploymentType(staff.employment_type)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Hourly Rate</label>
                <p className="text-gray-900 mt-1">
                  {staff.hourly_rate ? `£${staff.hourly_rate.toFixed(2)}/hour` : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Location</label>
                <p className="text-gray-900 mt-1">{staff.locations?.name || '-'}</p>
                {staff.locations?.address && (
                  <p className="text-sm text-gray-500 mt-1">
                    {staff.locations.address}
                    {staff.locations.postcode && `, ${staff.locations.postcode}`}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Start Date</label>
                <p className="text-gray-900 mt-1">{formatDate(staff.employment_start_date)}</p>
              </div>
              {staff.employment_end_date && (
                <div>
                  <label className="text-sm font-medium text-gray-600">End Date</label>
                  <p className="text-gray-900 mt-1">{formatDate(staff.employment_end_date)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
            <div className="space-y-2">
              <Link
                href={`/staff/${params.id}/documents`}
                className="flex items-center px-4 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
              >
                <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Documents
              </Link>
              <Link
                href={`/staff/${params.id}/wages`}
                className="flex items-center px-4 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
              >
                <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Wages & Pay Rules
              </Link>
              <Link
                href={`/staff/${params.id}/availability`}
                className="flex items-center px-4 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
              >
                <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Availability
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="space-y-2">
              <button className="w-full px-4 py-2 text-left rounded-lg hover:bg-gray-50 text-sm text-gray-700">
                View Schedule
              </button>
              <button className="w-full px-4 py-2 text-left rounded-lg hover:bg-gray-50 text-sm text-gray-700">
                View Timesheets
              </button>
              <button className="w-full px-4 py-2 text-left rounded-lg hover:bg-red-50 text-sm text-red-600">
                Deactivate Staff
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
