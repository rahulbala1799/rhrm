'use client'

import { useState, useEffect } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import StatCard from '@/components/ui/StatCard'
import { getStatusLabel, getStatusColor } from '@/lib/compliance/types'
import type { RequirementWithDocument } from '@/lib/compliance/types'

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

  const handleUpload = async (requirementId: string, docType: string, file: File | null, referenceNumber?: string, checkedDate?: string) => {
    setUploading(requirementId)
    
    try {
      const formData = new FormData()
      if (file) formData.append('file', file)
      formData.append('requirementId', requirementId)
      formData.append('docType', docType)
      if (referenceNumber) formData.append('referenceNumber', referenceNumber)
      if (checkedDate) formData.append('checkedDate', checkedDate)

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
        <div className="text-center py-12">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="My Compliance Documents"
        description="Upload and track your required documents"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Approved"
          value={stats.approved}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="Pending Review"
          value={stats.pending}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="Missing"
          value={stats.missing}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      <div className="space-y-4">
        {requirements.map(({ requirement, document, computedStatus }) => (
          <div key={requirement.id} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{requirement.title}</h3>
                  <StatusBadge status={computedStatus} />
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  {requirement.requirement_level === 'required' ? 'Required' : 
                   requirement.requirement_level === 'conditional' ? 'Required when applicable' : 'Optional'}
                </p>

                {computedStatus === 'not_uploaded' && (
                  <UploadForm
                    requirement={requirement}
                    onSubmit={(file: File | null, ref?: string, date?: string) => handleUpload(requirement.id, requirement.doc_type, file, ref, date)}
                    uploading={uploading === requirement.id}
                  />
                )}

                {computedStatus === 'submitted' && document && (
                  <p className="text-sm text-gray-600">Submitted on {new Date(document.submitted_at).toLocaleDateString()}. Awaiting review.</p>
                )}

                {computedStatus === 'approved' && document && (
                  <p className="text-sm text-green-600">
                    Approved on {document.reviewed_at ? new Date(document.reviewed_at).toLocaleDateString() : 'N/A'}
                    {document.expires_at && ` • Expires: ${new Date(document.expires_at).toLocaleDateString()}`}
                  </p>
                )}

                {computedStatus === 'rejected' && document && (
                  <div className="space-y-2">
                    <p className="text-sm text-red-600">Rejected: {document.rejection_reason}</p>
                    <UploadForm
                      requirement={requirement}
                      onSubmit={(file: File | null, ref?: string, date?: string) => handleUpload(requirement.id, requirement.doc_type, file, ref, date)}
                      uploading={uploading === requirement.id}
                    />
                  </div>
                )}

                {computedStatus === 'expired' && document && (
                  <div className="space-y-2">
                    <p className="text-sm text-orange-600">Expired on {document.expires_at ? new Date(document.expires_at).toLocaleDateString() : 'N/A'}. Please upload a new document.</p>
                    <UploadForm
                      requirement={requirement}
                      onSubmit={(file: File | null, ref?: string, date?: string) => handleUpload(requirement.id, requirement.doc_type, file, ref, date)}
                      uploading={uploading === requirement.id}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {requirements.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No compliance requirements configured for your role.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    not_uploaded: 'bg-red-100 text-red-800',
    submitted: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    expired: 'bg-orange-100 text-orange-800'
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
      {getStatusLabel(status as any)}
    </span>
  )
}

function UploadForm({ requirement, onSubmit, uploading }: any) {
  const [file, setFile] = useState<File | null>(null)
  const [referenceNumber, setReferenceNumber] = useState('')
  const [checkedDate, setCheckedDate] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(file, referenceNumber || undefined, checkedDate || undefined)
  }

  const needsFile = requirement.collection_method === 'upload' || requirement.collection_method === 'both'
  const needsReference = requirement.collection_method === 'reference'

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {needsFile && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Upload File</label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required={needsFile}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Checked Date</label>
            <input
              type="date"
              value={checkedDate}
              onChange={(e) => setCheckedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={uploading || (needsFile && !file)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? 'Uploading...' : 'Submit'}
      </button>
    </form>
  )
}


