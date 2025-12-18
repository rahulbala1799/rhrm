'use client'

interface StepNavigationProps {
  currentStep: number
  totalSteps: number
  onNext: () => void
  onBack: () => void
  canGoNext?: boolean
  isLoading?: boolean
  saveStatus?: 'saving' | 'saved' | 'error' | null
}

export function StepNavigation({
  currentStep,
  totalSteps,
  onNext,
  onBack,
  canGoNext = true,
  isLoading = false,
  saveStatus,
}: StepNavigationProps) {
  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === totalSteps

  return (
    <div className="flex items-center justify-between mt-8 pt-6 border-t">
      <div className="flex items-center gap-4">
        {!isFirstStep && (
          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
        )}
        {saveStatus === 'saving' && (
          <span className="text-sm text-gray-500">Saving...</span>
        )}
        {saveStatus === 'saved' && (
          <span className="text-sm text-green-600">Saved</span>
        )}
        {saveStatus === 'error' && (
          <span className="text-sm text-orange-600">Not saved yet</span>
        )}
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext || isLoading}
        className="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLastStep ? 'Create my business' : 'Next'}
      </button>
    </div>
  )
}




