'use client'

import { useState, useEffect } from 'react'
import type { TenantComplianceRequirement, CountryCode, RequirementLevel, CollectionMethod } from '@/lib/compliance/types'

interface CustomRequirementModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  country: CountryCode
  editingRequirement?: TenantComplianceRequirement | null
}

export default function CustomRequirementModal({
  isOpen,
  onClose,
  onSave,
  country,
  editingRequirement
}: CustomRequirementModalProps) {
  const [title, setTitle] = useState('')
  const [docType, setDocType] = useState('')
  const [requirementLevel, setRequirementLevel] = useState<RequirementLevel>('required')
  const [collectionMethod, setCollectionMethod] = useState<CollectionMethod>('upload')
  const [expiresInMonths, setExpiresInMonths] = useState<string>('')
  const [appliesToAll, setAppliesToAll] = useState(true)
  const [isEnabled, setIsEnabled] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens/closes or editing requirement changes
  useEffect(() => {
    if (isOpen) {
      if (editingRequirement) {
        setTitle(editingRequirement.title)
        setDocType(editingRequirement.doc_type)
        setRequirementLevel(editingRequirement.requirement_level)
        setCollectionMethod(editingRequirement.collection_method)
        setExpiresInMonths(editingRequirement.expires_in_months?.toString() || '')
        setAppliesToAll(editingRequirement.applies_to_all)
        setIsEnabled(editingRequirement.is_enabled)
      } else {
        // Reset for new requirement
        setTitle('')
        setDocType('')
        setRequirementLevel('required')
        setCollectionMethod('upload')
        setExpiresInMonths('')
        setAppliesToAll(true)
        setIsEnabled(true)
      }
      setError(null)
    }
  }, [isOpen, editingRequirement])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const payload = {
        country_code: country,
        doc_type: docType || undefined, // Let server generate if empty
        title,
        requirement_level: requirementLevel,
        collection_method: collectionMethod,
        expires_in_months: expiresInMonths ? parseInt(expiresInMonths) : null,
        applies_to_all: appliesToAll,
        role_ids: null, // Can be enhanced later for role/location filtering
        location_ids: null,
        is_enabled: isEnabled,
        sort_order: 100
      }

      const url = editingRequirement
        ? `/api/settings/compliance-documents/${editingRequirement.id}`
        : '/api/settings/compliance-documents'
      
      const method = editingRequirement ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save requirement')
      }

      onSave()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save requirement')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {editingRequirement ? 'Edit Custom Requirement' : 'Add Custom Document'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={saving}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Document Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Safety Certificate, Fire Warden Training"
              maxLength={100}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              This is the name staff will see. Max 100 characters.
            </p>
          </div>

          {/* Document Identifier (optional) */}
          <div>
            <label htmlFor="docType" className="block text-sm font-medium text-gray-700 mb-2">
              Document Identifier (optional)
            </label>
            <input
              id="docType"
              type="text"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              placeholder="Leave empty to auto-generate from title"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              System will auto-generate a safe identifier (e.g., "custom_safety_cert") if left empty.
            </p>
          </div>

          {/* Requirement Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Requirement Level <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="required"
                  checked={requirementLevel === 'required'}
                  onChange={(e) => setRequirementLevel(e.target.value as RequirementLevel)}
                  className="mr-2"
                />
                <span className="text-sm">
                  <strong>Required</strong> - All matching staff must submit
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="conditional"
                  checked={requirementLevel === 'conditional'}
                  onChange={(e) => setRequirementLevel(e.target.value as RequirementLevel)}
                  className="mr-2"
                />
                <span className="text-sm">
                  <strong>Conditional</strong> - Required only when certain conditions are met
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="optional"
                  checked={requirementLevel === 'optional'}
                  onChange={(e) => setRequirementLevel(e.target.value as RequirementLevel)}
                  className="mr-2"
                />
                <span className="text-sm">
                  <strong>Optional</strong> - Staff may submit but not enforced
                </span>
              </label>
            </div>
          </div>

          {/* Collection Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Collection Method <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="upload"
                  checked={collectionMethod === 'upload'}
                  onChange={(e) => setCollectionMethod(e.target.value as CollectionMethod)}
                  className="mr-2"
                />
                <span className="text-sm">
                  <strong>Upload</strong> - Staff must upload a file
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="reference"
                  checked={collectionMethod === 'reference'}
                  onChange={(e) => setCollectionMethod(e.target.value as CollectionMethod)}
                  className="mr-2"
                />
                <span className="text-sm">
                  <strong>Reference</strong> - Staff provides reference number only (no file)
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="both"
                  checked={collectionMethod === 'both'}
                  onChange={(e) => setCollectionMethod(e.target.value as CollectionMethod)}
                  className="mr-2"
                />
                <span className="text-sm">
                  <strong>Both</strong> - Staff must upload file AND may optionally provide reference
                </span>
              </label>
            </div>
          </div>

          {/* Expiry Period */}
          <div>
            <label htmlFor="expiresInMonths" className="block text-sm font-medium text-gray-700 mb-2">
              Expiry Period (months)
            </label>
            <input
              id="expiresInMonths"
              type="number"
              value={expiresInMonths}
              onChange={(e) => setExpiresInMonths(e.target.value)}
              placeholder="e.g., 12, 24, 36"
              min="1"
              max="120"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Document expires X months after approval. Leave blank if document does not expire.
            </p>
          </div>

          {/* Applies To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Applies To
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={appliesToAll}
                onChange={(e) => setAppliesToAll(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Required for all staff</span>
            </label>
            {!appliesToAll && (
              <p className="mt-2 text-xs text-gray-500 bg-yellow-50 p-2 rounded">
                Role/location filtering will be available in the full version. For now, this will apply to all staff.
              </p>
            )}
          </div>

          {/* Enable Toggle */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium">Enable this requirement</span>
            </label>
            <p className="mt-1 text-xs text-gray-500">
              Disabled requirements are hidden from staff but remain in the system.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : editingRequirement ? 'Save Changes' : 'Create Requirement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

