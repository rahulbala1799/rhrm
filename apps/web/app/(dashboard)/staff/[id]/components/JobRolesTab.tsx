'use client'

import { useState, useEffect } from 'react'

interface JobRole {
  id: string
  name: string
  description: string | null
  bg_color: string
  text_color: string
  assigned_at: string
}

interface JobRolesTabProps {
  staffId: string
}

export default function JobRolesTab({ staffId }: JobRolesTabProps) {
  const [roles, setRoles] = useState<JobRole[]>([])
  const [allRoles, setAllRoles] = useState<JobRole[]>([])
  const [loading, setLoading] = useState(true)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')

  useEffect(() => {
    fetchStaffRoles()
    fetchAllRoles()
  }, [staffId])

  const fetchStaffRoles = async () => {
    try {
      const response = await fetch(`/api/staff/${staffId}/roles`)
      if (!response.ok) throw new Error('Failed to fetch')
      const { roles } = await response.json()
      setRoles(roles || [])
    } catch (error) {
      console.error('Error fetching staff roles:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllRoles = async () => {
    try {
      const response = await fetch('/api/settings/job-roles')
      if (response.ok) {
        const { roles } = await response.json()
        setAllRoles(roles || [])
      }
    } catch (error) {
      console.error('Error fetching all roles:', error)
    }
  }

  const handleAssignRole = async () => {
    if (!selectedRoleId) return

    try {
      const response = await fetch(`/api/staff/${staffId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: selectedRoleId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to assign role')
      }

      setShowAssignModal(false)
      setSelectedRoleId('')
      fetchStaffRoles()
      alert('Role assigned successfully!')
    } catch (error: any) {
      console.error('Error assigning role:', error)
      alert(error.message || 'Failed to assign role')
    }
  }

  const handleRemoveRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to remove this role?')) return

    try {
      const response = await fetch(`/api/staff/${staffId}/roles/${roleId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove role')
      }

      fetchStaffRoles()
      alert('Role removed successfully!')
    } catch (error: any) {
      console.error('Error removing role:', error)
      alert(error.message || 'Failed to remove role')
    }
  }

  // Get available roles (not already assigned)
  const availableRoles = allRoles.filter(
    (role) => !roles.some((assigned) => assigned.id === role.id)
  )

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Job Roles</h3>
          <button
            onClick={() => setShowAssignModal(true)}
            disabled={availableRoles.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Assign Role
          </button>
        </div>

        {roles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No roles assigned to this staff member.</p>
            <p className="text-sm mt-2">Click "Assign Role" to add a role.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {roles.map((role) => (
              <div
                key={role.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-lg border-2 border-gray-300 flex items-center justify-center text-sm font-semibold"
                    style={{
                      backgroundColor: role.bg_color,
                      color: role.text_color,
                    }}
                    title={`${role.name} - ${role.description || 'No description'}`}
                  >
                    {role.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{role.name}</div>
                    {role.description && (
                      <div className="text-sm text-gray-500">{role.description}</div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveRole(role.id)}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign Role Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Assign Role</h2>
            {availableRoles.length === 0 ? (
              <div className="py-4">
                <p className="text-gray-600">All available roles have been assigned to this staff member.</p>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Role
                  </label>
                  <select
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a role...</option>
                    {availableRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name} {role.description ? `- ${role.description}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleAssignRole}
                    disabled={!selectedRoleId}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Assign Role
                  </button>
                  <button
                    onClick={() => {
                      setShowAssignModal(false)
                      setSelectedRoleId('')
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

