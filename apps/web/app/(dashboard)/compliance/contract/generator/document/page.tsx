'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function ContractDocumentPage() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) setError('Missing contract id')
  }, [id])

  if (!id) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Missing contract id.</p>
        <Link href="/compliance/contract/generator" className="text-indigo-600 hover:underline mt-2 inline-block">Back to Generator</Link>
      </div>
    )
  }

  const docUrl = `/api/contracts/assignments/${id}/document?type=generated`

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
        <Link href="/compliance/contract/generator" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          ← Back to Generator
        </Link>
        <a
          href={docUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          Open in new tab
        </a>
      </div>
      <iframe
        src={docUrl}
        title="Contract document"
        className="flex-1 w-full border-0"
        onError={() => setError('Failed to load document')}
      />
      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
