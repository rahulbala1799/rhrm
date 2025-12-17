'use client'

import { ReactNode } from 'react'
import { ProgressIndicator } from './ProgressIndicator'

interface OnboardingLayoutProps {
  currentStep: number
  totalSteps: number
  children: ReactNode
}

export function OnboardingLayout({
  currentStep,
  totalSteps,
  children,
}: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <ProgressIndicator currentStep={currentStep} totalSteps={totalSteps} />
          {children}
        </div>
      </div>
    </div>
  )
}


