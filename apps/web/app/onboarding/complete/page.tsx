'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function OnboardingCompletePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to home after a moment
    const timer = setTimeout(() => {
      router.push('/')
    }, 5000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-4">Welcome to your business!</h1>
          <p className="text-gray-600 mb-8">
            Your business has been created successfully. Here's what you can do next:
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <button
            onClick={() => router.push('/')}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-left"
          >
            <div className="font-semibold">Invite your team</div>
            <div className="text-sm text-blue-100">Add team members to get started</div>
          </button>

          <button
            onClick={() => router.push('/')}
            className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-left"
          >
            <div className="font-semibold">Add your first location or role</div>
            <div className="text-sm text-gray-600">Set up locations and roles</div>
          </button>

          <button
            onClick={() => router.push('/')}
            className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-left"
          >
            <div className="font-semibold">Create your first schedule</div>
            <div className="text-sm text-gray-600">Start scheduling shifts</div>
          </button>
        </div>

        <p className="text-sm text-gray-500">
          Redirecting to dashboard in a few seconds...
        </p>
      </div>
    </div>
  )
}



