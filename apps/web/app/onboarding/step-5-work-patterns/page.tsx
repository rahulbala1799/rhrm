'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboardingProgress } from '../hooks/useOnboardingProgress'
import { OnboardingLayout } from '../components/OnboardingLayout'
import { StepNavigation } from '../components/StepNavigation'

const WORK_MODELS = ['Fixed weekly schedule', 'Shift-based', 'On-demand/ad-hoc']
const WORK_HOURS = ['Daytime', 'Evenings', 'Nights', 'Mixed']
const WEEK_STRUCTURES = ['5-day operation', '6-day operation', '7-day operation']

export default function Step5WorkPatternsPage() {
  const router = useRouter()
  const { progress, sessionId, saveProgress, initializeSession } = useOnboardingProgress()
  const [workModel, setWorkModel] = useState('')
  const [workHours, setWorkHours] = useState<string[]>([])
  const [weekStructure, setWeekStructure] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null)

  useEffect(() => {
    if (!sessionId) {
      initializeSession()
    }

    // Load existing data
    if (progress?.data) {
      setWorkModel(progress.data.workModel || '')
      setWorkHours(progress.data.workHours || [])
      setWeekStructure(progress.data.weekStructure || '')
    }
  }, [sessionId, progress, initializeSession])

  const toggleWorkHours = (hour: string) => {
    if (workHours.includes(hour)) {
      setWorkHours(workHours.filter((h) => h !== hour))
    } else {
      setWorkHours([...workHours, hour])
    }
  }

  const handleNext = async () => {
    setIsSaving(true)
    setSaveStatus('saving')

    const saved = await saveProgress(5, {
      workModel,
      workHours,
      weekStructure,
    })

    if (saved) {
      setSaveStatus('saved')
      router.push('/onboarding/step-6-compliance')
    } else {
      setSaveStatus('error')
      router.push('/onboarding/step-6-compliance')
    }
  }

  return (
    <OnboardingLayout currentStep={5} totalSteps={7}>
      <div>
        <h1 className="text-3xl font-bold mb-4">Work Patterns</h1>
        <p className="text-gray-600 mb-2">
          Tell us about your typical work patterns
        </p>
        <p className="text-sm text-gray-500 mb-8">
          These are defaults and can be changed later
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Typical working model <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {WORK_MODELS.map((model) => (
                <label key={model} className="flex items-center">
                  <input
                    type="radio"
                    name="workModel"
                    value={model}
                    checked={workModel === model}
                    onChange={(e) => setWorkModel(e.target.value)}
                    className="mr-2"
                  />
                  {model}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Do staff work? <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {WORK_HOURS.map((hour) => (
                <label key={hour} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={workHours.includes(hour)}
                    onChange={() => toggleWorkHours(hour)}
                    className="mr-2"
                  />
                  {hour}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Week structure <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {WEEK_STRUCTURES.map((structure) => (
                <label key={structure} className="flex items-center">
                  <input
                    type="radio"
                    name="weekStructure"
                    value={structure}
                    checked={weekStructure === structure}
                    onChange={(e) => setWeekStructure(e.target.value)}
                    className="mr-2"
                  />
                  {structure}
                </label>
              ))}
            </div>
          </div>
        </div>

        <StepNavigation
          currentStep={5}
          totalSteps={7}
          onNext={handleNext}
          onBack={() => router.push('/onboarding/step-4-team')}
          canGoNext={workModel && workHours.length > 0 && weekStructure}
          isLoading={isSaving}
          saveStatus={saveStatus}
        />
      </div>
    </OnboardingLayout>
  )
}

