'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface DocumentsTabProps {
  staffId: string
}

export default function DocumentsTab({ staffId }: DocumentsTabProps) {
  const router = useRouter()

  // Redirect to existing documents page or show documents inline
  // For now, we'll show a link to the documents page
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Documents management</p>
        <a
          href={`/staff/${staffId}/documents`}
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
        >
          View Documents
        </a>
      </div>
    </div>
  )
}

