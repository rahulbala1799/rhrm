'use client'

import { useState, useEffect } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import CustomRequirementModal from './components/CustomRequirementModal'
import type { TenantComplianceRequirement, CountryCode } from '@/lib/compliance/types'

export default function ComplianceSettingsPage() {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('UK')
  const [requirements, setRequirements] = useState<TenantComplianceRequirement[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRequirement, setEditingRequirement] = useState<TenantComplianceRequirement | null>(null)

  useEffect(() => {
    fetchRequirements()
  }, [selectedCountry])

  const fetchRequirements = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/settings/compliance-documents?country=${selectedCountry}`)
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setRequirements(data.requirements || [])
    } catch (error) {
      console.error('Error fetching requirements:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSeedDefaults = async () => {
    if (!confirm(`Seed recommended defaults for ${selectedCountry}?`)) return
    
    setSaving(true)
    try {
      const response = await fetch('/api/settings/compliance-documents/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: selectedCountry })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to seed')
      }

      alert('Defaults seeded successfully!')
      fetchRequirements()
    } catch (error: any) {
      alert(error.message || 'Failed to seed defaults')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleEnabled = async (req: TenantComplianceRequirement) => {
    try {
      const response = await fetch(`/api/settings/compliance-documents/${req.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !req.is_enabled })
      })

      if (!response.ok) throw new Error('Failed to update')
      fetchRequirements()
    } catch (error) {
      alert('Failed to update requirement')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this requirement?')) return

    try {
      const response = await fetch(`/api/settings/compliance-documents/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete')
      fetchRequirements()
    } catch (error) {
      alert('Failed to delete requirement')
    }
  }

  const handleOpenModal = (requirement?: TenantComplianceRequirement) => {
    setEditingRequirement(requirement || null)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditingRequirement(null)
  }

  const handleSaveModal = () => {
    fetchRequirements()
  }

  const isCustomRequirement = (req: TenantComplianceRequirement) => {
    return req.doc_type.startsWith('custom_')
  }

  return (
    <div>
      <PageHeader
        title="Compliance Documents Settings"
        description="Configure required compliance documents for your staff"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings/company' },
          { label: 'Compliance Documents' }
        ]}
      />

      {/* Country Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(['UK', 'IE', 'US'] as CountryCode[]).map((country) => (
            <button
              key={country}
              onClick={() => setSelectedCountry(country)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${selectedCountry === country
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {country === 'UK' ? 'United Kingdom' : country === 'IE' ? 'Ireland' : 'United States'}
            </button>
          ))}
        </nav>
      </div>

      {/* Actions */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {requirements.length} requirement{requirements.length !== 1 ? 's' : ''} configured
        </p>
        <div className="flex items-center gap-3">
          {requirements.length === 0 && (
            <button
              onClick={handleSeedDefaults}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Seeding...' : 'Seed Recommended Defaults'}
            </button>
          )}
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Custom Document
          </button>
        </div>
      </div>

      {/* Requirements List */}
      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="space-y-4">
          {requirements.map((req) => (
            <div key={req.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{req.title}</h3>
                    {isCustomRequirement(req) && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Custom
                      </span>
                    )}
                    <span className={`
                      px-3 py-1 rounded-full text-xs font-medium
                      ${req.requirement_level === 'required' ? 'bg-red-100 text-red-800' :
                        req.requirement_level === 'conditional' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'}
                    `}>
                      {req.requirement_level}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {req.collection_method}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Doc Type: <span className="font-mono">{req.doc_type}</span></p>
                    {req.expires_in_months && <p>Expires after: {req.expires_in_months} months</p>}
                    {req.applies_to_all ? (
                      <p>Applies to: All staff</p>
                    ) : (
                      <p>Applies to: Specific roles/locations</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {isCustomRequirement(req) && (
                    <button
                      onClick={() => handleOpenModal(req)}
                      className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 font-medium text-sm"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleEnabled(req)}
                    className={`
                      px-4 py-2 rounded-lg font-medium text-sm
                      ${req.is_enabled
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }
                    `}
                  >
                    {req.is_enabled ? 'Enabled' : 'Disabled'}
                  </button>
                  {isCustomRequirement(req) && (
                    <button
                      onClick={() => handleDelete(req.id)}
                      className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 font-medium text-sm"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {requirements.length === 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-500 mb-4">No requirements configured for {selectedCountry}.</p>
              <p className="text-sm text-gray-400">Click "Seed Recommended Defaults" or "Add Custom Document" to get started.</p>
            </div>
          )}
        </div>
      )}

      <CustomRequirementModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveModal}
        country={selectedCountry}
        editingRequirement={editingRequirement}
      />
    </div>
  )
}

