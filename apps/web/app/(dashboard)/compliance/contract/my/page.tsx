'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import SectionCard from '@/components/ui/SectionCard'

interface Assignment {
  id: string
  status: string
  issued_at: string | null
  uploaded_at: string | null
  contract_templates: { name: string; template_id: string } | null
}

export default function MyContractsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/contracts/assignments')
      .then((r) => r.json())
      .then((d) => setAssignments(d.assignments ?? []))
      .catch(() => setAssignments([]))
      .finally(() => setLoading(false))
  }, [])

  const handleUpload = async (assignmentId: string, file: FileList | null) => {
    if (!file?.length) return
    setUploadingId(assignmentId)
    setUploadError(null)
    const formData = new FormData()
    formData.append('file', file[0])
    try {
      const res = await fetch(`/api/contracts/assignments/${assignmentId}/upload-signed`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setAssignments((prev) =>
        prev.map((a) => (a.id === assignmentId ? { ...a, status: 'uploaded', uploaded_at: new Date().toISOString() } : a))
      )
    } catch (e: any) {
      setUploadError(e.message || 'Upload failed')
    } finally {
      setUploadingId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="My contracts"
        description="View your employment contracts and upload signed copies"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'Contract', href: '/compliance/contract' },
          { label: 'My contracts' },
        ]}
        action={
          <Link href="/compliance/contract" className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
            ← Back to Contract
          </Link>
        }
      />

      <SectionCard title="Your contract assignments" description="Download the contract, sign it, then upload the signed copy here.">
        {uploadError && <p className="text-sm text-red-600 mb-3">{uploadError}</p>}
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : assignments.length === 0 ? (
          <p className="text-sm text-gray-500">You have no contract assignments yet.</p>
        ) : (
          <ul className="space-y-4">
            {assignments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 py-3 border-b border-gray-100 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{a.contract_templates?.name ?? 'Contract'}</p>
                  <p className="text-sm text-gray-500">
                    Issued {a.issued_at ? new Date(a.issued_at).toLocaleDateString() : '—'} · Status: <span className="capitalize">{a.status.replace('_', ' ')}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/contracts/assignments/${a.id}/document?type=generated`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg"
                  >
                    View / download
                  </a>
                  {a.status !== 'uploaded' ? (
                    <label className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={uploadingId === a.id}
                        onChange={(e) => {
                          handleUpload(a.id, e.target.files)
                          e.target.value = ''
                        }}
                      />
                      {uploadingId === a.id ? 'Uploading...' : 'Upload signed'}
                    </label>
                  ) : (
                    <span className="text-sm text-emerald-600">Signed copy uploaded</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
