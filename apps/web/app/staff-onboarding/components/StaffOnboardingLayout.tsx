'use client'

import { ReactNode } from 'react'
import { ProgressIndicator } from '../../onboarding/components/ProgressIndicator'

interface StaffOnboardingLayoutProps {
  children: ReactNode
  currentStep: number
  totalSteps: number
}

export function StaffOnboardingLayout({
  children,
  currentStep,
  totalSteps,
}: StaffOnboardingLayoutProps) {
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

