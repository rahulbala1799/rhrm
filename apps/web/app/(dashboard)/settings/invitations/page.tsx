'use client'

import { useState, useEffect } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'

interface Inviter {
  id: string
  email: string
  full_name: string | null
}

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  expires_at: string
  accepted_at: string | null
  created_at: string
  profiles: Inviter | null
}

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    role: 'staff',
  })

  useEffect(() => {
    fetchInvitations()
  }, [])

  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/settings/invitations')
      if (!response.ok) throw new Error('Failed to fetch')
      const { invitations } = await response.json()
      setInvitations(invitations || [])
    } catch (error) {
      console.error('Error fetching invitations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Get tenant ID from context (we'll need to fetch it)
      const tenantResponse = await fetch('/api/settings/company')
      if (!tenantResponse.ok) throw new Error('Failed to get tenant')
      const { tenant } = await tenantResponse.json()

      const response = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          role: formData.role,
          tenantId: tenant.id,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send invitation')
      }

      const result = await response.json()
      setShowModal(false)
      setFormData({ email: '', role: 'staff' })
      fetchInvitations()
      alert(`Invitation sent to ${formData.email}!${result.invitationUrl ? `\n\nInvitation URL: ${result.invitationUrl}` : ''}`)
    } catch (error: any) {
      console.error('Error sending invitation:', error)
      alert(error.message || 'Failed to send invitation')
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'accepted':
        return 'bg-green-100 text-green-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      case 'revoked':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'manager':
        return 'bg-blue-100 text-blue-800'
      case 'staff':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Invitations"
          description="Invite team members to join your organization"
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
        title="Invitations"
        description="Invite team members to join your organization"
        action={
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            Send Invitation
          </button>
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings/company' },
          { label: 'Invitations' },
        ]}
      />

      {invitations.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
          title="No invitations sent"
          description="Invite team members by email. They'll receive an invitation to join your organization."
          action={{
            label: 'Send First Invitation',
            onClick: () => setShowModal(true),
          }}
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Expires</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Invited By</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invitations.map((invitation) => (
                <tr key={invitation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{invitation.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(invitation.role)}`}>
                      {invitation.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(invitation.status)}`}>
                      {invitation.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {new Date(invitation.expires_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {invitation.profiles?.full_name || invitation.profiles?.email || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {new Date(invitation.created_at).toLocaleDateString()}
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
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Send Invitation</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-center gap-4 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                  {saving ? 'Sending...' : 'Send Invitation'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
