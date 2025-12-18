'use client'

import { useState, useEffect } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import { calculateContrastRatio, meetsWCAGAA, suggestTextColor } from '@/lib/utils/color-contrast'

interface JobRole {
  id: string
  name: string
  description: string | null
  bg_color: string
  text_color: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function JobRolesPage() {
  const [roles, setRoles] = useState<JobRole[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRole, setEditingRole] = useState<JobRole | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    bg_color: '#E5E7EB',
    text_color: '#1F2937',
  })
  const [contrastRatio, setContrastRatio] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRoles()
  }, [])

  useEffect(() => {
    // Calculate contrast ratio when colors change
    try {
      const ratio = calculateContrastRatio(formData.bg_color, formData.text_color)
      setContrastRatio(ratio)
    } catch (err) {
      setContrastRatio(null)
    }
  }, [formData.bg_color, formData.text_color])

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/settings/job-roles')
      if (!response.ok) throw new Error('Failed to fetch')
      const { roles } = await response.json()
      setRoles(roles || [])
    } catch (error) {
      console.error('Error fetching job roles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (role?: JobRole) => {
    if (role) {
      setEditingRole(role)
      setFormData({
        name: role.name || '',
        description: role.description || '',
        bg_color: role.bg_color || '#E5E7EB',
        text_color: role.text_color || '#1F2937',
      })
    } else {
      setEditingRole(null)
      setFormData({
        name: '',
        description: '',
        bg_color: '#E5E7EB',
        text_color: '#1F2937',
      })
    }
    setError(null)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingRole(null)
    setFormData({
      name: '',
      description: '',
      bg_color: '#E5E7EB',
      text_color: '#1F2937',
    })
    setError(null)
  }

  const handleSuggestColor = () => {
    const suggested = suggestTextColor(formData.bg_color)
    setFormData({ ...formData, text_color: suggested })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate contrast
    if (!contrastRatio || !meetsWCAGAA(formData.bg_color, formData.text_color)) {
      setError('Color contrast must be at least 4.5:1 (WCAG AA)')
      return
    }

    setSaving(true)

    try {
      const url = editingRole
        ? `/api/settings/job-roles/${editingRole.id}`
        : '/api/settings/job-roles'
      const method = editingRole ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          bg_color: formData.bg_color,
          text_color: formData.text_color,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.message || 'Failed to save')
      }

      handleCloseModal()
      fetchRoles()
      alert(editingRole ? 'Role updated successfully!' : 'Role created successfully!')
    } catch (error: any) {
      console.error('Error saving role:', error)
      setError(error.message || 'Failed to save role')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    // First check if role is assigned to staff
    try {
      const checkResponse = await fetch(`/api/settings/job-roles/${id}?force=false`, {
        method: 'DELETE',
      })

      if (!checkResponse.ok) {
        const errorData = await checkResponse.json()
        if (checkResponse.status === 409) {
          // Role is assigned to staff
          const staffList = errorData.staff?.map((s: any) => s.name).join(', ') || 'staff members'
          const confirmMessage = `This role is assigned to ${errorData.staff_count} staff member${errorData.staff_count > 1 ? 's' : ''}:\n${staffList}\n\nDeleting will hide this role from assignment, but existing shifts will keep their colors.\n\nDo you want to continue?`
          
          if (!confirm(confirmMessage)) return

          // Delete with force=true
          const forceResponse = await fetch(`/api/settings/job-roles/${id}?force=true`, {
            method: 'DELETE',
          })

          if (!forceResponse.ok) {
            const forceError = await forceResponse.json()
            throw new Error(forceError.error || 'Failed to delete')
          }
        } else {
          throw new Error(errorData.error || 'Failed to delete')
        }
      }

      fetchRoles()
      alert('Role deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting role:', error)
      alert(error.message || 'Failed to delete role')
    }
  }

  const normalizeHex = (hex: string): string => {
    // Remove # if present, ensure uppercase
    const clean = hex.replace('#', '').toUpperCase()
    return clean.length === 6 ? `#${clean}` : hex
  }

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Job Roles"
          description="Manage job roles and their color coding for shifts"
        />
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Job Roles"
        description="Manage job roles and their color coding for shifts"
        action={
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            + Create Role
          </button>
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings/company' },
          { label: 'Job Roles' },
        ]}
      />

      {roles.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
          title="No job roles added"
          description="Create job roles to organize shifts by role and customize colors for easy identification in the scheduler."
          action={{
            label: 'Create First Role',
            onClick: () => handleOpenModal(),
          }}
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Colors</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{role.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{role.description || '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-lg border-2 border-gray-300 flex items-center justify-center text-sm font-semibold"
                        style={{
                          backgroundColor: role.bg_color,
                          color: role.text_color,
                        }}
                      >
                        Aa
                      </div>
                      <div className="text-xs text-gray-600">
                        <div>BG: {role.bg_color}</div>
                        <div>Text: {role.text_color}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-right space-x-2">
                    <button
                      onClick={() => handleOpenModal(role)}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(role.id)}
                      className="text-red-600 hover:text-red-700 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingRole ? 'Edit Role' : 'Create Role'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  maxLength={100}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  maxLength={500}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Background Color <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.bg_color}
                    onChange={(e) => setFormData({ ...formData, bg_color: normalizeHex(e.target.value) })}
                    className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.bg_color}
                    onChange={(e) => setFormData({ ...formData, bg_color: normalizeHex(e.target.value) })}
                    pattern="^#?[0-9A-Fa-f]{6}$"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    placeholder="#FF5733"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Text Color <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.text_color}
                    onChange={(e) => setFormData({ ...formData, text_color: normalizeHex(e.target.value) })}
                    className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.text_color}
                    onChange={(e) => setFormData({ ...formData, text_color: normalizeHex(e.target.value) })}
                    pattern="^#?[0-9A-Fa-f]{6}$"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-700">Contrast Ratio:</span>
                  {contrastRatio !== null && (
                    <>
                      <span className={`text-sm font-semibold ${meetsWCAGAA(formData.bg_color, formData.text_color) ? 'text-green-600' : 'text-red-600'}`}>
                        {contrastRatio.toFixed(2)}:1
                      </span>
                      {meetsWCAGAA(formData.bg_color, formData.text_color) ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-red-600">⚠️</span>
                      )}
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  WCAG AA requires minimum 4.5:1 contrast ratio
                </p>
                {contrastRatio !== null && !meetsWCAGAA(formData.bg_color, formData.text_color) && (
                  <button
                    type="button"
                    onClick={handleSuggestColor}
                    className="mt-2 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Suggest Colors
                  </button>
                )}
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              <div className="flex items-center gap-4 pt-4">
                <button
                  type="submit"
                  disabled={saving || (contrastRatio !== null && !meetsWCAGAA(formData.bg_color, formData.text_color))}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

