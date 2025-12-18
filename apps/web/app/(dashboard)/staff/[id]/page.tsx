'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import Link from 'next/link'

// Import tab components (we'll create these)
import ProfileTab from './components/ProfileTab'
import EmploymentTab from './components/EmploymentTab'
import PayTab from './components/PayTab'
import HoursRulesTab from './components/HoursRulesTab'
import AvailabilityTab from './components/AvailabilityTab'
import DocumentsTab from './components/DocumentsTab'
import JobRolesTab from './components/JobRolesTab'

interface Staff {
  id: string
  tenant_id: string
  user_id: string | null
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
  employment_type: string | null
  job_title: string | null
  department: string | null
  location_id: string | null
  employment_start_date: string | null
  employment_end_date: string | null
  manager_id: string | null
  status: string
  pay_type: string | null
  hourly_rate: number | null
  salary_amount: number | null
  pay_frequency: string | null
  overtime_enabled: boolean
  overtime_rule_type: string | null
  overtime_multiplier: number | null
  overtime_flat_extra: number | null
  contracted_weekly_hours: number | null
  min_hours_per_week: number | null
  max_hours_per_week: number | null
  max_hours_per_day: number | null
  max_consecutive_days: number | null
  min_rest_hours_between_shifts: number | null
  preferred_working_days: number[] | null
  preferred_shift_types: string[] | null
  created_at: string
  updated_at: string
  locations: {
    id: string
    name: string
    address: string | null
    postcode: string | null
  } | null
  manager: {
    id: string
    first_name: string
    last_name: string
    employee_number: string
  } | null
}

interface StatusHistory {
  id: string
  old_status: string | null
  new_status: string
  effective_date: string
  reason: string | null
  changed_by: {
    id: string
    email: string
    full_name: string | null
  }
  created_at: string
}

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'employment', label: 'Employment' },
  { id: 'job-roles', label: 'Job Roles' },
  { id: 'pay', label: 'Pay' },
  { id: 'hours-rules', label: 'Hours & Rules' },
  { id: 'availability', label: 'Availability' },
  { id: 'documents', label: 'Documents' },
] as const

type TabId = typeof TABS[number]['id']

export default function StaffDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [staff, setStaff] = useState<Staff | null>(null)
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('profile')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formRef, setFormRef] = useState<HTMLFormElement | null>(null)

  useEffect(() => {
    // Get active tab from URL
    const tabParam = searchParams.get('tab')
    const validTab = TABS.find(t => t.id === tabParam)?.id || 'profile'
    setActiveTab(validTab as TabId)
  }, [searchParams])

  useEffect(() => {
    if (params.id) {
      fetchStaff()
      fetchRole()
    }
  }, [params.id])

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

  const fetchStaff = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/staff/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setStaff(data.staff)
        setStatusHistory(data.statusHistory || [])
      } else if (response.status === 404) {
        router.push('/staff')
      } else if (response.status === 403) {
        router.push('/staff')
      }
    } catch (error) {
      console.error('Error fetching staff:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId)
    router.push(`/staff/${params.id}?tab=${tabId}`, { scroll: false })
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      on_leave: 'bg-yellow-100 text-yellow-800',
      terminated: 'bg-red-100 text-red-800',
    }
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
  }

  const getDisplayName = () => {
    if (!staff) return ''
    return staff.preferred_name || `${staff.first_name} ${staff.last_name}`
  }

  const canEdit = role === 'admin' || role === 'manager' || role === 'superadmin'
  const canDelete = role === 'admin' || role === 'superadmin'

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
        title={getDisplayName()}
        description={`Employee #${staff.employee_number}`}
        action={
          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                {editing ? (
                  <>
                    <button
                      onClick={() => setEditing(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Trigger form submit in active tab
                        if (formRef) {
                          formRef.requestSubmit()
                        }
                      }}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                  >
                    Edit
                  </button>
                )}
              </>
            )}
            {canDelete && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this staff member?')) {
                    // Handle delete
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm"
              >
                Delete
              </button>
            )}
          </div>
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Staff', href: '/staff' },
          { label: getDisplayName() },
        ]}
      />

      {/* Status Badge and Quick Info */}
      <div className="mb-6 flex items-center gap-4 flex-wrap">
        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(staff.status)}`}>
          {staff.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </span>
        {staff.locations && (
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
            {staff.locations.name}
          </span>
        )}
        {staff.employment_type && (
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
            {staff.employment_type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </span>
        )}
        {staff.job_title && (
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
            {staff.job_title}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                ${activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'profile' && (
          <ProfileTab
            staff={staff}
            editing={editing && canEdit}
            formRef={setFormRef}
            onSave={async (data) => {
              setSaving(true)
              try {
                const response = await fetch(`/api/staff/${params.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data),
                })
                if (response.ok) {
                  await fetchStaff()
                  setEditing(false)
                  alert('Profile updated successfully')
                } else {
                  const error = await response.json()
                  alert(error.error || 'Failed to update profile')
                }
              } catch (error) {
                alert('Failed to update profile')
              } finally {
                setSaving(false)
              }
            }}
          />
        )}
        {activeTab === 'employment' && (
          <EmploymentTab
            staff={staff}
            editing={editing && canEdit}
            statusHistory={statusHistory}
            formRef={setFormRef}
            onSave={async (data) => {
              setSaving(true)
              try {
                const response = await fetch(`/api/staff/${params.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data),
                })
                if (response.ok) {
                  await fetchStaff()
                  setEditing(false)
                  alert('Employment details updated successfully')
                } else {
                  const error = await response.json()
                  alert(error.error || 'Failed to update employment details')
                }
              } catch (error) {
                alert('Failed to update employment details')
              } finally {
                setSaving(false)
              }
            }}
          />
        )}
        {activeTab === 'job-roles' && staff && (
          <JobRolesTab staffId={staff.id} />
        )}
        {activeTab === 'pay' && (
          <PayTab
            staff={staff}
            editing={editing && canEdit}
            formRef={setFormRef}
            onSave={async (data) => {
              setSaving(true)
              try {
                const response = await fetch(`/api/staff/${params.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data),
                })
                if (response.ok) {
                  await fetchStaff()
                  setEditing(false)
                  alert('Pay details updated successfully')
                } else {
                  const error = await response.json()
                  alert(error.error || 'Failed to update pay details')
                }
              } catch (error) {
                alert('Failed to update pay details')
              } finally {
                setSaving(false)
              }
            }}
          />
        )}
        {activeTab === 'hours-rules' && (
          <HoursRulesTab
            staff={staff}
            editing={editing && canEdit}
            formRef={setFormRef}
            onSave={async (data) => {
              setSaving(true)
              try {
                const response = await fetch(`/api/staff/${params.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data),
                })
                if (response.ok) {
                  await fetchStaff()
                  setEditing(false)
                  alert('Working rules updated successfully')
                } else {
                  const error = await response.json()
                  alert(error.error || 'Failed to update working rules')
                }
              } catch (error) {
                alert('Failed to update working rules')
              } finally {
                setSaving(false)
              }
            }}
          />
        )}
        {activeTab === 'availability' && (
          <AvailabilityTab staffId={params.id as string} />
        )}
        {activeTab === 'documents' && (
          <DocumentsTab staffId={params.id as string} />
        )}
      </div>
    </div>
  )
}
