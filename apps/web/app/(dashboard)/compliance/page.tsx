'use client'

import { useState, useEffect } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import StatCard from '@/components/ui/StatCard'
import { getStatusLabel, getStatusColor } from '@/lib/compliance/types'
import type { RequirementWithDocument } from '@/lib/compliance/types'
import { isValidDateFormat, autoFormatDateInput, normalizeDateInput, convertISOtoDDMMYYYY } from '@/lib/compliance/date-utils'
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'

export default function ComplianceDocumentsPage() {
  const [loading, setLoading] = useState(true)
  const [requirements, setRequirements] = useState<RequirementWithDocument[]>([])
  const [uploading, setUploading] = useState<string | null>(null)

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/compliance/documents')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setRequirements(data.requirements || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (requirementId: string, docType: string, file: File | null, referenceNumber?: string, checkedDate?: string, expiryDate?: string) => {
    setUploading(requirementId)

    try {
      const formData = new FormData()
      if (file) formData.append('file', file)
      formData.append('requirementId', requirementId)
      formData.append('docType', docType)
      if (referenceNumber) formData.append('referenceNumber', referenceNumber)
      if (checkedDate) formData.append('checkedDate', checkedDate)
      if (expiryDate) formData.append('expiryDate', expiryDate)

      const response = await fetch('/api/compliance/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      alert('Document submitted successfully!')
      fetchDocuments()
    } catch (error: any) {
      alert(error.message || 'Failed to upload document')
    } finally {
      setUploading(null)
    }
  }

  const stats = {
    total: requirements.filter(r => r.requirement.requirement_level === 'required').length,
    approved: requirements.filter(r => r.computedStatus === 'approved').length,
    pending: requirements.filter(r => r.computedStatus === 'submitted').length,
    missing: requirements.filter(r => r.computedStatus === 'not_uploaded' && r.requirement.requirement_level === 'required').length
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="My Compliance Documents" description="Upload and track your required documents" />
        <div className="text-center py-12 text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="My Compliance Documents"
        description="Upload and track your required documents"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <StatCard
          title="Approved"
          value={stats.approved}
          iconColor="bg-emerald-50 text-emerald-600"
          icon={<CheckCircleIcon className="w-5 h-5" />}
        />
        <StatCard
          title="Pending Review"
          value={stats.pending}
          iconColor="bg-amber-50 text-amber-600"
          icon={<ClockIcon className="w-5 h-5" />}
        />
        <StatCard
          title="Missing"
          value={stats.missing}
          iconColor="bg-red-50 text-red-600"
          icon={<ExclamationCircleIcon className="w-5 h-5" />}
        />
      </div>

      <div className="space-y-3">
        {requirements.map(({ requirement, document, computedStatus }) => (
          <div key={requirement.id} className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-base font-semibold text-gray-900">{requirement.title}</h3>
                  <StatusBadge status={computedStatus} />
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  {requirement.requirement_level === 'required' ? 'Required' :
                   requirement.requirement_level === 'conditional' ? 'Required when applicable' : 'Optional'}
                </p>

                {computedStatus === 'not_uploaded' && (
                  <UploadForm
                    requirement={requirement}
                    onSubmit={(file: File | null, ref?: string, date?: string, expiry?: string) => handleUpload(requirement.id, requirement.doc_type, file, ref, date, expiry)}
                    uploading={uploading === requirement.id}
                  />
                )}

                {computedStatus === 'submitted' && document && (
                  <p className="text-sm text-gray-500">Submitted on {new Date(document.submitted_at).toLocaleDateString()}. Awaiting review.</p>
                )}

                {computedStatus === 'approved' && document && (
                  <p className="text-sm text-emerald-600">
                    Approved on {document.reviewed_at ? new Date(document.reviewed_at).toLocaleDateString() : 'N/A'}
                    {document.expiry_date && ` · Expiry: ${convertISOtoDDMMYYYY(document.expiry_date)}`}
                    {!document.expiry_date && document.expires_at && ` · Expires: ${new Date(document.expires_at).toLocaleDateString()}`}
                  </p>
                )}

                {computedStatus === 'rejected' && document && (
                  <div className="space-y-2">
                    <p className="text-sm text-red-600">Rejected: {document.rejection_reason}</p>
                    <UploadForm
                      requirement={requirement}
                      onSubmit={(file: File | null, ref?: string, date?: string, expiry?: string) => handleUpload(requirement.id, requirement.doc_type, file, ref, date, expiry)}
                      uploading={uploading === requirement.id}
                    />
                  </div>
                )}

                {computedStatus === 'expired' && document && (
                  <div className="space-y-2">
                    <p className="text-sm text-orange-600">Expired on {document.expires_at ? new Date(document.expires_at).toLocaleDateString() : 'N/A'}. Please upload a new document.</p>
                    <UploadForm
                      requirement={requirement}
                      onSubmit={(file: File | null, ref?: string, date?: string, expiry?: string) => handleUpload(requirement.id, requirement.doc_type, file, ref, date, expiry)}
                      uploading={uploading === requirement.id}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {requirements.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-12 text-center">
            <p className="text-gray-500">No compliance requirements configured for your role.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    not_uploaded: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    submitted: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    rejected: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    expired: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200'
  }

  return (
    <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium ${colors[status as keyof typeof colors] || 'bg-gray-50 text-gray-700 ring-1 ring-gray-200'}`}>
      {getStatusLabel(status as any)}
    </span>
  )
}

function UploadForm({ requirement, onSubmit, uploading }: any) {
  const [file, setFile] = useState<File | null>(null)
  const [referenceNumber, setReferenceNumber] = useState('')
  const [checkedDate, setCheckedDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [expiryError, setExpiryError] = useState<string | null>(null)

  const needsFile = requirement.collection_method === 'upload' || requirement.collection_method === 'both'
  const needsReference = requirement.collection_method === 'reference'
  const requiresExpiryDate = requirement.requires_expiry_date === true

  const handleExpiryDateChange = (value: string) => {
    const normalized = normalizeDateInput(value)
    const formatted = autoFormatDateInput(normalized)
    setExpiryDate(formatted)
    if (expiryError) setExpiryError(null)
  }

  const validateExpiryDate = (): boolean => {
    if (!requiresExpiryDate) return true

    if (!expiryDate || expiryDate.trim() === '') {
      setExpiryError('Expiry date is required for this document type')
      return false
    }

    if (!isValidDateFormat(expiryDate)) {
      setExpiryError('Please enter a valid date in dd/mm/yyyy format')
      return false
    }

    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateExpiryDate()) return
    onSubmit(
      file,
      referenceNumber || undefined,
      checkedDate || undefined,
      expiryDate || undefined
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {needsFile && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Upload File</label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required={needsFile}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 file:transition-colors"
          />
          <p className="mt-1 text-xs text-gray-400">Accepted: PDF, JPG, PNG, WEBP, DOC, DOCX (max 5MB)</p>
        </div>
      )}

      {(needsReference || requirement.collection_method === 'both') && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference Number {needsReference && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              required={needsReference}
              className="w-full px-3 py-2 bg-white ring-1 ring-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Checked Date</label>
            <input
              type="date"
              value={checkedDate}
              onChange={(e) => setCheckedDate(e.target.value)}
              className="w-full px-3 py-2 bg-white ring-1 ring-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow"
            />
          </div>
        </div>
      )}

      {requiresExpiryDate && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expiry Date <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={expiryDate}
              onChange={(e) => handleExpiryDateChange(e.target.value)}
              onBlur={validateExpiryDate}
              placeholder="DD/MM/YYYY"
              maxLength={10}
              className={`w-full pl-10 pr-3 py-2 bg-white ring-1 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow ${
                expiryError ? 'ring-red-300' : 'ring-gray-200'
              }`}
            />
          </div>
          {expiryError && (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
              <ExclamationCircleIcon className="w-3.5 h-3.5" />
              {expiryError}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-400">Format: dd/mm/yyyy</p>
        </div>
      )}

      <button
        type="submit"
        disabled={uploading || (needsFile && !file)}
        className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 shadow-sm text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {uploading ? 'Uploading...' : 'Submit'}
      </button>
    </form>
  )
}
