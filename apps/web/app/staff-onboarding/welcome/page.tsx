'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { StaffOnboardingLayout } from '../components/StaffOnboardingLayout'

export default function StaffWelcomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [tenantName, setTenantName] = useState<string>('')

  useEffect(() => {
    // Fetch tenant info
    fetch('/api/me/tenant')
      .then((res) => res.json())
      .then((data) => {
        if (data.tenant) {
          setTenantName(data.tenant.name)
        }
      })
      .catch(console.error)
  }, [])

  const handleNext = () => {
    setLoading(true)
    router.push('/staff-onboarding/profile')
  }

  return (
    <StaffOnboardingLayout currentStep={1} totalSteps={2}>
      <div>
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-4">Welcome to the Team!</h1>
          <p className="text-gray-600 text-lg">
            {tenantName ? (
              <>
                You've been invited to join <span className="font-semibold text-gray-900">{tenantName}</span>
              </>
            ) : (
              "You've been invited to join the team"
            )}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-3 text-gray-900">What's Next?</h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Complete your profile information</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Get access to your dashboard and schedule</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Start managing your shifts and availability</span>
            </li>
          </ul>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleNext}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Get Started'}
          </button>
        </div>
      </div>
    </StaffOnboardingLayout>
  )
}

