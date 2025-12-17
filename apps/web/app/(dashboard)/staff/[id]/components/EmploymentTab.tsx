'use client'

import { useState, useEffect } from 'react'

interface Staff {
  id: string
  location_id: string | null
  employment_type: string | null
  job_title: string | null
  department: string | null
  employment_start_date: string | null
  employment_end_date: string | null
  manager_id: string | null
  status: string
  manager: {
    id: string
    first_name: string
    last_name: string
    employee_number: string
  } | null
  locations: {
    id: string
    name: string
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

interface Location {
  id: string
  name: string
}

interface ManagerOption {
  id: string
  employee_number: string
  first_name: string
  last_name: string
  job_title: string | null
}

interface EmploymentTabProps {
  staff: Staff
  editing: boolean
  statusHistory: StatusHistory[]
  formRef?: (ref: HTMLFormElement | null) => void
  onSave: (data: any) => Promise<void>
}

export default function EmploymentTab({ staff, editing, statusHistory, formRef, onSave }: EmploymentTabProps) {
  const [locations, setLocations] = useState<Location[]>([])
  const [managers, setManagers] = useState<ManagerOption[]>([])
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [statusChangeData, setStatusChangeData] = useState({
    new_status: staff.status,
    effective_date: new Date().toISOString().split('T')[0],
    reason: '',
  })
  const [formData, setFormData] = useState({
    location_id: staff.location_id || '',
    employment_type: staff.employment_type || '',
    job_title: staff.job_title || '',
    department: staff.department || '',
    employment_start_date: staff.employment_start_date || '',
    employment_end_date: staff.employment_end_date || '',
    manager_id: staff.manager_id || '',
    status: staff.status,
  })

  useEffect(() => {
    fetchLocations()
    fetchManagers()
  }, [])

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/settings/locations')
      if (response.ok) {
        const data = await response.json()
        setLocations(data.locations || [])
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
    }
  }

  const fetchManagers = async () => {
    try {
      const response = await fetch('/api/staff?for_manager_dropdown=true')
      if (response.ok) {
        const data = await response.json()
        // Filter out current staff member
        const filtered = (data.staff || []).filter((s: ManagerOption) => s.id !== staff.id)
        setManagers(filtered)
      }
    } catch (error) {
      console.error('Error fetching managers:', error)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatEmploymentType = (type: string | null) => {
    if (!type) return '—'
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const handleStatusChange = (newStatus: string) => {
    if (newStatus !== formData.status) {
      setStatusChangeData({
        new_status: newStatus,
        effective_date: new Date().toISOString().split('T')[0],
        reason: '',
      })
      setShowStatusModal(true)
    }
  }

  const handleStatusModalConfirm = async () => {
    const updateData = {
      ...formData,
      status: statusChangeData.new_status,
      status_change_effective_date: statusChangeData.effective_date,
      status_change_reason: statusChangeData.reason || null,
    }
    setFormData({ ...formData, status: statusChangeData.new_status })
    setShowStatusModal(false)
    await onSave(updateData)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(formData)
  }

  if (editing) {
    return (
      <>
        <form
          ref={(el) => formRef?.(el)}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <select
                  value={formData.location_id}
                  onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">None</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employment Type
                </label>
                <select
                  value={formData.employment_type}
                  onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">None</option>
                  <option value="full_time">Full-time</option>
                  <option value="part_time">Part-time</option>
                  <option value="casual">Casual</option>
                  <option value="contractor">Contractor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title
                </label>
                <input
                  type="text"
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.employment_start_date}
                  onChange={(e) => setFormData({ ...formData, employment_start_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.employment_end_date}
                  onChange={(e) => setFormData({ ...formData, employment_end_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manager
                </label>
                <select
                  value={formData.manager_id}
                  onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">None</option>
                  {managers.map((mgr) => (
                    <option key={mgr.id} value={mgr.id}>
                      {mgr.first_name} {mgr.last_name} ({mgr.employee_number})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => {
                    const newStatus = e.target.value
                    if (newStatus !== staff.status) {
                      handleStatusChange(newStatus)
                    } else {
                      setFormData({ ...formData, status: newStatus })
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="on_leave">On Leave</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
            </div>
          </div>
        </form>

        {/* Status Change Modal */}
        {showStatusModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Status</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Status
                  </label>
                  <p className="text-gray-900">{staff.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Status
                  </label>
                  <select
                    value={statusChangeData.new_status}
                    onChange={(e) => setStatusChangeData({ ...statusChangeData, new_status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="on_leave">On Leave</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={statusChangeData.effective_date}
                    onChange={(e) => setStatusChangeData({ ...statusChangeData, effective_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason (Optional)
                  </label>
                  <textarea
                    value={statusChangeData.reason}
                    onChange={(e) => setStatusChangeData({ ...statusChangeData, reason: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter reason for status change..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusModal(false)
                    setFormData({ ...formData, status: staff.status })
                    setStatusChangeData({
                      new_status: staff.status,
                      effective_date: new Date().toISOString().split('T')[0],
                      reason: '',
                    })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStatusModalConfirm}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // View Mode
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Location</label>
            <p className="text-gray-900">{staff.locations?.name || '—'}</p>
          </div>
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
            <label className="block text-sm font-medium text-gray-600 mb-1">Start Date</label>
            <p className="text-gray-900">{formatDate(staff.employment_start_date)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">End Date</label>
            <p className="text-gray-900">{staff.employment_end_date ? formatDate(staff.employment_end_date) : 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Manager</label>
            <p className="text-gray-900">
              {staff.manager
                ? `${staff.manager.first_name} ${staff.manager.last_name} (${staff.manager.employee_number})`
                : 'None'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
              staff.status === 'active' ? 'bg-green-100 text-green-800' :
              staff.status === 'on_leave' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {staff.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </div>
        </div>
      </div>

      {/* Status History */}
      {statusHistory.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status History</h3>
          <div className="space-y-3">
            {statusHistory.map((entry) => (
              <div key={entry.id} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {entry.old_status ? `${entry.old_status.replace('_', ' ')} → ` : ''}
                      {entry.new_status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatDate(entry.effective_date)} • {entry.changed_by.full_name || entry.changed_by.email}
                    </p>
                    {entry.reason && (
                      <p className="text-sm text-gray-500 mt-1">{entry.reason}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

