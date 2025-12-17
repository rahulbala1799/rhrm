'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingLayout } from '../components/OnboardingLayout'

export default function ResumeOnboardingPage() {
  const router = useRouter()
  const [progress, setProgress] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/onboarding/progress')
      .then((res) => res.json())
      .then((data) => {
        setProgress(data.progress)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleContinue = () => {
    if (progress?.currentStep) {
      router.push(`/onboarding/step-${progress.currentStep}`)
    } else {
      router.push('/onboarding/step-1-welcome')
    }
  }

  const handleStartOver = async () => {
    await fetch('/api/onboarding/progress', { method: 'DELETE' })
    router.push('/onboarding/step-1-welcome')
  }

  const handleAbandon = async () => {
    await fetch('/api/onboarding/progress', { method: 'DELETE' })
    router.push('/onboarding/abandoned')
  }

  if (loading) {
    return <div>Loading...</div>
  }

  const completedSteps = progress?.completedSteps?.length || 0
  const currentStep = progress?.currentStep || 1

  return (
    <OnboardingLayout currentStep={currentStep} totalSteps={7}>
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Welcome back!</h1>
        <p className="text-gray-600 mb-6">
          You've completed steps 1-{completedSteps} of 7
        </p>

        <div className="space-y-4">
          <button
            onClick={handleContinue}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Continue where you left off
          </button>

          <button
            onClick={handleStartOver}
            className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Start over
          </button>

          <button
            onClick={handleAbandon}
            className="w-full px-6 py-3 text-gray-600 hover:text-gray-800 underline"
          >
            Abandon setup
          </button>
        </div>
      </div>
    </OnboardingLayout>
  )
}



