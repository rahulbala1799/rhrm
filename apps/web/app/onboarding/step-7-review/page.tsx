'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboardingProgress } from '../hooks/useOnboardingProgress'
import { OnboardingLayout } from '../components/OnboardingLayout'
import { StepNavigation } from '../components/StepNavigation'

export default function Step7ReviewPage() {
  const router = useRouter()
  const { progress, sessionId, idempotencyKey, saveProgress, initializeSession } = useOnboardingProgress()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) {
      initializeSession()
    }
  }, [sessionId, initializeSession])

  const handleCreate = async () => {
    if (!progress?.data || !sessionId || !idempotencyKey) {
      setError('Missing required information. Please go back and complete all steps.')
      return
    }

    setIsCreating(true)
    setError(null)

    const data = progress.data
    const skippedSteps = progress.skippedSteps || []

    // Prepare locations for creation
    const locations: any[] = []
    if (data.primaryAddress && !data.skipped) {
      locations.push({
        name: 'Primary Location',
        addressLine1: data.primaryAddress.addressLine1,
        city: data.primaryAddress.city,
        postcode: data.primaryAddress.postcode,
        country: data.primaryAddress.country,
        isDefault: true,
      })

      if (data.locations && Array.isArray(data.locations)) {
        data.locations.forEach((loc: any) => {
          if (loc.name && loc.addressLine1) {
            locations.push({
              name: loc.name,
              addressLine1: loc.addressLine1,
              city: loc.city,
              postcode: loc.postcode,
              country: loc.country || data.primaryAddress.country,
              phone: loc.phone,
              isDefault: loc.isDefault || false,
            })
          }
        })
      }
    }

    try {
      const response = await fetch('/api/tenants/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.businessName,
          slug: data.slug,
          idempotencyKey,
          sessionId,
          businessType: data.businessType === 'Other' ? data.otherBusinessType : data.businessType,
          companyRegistrationNumber: data.companyRegistrationNumber,
          vatNumber: data.vatNumber,
          country: data.country,
          teamSize: data.teamSize,
          teamStructure: data.teamStructure,
          workModel: data.workModel,
          workHours: data.workHours,
          weekStructure: data.weekStructure,
          complianceFlags: {
            trackRightToWork: data.complianceFlags?.includes('Right to work documents') || false,
            trackCertifications: data.complianceFlags?.includes('Certifications (e.g., safety, food handling)') || false,
            trackExpiryDates: data.complianceFlags?.includes('Expiry dates') || false,
          },
          skippedSteps,
          locations,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        if (response.status === 409) {
          if (errorData.slugTaken) {
            setError('This business URL is already taken. Please go back and choose a different one.')
          } else {
            setError(errorData.error || 'Unable to create business. You may already have one.')
          }
        } else {
          setError(errorData.error || 'Failed to create business. Please try again.')
        }
        setIsCreating(false)
        return
      }

      const result = await response.json()

      // Redirect to completion page
      router.push('/onboarding/complete')
    } catch (err: any) {
      console.error('Error creating tenant:', err)
      setError('An unexpected error occurred. Please try again.')
      setIsCreating(false)
    }
  }

  if (!progress?.data) {
    return (
      <OnboardingLayout currentStep={7} totalSteps={7}>
        <div>Loading...</div>
      </OnboardingLayout>
    )
  }

  const data = progress.data
  const skippedSteps = progress.skippedSteps || []

  return (
    <OnboardingLayout currentStep={7} totalSteps={7}>
      <div>
        <h1 className="text-3xl font-bold mb-4">Review & Create</h1>
        <p className="text-gray-600 mb-8">
          Please review your information. This will create your company and make you the account owner.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-lg font-semibold mb-2">Business Information</h2>
            <div className="space-y-1 text-sm">
              <p><strong>Name:</strong> {data.businessName}</p>
              <p><strong>URL:</strong> {data.slug}</p>
              <p><strong>Type:</strong> {data.businessType === 'Other' ? data.otherBusinessType : data.businessType}</p>
              {data.companyRegistrationNumber && (
                <p><strong>Registration:</strong> {data.companyRegistrationNumber}</p>
              )}
              {data.vatNumber && <p><strong>VAT:</strong> {data.vatNumber}</p>}
              <p><strong>Country:</strong> {data.country}</p>
            </div>
            <button
              onClick={() => router.push('/onboarding/step-2-business')}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Edit
            </button>
          </div>

          {!skippedSteps.includes(3) && data.primaryAddress && (
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold mb-2">Address</h2>
              <div className="text-sm">
                <p>{data.primaryAddress.addressLine1}</p>
                <p>{data.primaryAddress.city}, {data.primaryAddress.postcode}</p>
                <p>{data.primaryAddress.country}</p>
              </div>
              <button
                onClick={() => router.push('/onboarding/step-3-locations')}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Edit
              </button>
            </div>
          )}

          <div className="border-b pb-4">
            <h2 className="text-lg font-semibold mb-2">Team</h2>
            <div className="text-sm">
              <p><strong>Size:</strong> {data.teamSize}</p>
              <p><strong>Structure:</strong> {data.teamStructure?.join(', ')}</p>
            </div>
            <button
              onClick={() => router.push('/onboarding/step-4-team')}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Edit
            </button>
          </div>

          <div className="border-b pb-4">
            <h2 className="text-lg font-semibold mb-2">Work Patterns</h2>
            <div className="text-sm">
              <p><strong>Model:</strong> {data.workModel}</p>
              <p><strong>Hours:</strong> {data.workHours?.join(', ')}</p>
              <p><strong>Week:</strong> {data.weekStructure}</p>
            </div>
            <button
              onClick={() => router.push('/onboarding/step-5-work-patterns')}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Edit
            </button>
          </div>

          {!skippedSteps.includes(6) && (
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold mb-2">Compliance</h2>
              <div className="text-sm">
                <p><strong>Country:</strong> {data.complianceCountry || data.country}</p>
                {data.complianceFlags && data.complianceFlags.length > 0 && (
                  <p><strong>Tracking:</strong> {data.complianceFlags.join(', ')}</p>
                )}
              </div>
              <button
                onClick={() => router.push('/onboarding/step-6-compliance')}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Edit
              </button>
            </div>
          )}

          {skippedSteps.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> You skipped some steps. You can complete them later.
              </p>
            </div>
          )}
        </div>

        <StepNavigation
          currentStep={7}
          totalSteps={7}
          onNext={handleCreate}
          onBack={() => router.push('/onboarding/step-6-compliance')}
          canGoNext={!isCreating}
          isLoading={isCreating}
        />
      </div>
    </OnboardingLayout>
  )
}




