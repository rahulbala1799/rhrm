'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function StaffOnboardingCompletePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to dashboard after 3 seconds
    const timer = setTimeout(() => {
      router.push('/dashboard')
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">All Set!</h1>
        <p className="text-gray-600 mb-6">
          Your profile is complete. You'll be redirected to your dashboard in a moment.
        </p>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-6 text-blue-600 hover:text-blue-700 font-medium"
        >
          Go to Dashboard Now
        </button>
      </div>
    </div>
  )
}


