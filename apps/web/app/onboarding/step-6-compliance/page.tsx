'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboardingProgress } from '../hooks/useOnboardingProgress'
import { OnboardingLayout } from '../components/OnboardingLayout'
import { StepNavigation } from '../components/StepNavigation'
import { SkipStepButton } from '../components/SkipStepButton'

const COMPLIANCE_OPTIONS = [
  'Right to work documents',
  'Certifications (e.g., safety, food handling)',
  'Expiry dates',
]

export default function Step6CompliancePage() {
  const router = useRouter()
  const { progress, sessionId, saveProgress, initializeSession } = useOnboardingProgress()
  const [country, setCountry] = useState('GB')
  const [complianceFlags, setComplianceFlags] = useState<string[]>([])
  const [skipped, setSkipped] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null)

  useEffect(() => {
    if (!sessionId) {
      initializeSession()
    }

    // Load existing data
    if (progress?.data) {
      setCountry(progress.data.complianceCountry || progress.data.country || 'GB')
      setComplianceFlags(progress.data.complianceFlags || [])
      if (progress.skippedSteps?.includes(6)) {
        setSkipped(true)
      }
    }
  }, [sessionId, progress, initializeSession])

  const toggleComplianceFlag = (flag: string) => {
    if (complianceFlags.includes(flag)) {
      setComplianceFlags(complianceFlags.filter((f) => f !== flag))
    } else {
      setComplianceFlags([...complianceFlags, flag])
    }
  }

  const handleSkip = async () => {
    setSkipped(true)
    setIsSaving(true)
    setSaveStatus('saving')

    const skippedSteps = progress?.skippedSteps || []
    if (!skippedSteps.includes(6)) {
      skippedSteps.push(6)
    }

    const saved = await saveProgress(6, {
      skipped: true,
    }, skippedSteps)

    if (saved) {
      setSaveStatus('saved')
    } else {
      setSaveStatus('error')
    }

    router.push('/onboarding/step-7-review')
  }

  const handleNext = async () => {
    if (skipped) {
      router.push('/onboarding/step-7-review')
      return
    }

    setIsSaving(true)
    setSaveStatus('saving')

    const saved = await saveProgress(6, {
      complianceCountry: country,
      complianceFlags,
    })

    if (saved) {
      setSaveStatus('saved')
      router.push('/onboarding/step-7-review')
    } else {
      setSaveStatus('error')
      router.push('/onboarding/step-7-review')
    }
  }

  return (
    <OnboardingLayout currentStep={6} totalSteps={7}>
      <div>
        <h1 className="text-3xl font-bold mb-4">Compliance Context</h1>
        <p className="text-gray-600 mb-8">
          Help us understand your compliance needs
        </p>

        {!skipped ? (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Where is your staff legally employed? <span className="text-red-500">*</span>
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="GB">United Kingdom</option>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
                <option value="IE">Ireland</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Do you need to track? (optional)
              </label>
              <div className="space-y-2">
                {COMPLIANCE_OPTIONS.map((option) => (
                  <label key={option} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={complianceFlags.includes(option)}
                      onChange={() => toggleComplianceFlag(option)}
                      className="mr-2"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <SkipStepButton onSkip={handleSkip} />
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-600">
            <p>You've chosen to configure compliance later.</p>
          </div>
        )}

        <StepNavigation
          currentStep={6}
          totalSteps={7}
          onNext={handleNext}
          onBack={() => router.push('/onboarding/step-5-work-patterns')}
          canGoNext={skipped || country}
          isLoading={isSaving}
          saveStatus={saveStatus}
        />
      </div>
    </OnboardingLayout>
  )
}

