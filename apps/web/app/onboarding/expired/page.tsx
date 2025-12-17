'use client'

import { useRouter } from 'next/navigation'

export default function ExpiredOnboardingPage() {
  const router = useRouter()

  const handleStartFresh = async () => {
    // Clear expired progress
    await fetch('/api/onboarding/progress', { method: 'DELETE' })
    router.push('/onboarding/step-1-welcome')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Onboarding Expired</h1>
        <p className="text-gray-600 mb-8">
          Your previous setup session has expired. Please start fresh to continue.
        </p>

        <button
          onClick={handleStartFresh}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Start fresh
        </button>
      </div>
    </div>
  )
}


