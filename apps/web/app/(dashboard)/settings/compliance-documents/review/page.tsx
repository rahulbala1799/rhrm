'use client'

import { useState, useEffect } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { getStatusLabel, computeDocumentStatus } from '@/lib/compliance/types'
import type { StaffComplianceDocument } from '@/lib/compliance/types'

export default function ComplianceReviewPage() {
  const [documents, setDocuments] = useState<StaffComplianceDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectionModal, setRejectionModal] = useState<{ docId: string; docTitle: string } | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      // Get all documents across all staff for review
      // This would need a dedicated endpoint but for now we simulate
      // In production: GET /api/compliance/review
      const response = await fetch('/api/compliance/documents')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      
      // For now, just show the staff's own documents
      // In production, this would show ALL tenant documents for admin review
      const allDocs = data.requirements
        ?.filter((r: any) => r.document)
        .map((r: any) => r.document) || []
      
      setDocuments(allDocs)
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (docId: string) => {
    if (!confirm('Approve this document?')) return

    setProcessing(docId)
    try {
      const response = await fetch(`/api/compliance/review/${docId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to approve')
      }

      alert('Document approved successfully!')
      fetchDocuments()
    } catch (error: any) {
      alert(error.message || 'Failed to approve document')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async () => {
    if (!rejectionModal) return
    if (rejectionReason.length < 10) {
      alert('Rejection reason must be at least 10 characters')
      return
    }

    setProcessing(rejectionModal.docId)
    try {
      const response = await fetch(`/api/compliance/review/${rejectionModal.docId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reject')
      }

      alert('Document rejected successfully!')
      setRejectionModal(null)
      setRejectionReason('')
      fetchDocuments()
    } catch (error: any) {
      alert(error.message || 'Failed to reject document')
    } finally {
      setProcessing(null)
    }
  }

  const submittedDocs = documents.filter(d => d.status === 'submitted')
  const reviewedDocs = documents.filter(d => d.status !== 'submitted')

  if (loading) {
    return (
      <div>
        <PageHeader title="Review Submissions" description="Approve or reject staff document submissions" />
        <div className="text-center py-12">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Review Submissions"
        description="Approve or reject staff document submissions"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings/company' },
          { label: 'Compliance', href: '/settings/compliance-documents' },
          { label: 'Review' }
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Pending Review</p>
          <p className="text-2xl font-bold text-yellow-600">{submittedDocs.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Approved</p>
          <p className="text-2xl font-bold text-green-600">{documents.filter(d => d.status === 'approved').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Rejected</p>
          <p className="text-2xl font-bold text-red-600">{documents.filter(d => d.status === 'rejected').length}</p>
        </div>
      </div>

      {/* Pending Submissions */}
      {submittedDocs.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Pending Submissions</h2>
          <div className="space-y-4">
            {submittedDocs.map((doc) => (
              <div key={doc.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{doc.doc_type}</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Submitted: {new Date(doc.submitted_at).toLocaleString()}</p>
                      {doc.file_name && <p>File: {doc.file_name}</p>}
                      {doc.reference_number && <p>Reference: {doc.reference_number}</p>}
                      {doc.checked_date && <p>Checked: {new Date(doc.checked_date).toLocaleDateString()}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(doc.id)}
                      disabled={processing === doc.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {processing === doc.id ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => setRejectionModal({ docId: doc.id, docTitle: doc.doc_type })}
                      disabled={processing === doc.id}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently Reviewed */}
      {reviewedDocs.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Recently Reviewed</h2>
          <div className="space-y-4">
            {reviewedDocs.map((doc) => (
              <div key={doc.id} className="bg-white rounded-lg border border-gray-200 p-6 opacity-75">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{doc.doc_type}</h3>
                      <span className={`
                        px-3 py-1 rounded-full text-xs font-medium
                        ${doc.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                      `}>
                        {getStatusLabel(doc.status)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Reviewed: {doc.reviewed_at ? new Date(doc.reviewed_at).toLocaleString() : 'N/A'}</p>
                      {doc.status === 'rejected' && doc.rejection_reason && (
                        <p className="text-red-600">Reason: {doc.rejection_reason}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {documents.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No submissions to review.</p>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Reject Document: {rejectionModal.docTitle}</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejection (minimum 10 characters):
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-4"
              rows={4}
              placeholder="Enter rejection reason..."
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => {
                  setRejectionModal(null)
                  setRejectionReason('')
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing !== null || rejectionReason.length < 10}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {processing ? 'Rejecting...' : 'Reject Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

