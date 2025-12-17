'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface AvailabilityTabProps {
  staffId: string
}

export default function AvailabilityTab({ staffId }: AvailabilityTabProps) {
  const router = useRouter()

  // Redirect to existing availability page
  useEffect(() => {
    router.push(`/staff/${staffId}/availability`)
  }, [staffId, router])

  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
        <p className="text-gray-600">Redirecting to availability page...</p>
      </div>
    </div>
  )
}

