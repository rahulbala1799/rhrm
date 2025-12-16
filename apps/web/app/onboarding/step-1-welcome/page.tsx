'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboardingProgress } from '../hooks/useOnboardingProgress'
import { OnboardingLayout } from '../components/OnboardingLayout'
import { StepNavigation } from '../components/StepNavigation'

export default function Step1WelcomePage() {
  const router = useRouter()
  const { progress, loading, sessionId, saveProgress, initializeSession, versionMismatch } = useOnboardingProgress()
  const [ownerConfirmed, setOwnerConfirmed] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null)

  useEffect(() => {
    // Initialize session if needed
    if (!sessionId && !loading) {
      initializeSession()
    }

    // Load existing data
    if (progress?.data?.ownerConfirmed) {
      setOwnerConfirmed(progress.data.ownerConfirmed)
    }
  }, [sessionId, loading, progress, initializeSession])

  const handleNext = async () => {
    if (!ownerConfirmed) {
      return
    }

    setIsSaving(true)
    setSaveStatus('saving')

    const saved = await saveProgress(1, {
      ownerConfirmed: true,
      ownerConfirmedAt: new Date().toISOString(),
    })

    if (saved) {
      setSaveStatus('saved')
      router.push('/onboarding/step-2-business')
    } else {
      setSaveStatus('error')
      // Never block navigation - allow user to continue
      router.push('/onboarding/step-2-business')
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (versionMismatch) {
    return (
      <OnboardingLayout currentStep={1} totalSteps={7}>
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold mb-4">We updated onboarding</h2>
          <p className="text-gray-600 mb-6">Please review your information to continue.</p>
          <button
            onClick={() => router.push('/onboarding/step-1-welcome')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md"
          >
            Continue
          </button>
        </div>
      </OnboardingLayout>
    )
  }

  return (
    <OnboardingLayout currentStep={1} totalSteps={7}>
      <div>
        <h1 className="text-3xl font-bold mb-4">Welcome!</h1>
        <p className="text-gray-600 mb-8">
          Let's get your business set up. This will only take a few minutes.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">Account Ownership</h2>
          <p className="text-gray-700 mb-4">
            You will be set as the account owner. Ownership can be transferred later, but only through a formal process.
          </p>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={ownerConfirmed}
              onChange={(e) => setOwnerConfirmed(e.target.checked)}
              className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-gray-700">
              I understand I will be the account owner
            </span>
          </label>
        </div>

        <StepNavigation
          currentStep={1}
          totalSteps={7}
          onNext={handleNext}
          onBack={() => router.back()}
          canGoNext={ownerConfirmed}
          isLoading={isSaving}
          saveStatus={saveStatus}
        />
      </div>
    </OnboardingLayout>
  )
}

