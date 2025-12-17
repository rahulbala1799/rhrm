'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'

interface Document {
  id: string
  document_type: string
  document_name: string
  file_path: string
  expiry_date: string | null
  status: string
  verified_by: string | null
  verified_at: string | null
  created_at: string
}

const DOCUMENT_TYPES = {
  right_to_work: 'Right to Work',
  training_cert: 'Training Certificate',
  dbs_check: 'DBS Check',
  other: 'Other',
}

export default function StaffDocumentsPage() {
  const params = useParams()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    document_type: 'right_to_work',
    document_name: '',
    file_path: '',
    expiry_date: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (params.id) {
      fetchDocuments()
    }
  }, [params.id])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/staff/${params.id}/documents`)
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.document_name || !formData.file_path) {
      setError('Document name and file path are required')
      return
    }

    try {
      const response = await fetch(`/api/staff/${params.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          expiry_date: formData.expiry_date || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setShowAddForm(false)
        setFormData({
          document_type: 'right_to_work',
          document_name: '',
          file_path: '',
          expiry_date: '',
        })
        fetchDocuments()
      } else {
        setError(data.error || 'Failed to add document')
      }
    } catch (error) {
      console.error('Error creating document:', error)
      setError('An unexpected error occurred')
    }
  }

  const handleVerify = async (documentId: string) => {
    try {
      const response = await fetch(`/api/staff/${params.id}/documents/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'verified' }),
      })

      if (response.ok) {
        fetchDocuments()
      }
    } catch (error) {
      console.error('Error verifying document:', error)
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return
    }

    try {
      const response = await fetch(`/api/staff/${params.id}/documents/${documentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchDocuments()
      }
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      rejected: 'bg-red-100 text-red-800',
    }
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    return new Date(expiryDate) <= thirtyDaysFromNow
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Manage right to work, certifications, and other documents"
        action={
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            {showAddForm ? 'Cancel' : 'Upload Document'}
          </button>
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Staff', href: '/staff' },
          { label: 'Profile', href: `/staff/${params.id}` },
          { label: 'Documents' },
        ]}
      />

      {showAddForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Document</h3>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type
                </label>
                <select
                  value={formData.document_type}
                  onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.document_name}
                  onChange={(e) => setFormData({ ...formData, document_name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Passport - UK"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File Path / URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.file_path}
                  onChange={(e) => setFormData({ ...formData, file_path: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="/documents/staff/passport.pdf or https://..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Note: File upload functionality will be added. For now, store files in your document management system and enter the path/URL here.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Add Document
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-2 text-sm text-gray-600">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              title="No documents uploaded"
              description="Upload right to work documents, certifications, and other required paperwork for this staff member."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiry Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{doc.document_name}</div>
                        <div className="text-xs text-gray-500">
                          Added {formatDate(doc.created_at)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {DOCUMENT_TYPES[doc.document_type as keyof typeof DOCUMENT_TYPES]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {doc.expiry_date ? (
                        <div>
                          <div className="text-sm text-gray-900">{formatDate(doc.expiry_date)}</div>
                          {isExpiringSoon(doc.expiry_date) && (
                            <div className="text-xs text-orange-600 font-medium">Expiring soon</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(doc.status)}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                      <a
                        href={doc.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View
                      </a>
                      {doc.status === 'pending' && (
                        <button
                          onClick={() => handleVerify(doc.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          Verify
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-red-600 hover:text-red-800"
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
      </div>
    </div>
  )
}
