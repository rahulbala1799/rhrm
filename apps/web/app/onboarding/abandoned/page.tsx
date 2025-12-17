'use client'

import { useRouter } from 'next/navigation'

export default function AbandonedOnboardingPage() {
  const router = useRouter()

  const handleStartSetup = () => {
    router.push('/onboarding/step-1-welcome')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Setup Not Completed</h1>
        <p className="text-gray-600 mb-8">
          You haven't set up your business yet. You'll need to complete setup to use the app.
        </p>

        <div className="space-y-4">
          <button
            onClick={handleStartSetup}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Start setup
          </button>

          <button
            onClick={() => router.push('/login')}
            className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}


