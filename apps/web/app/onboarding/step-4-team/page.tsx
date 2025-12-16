'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboardingProgress } from '../hooks/useOnboardingProgress'
import { OnboardingLayout } from '../components/OnboardingLayout'
import { StepNavigation } from '../components/StepNavigation'

const TEAM_SIZES = ['1-5', '6-20', '21-50', '50+']
const TEAM_STRUCTURES = [
  'Full-time employees',
  'Part-time employees',
  'Casual/shift workers',
  'Contractors',
  'Mixed',
]

export default function Step4TeamPage() {
  const router = useRouter()
  const { progress, sessionId, saveProgress, initializeSession } = useOnboardingProgress()
  const [teamSize, setTeamSize] = useState('')
  const [teamStructure, setTeamStructure] = useState<string[]>([])
  const [otherSystem, setOtherSystem] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null)

  useEffect(() => {
    if (!sessionId) {
      initializeSession()
    }

    // Load existing data
    if (progress?.data) {
      setTeamSize(progress.data.teamSize || '')
      setTeamStructure(progress.data.teamStructure || [])
      setOtherSystem(progress.data.otherSystem || '')
    }
  }, [sessionId, progress, initializeSession])

  const toggleTeamStructure = (structure: string) => {
    if (teamStructure.includes(structure)) {
      setTeamStructure(teamStructure.filter((s) => s !== structure))
    } else {
      setTeamStructure([...teamStructure, structure])
    }
  }

  const handleNext = async () => {
    setIsSaving(true)
    setSaveStatus('saving')

    const saved = await saveProgress(4, {
      teamSize,
      teamStructure,
      otherSystem: otherSystem || undefined,
    })

    if (saved) {
      setSaveStatus('saved')
      router.push('/onboarding/step-5-work-patterns')
    } else {
      setSaveStatus('error')
      router.push('/onboarding/step-5-work-patterns')
    }
  }

  return (
    <OnboardingLayout currentStep={4} totalSteps={7}>
      <div>
        <h1 className="text-3xl font-bold mb-4">Team Size & Structure</h1>
        <p className="text-gray-600 mb-8">
          Tell us about your team
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              How many people do you currently employ? <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {TEAM_SIZES.map((size) => (
                <label key={size} className="flex items-center">
                  <input
                    type="radio"
                    name="teamSize"
                    value={size}
                    checked={teamSize === size}
                    onChange={(e) => setTeamSize(e.target.value)}
                    className="mr-2"
                  />
                  {size}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              What best describes your team? <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {TEAM_STRUCTURES.map((structure) => (
                <label key={structure} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={teamStructure.includes(structure)}
                    onChange={() => toggleTeamStructure(structure)}
                    className="mr-2"
                  />
                  {structure}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Do you currently use another system? (optional)
            </label>
            <input
              type="text"
              value={otherSystem}
              onChange={(e) => setOtherSystem(e.target.value)}
              placeholder="e.g., Excel, another HR system"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <StepNavigation
          currentStep={4}
          totalSteps={7}
          onNext={handleNext}
          onBack={() => router.push('/onboarding/step-3-locations')}
          canGoNext={!!(teamSize && teamStructure.length > 0)}
          isLoading={isSaving}
          saveStatus={saveStatus}
        />
      </div>
    </OnboardingLayout>
  )
}

