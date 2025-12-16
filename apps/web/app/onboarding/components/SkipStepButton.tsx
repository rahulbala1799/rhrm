'use client'

interface SkipStepButtonProps {
  onSkip: () => void
  label?: string
}

export function SkipStepButton({ onSkip, label = "I'll do this later" }: SkipStepButtonProps) {
  return (
    <button
      type="button"
      onClick={onSkip}
      className="text-sm text-gray-600 hover:text-gray-800 underline"
    >
      {label}
    </button>
  )
}

