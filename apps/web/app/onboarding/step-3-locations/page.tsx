'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboardingProgress } from '../hooks/useOnboardingProgress'
import { OnboardingLayout } from '../components/OnboardingLayout'
import { StepNavigation } from '../components/StepNavigation'
import { SkipStepButton } from '../components/SkipStepButton'

interface Location {
  name: string
  addressLine1: string
  city: string
  postcode: string
  country: string
  phone?: string
  isDefault: boolean
}

export default function Step3LocationsPage() {
  const router = useRouter()
  const { progress, sessionId, saveProgress, initializeSession } = useOnboardingProgress()
  const [primaryAddress, setPrimaryAddress] = useState({
    addressLine1: '',
    city: '',
    postcode: '',
    country: 'GB',
  })
  const [isWorkLocation, setIsWorkLocation] = useState(true)
  const [locations, setLocations] = useState<Location[]>([])
  const [skipped, setSkipped] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null)

  useEffect(() => {
    if (!sessionId) {
      initializeSession()
    }

    // Load existing data
    if (progress?.data) {
      if (progress.data.primaryAddress) {
        setPrimaryAddress(progress.data.primaryAddress)
      }
      setIsWorkLocation(progress.data.isWorkLocation !== false)
      if (progress.data.locations) {
        setLocations(progress.data.locations)
      }
      if (progress.skippedSteps?.includes(3)) {
        setSkipped(true)
      }
    }
  }, [sessionId, progress, initializeSession])

  const addLocation = () => {
    setLocations([
      ...locations,
      {
        name: '',
        addressLine1: '',
        city: '',
        postcode: '',
        country: primaryAddress.country,
        isDefault: false,
      },
    ])
  }

  const updateLocation = (index: number, field: keyof Location, value: any) => {
    const updated = [...locations]
    updated[index] = { ...updated[index], [field]: value }
    setLocations(updated)
  }

  const removeLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index))
  }

  const handleSkip = async () => {
    setSkipped(true)
    setIsSaving(true)
    setSaveStatus('saving')

    const skippedSteps = progress?.skippedSteps || []
    if (!skippedSteps.includes(3)) {
      skippedSteps.push(3)
    }

    const saved = await saveProgress(3, {
      skipped: true,
    }, skippedSteps)

    if (saved) {
      setSaveStatus('saved')
    } else {
      setSaveStatus('error')
    }

    router.push('/onboarding/step-4-team')
  }

  const handleNext = async () => {
    if (skipped) {
      router.push('/onboarding/step-4-team')
      return
    }

    const hasPrimaryAddress = primaryAddress.addressLine1 && primaryAddress.city && primaryAddress.postcode
    if (!hasPrimaryAddress) {
      return
    }

    setIsSaving(true)
    setSaveStatus('saving')

    const saved = await saveProgress(3, {
      primaryAddress,
      isWorkLocation,
      locations: isWorkLocation ? [] : locations,
    })

    if (saved) {
      setSaveStatus('saved')
      router.push('/onboarding/step-4-team')
    } else {
      setSaveStatus('error')
      router.push('/onboarding/step-4-team')
    }
  }

  const canProceed = skipped || (primaryAddress.addressLine1 && primaryAddress.city && primaryAddress.postcode)

  return (
    <OnboardingLayout currentStep={3} totalSteps={7}>
      <div>
        <h1 className="text-3xl font-bold mb-4">Business Address</h1>
        <p className="text-gray-600 mb-8">
          Where is your business located?
        </p>

        {!skipped ? (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address Line 1 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={primaryAddress.addressLine1}
                onChange={(e) => setPrimaryAddress({ ...primaryAddress, addressLine1: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={primaryAddress.city}
                onChange={(e) => setPrimaryAddress({ ...primaryAddress, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Postcode <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={primaryAddress.postcode}
                onChange={(e) => setPrimaryAddress({ ...primaryAddress, postcode: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country <span className="text-red-500">*</span>
              </label>
              <select
                value={primaryAddress.country}
                onChange={(e) => setPrimaryAddress({ ...primaryAddress, country: e.target.value })}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Is this where staff work?
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={isWorkLocation}
                    onChange={() => setIsWorkLocation(true)}
                    className="mr-2"
                  />
                  Yes
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!isWorkLocation}
                    onChange={() => setIsWorkLocation(false)}
                    className="mr-2"
                  />
                  No
                </label>
              </div>
            </div>

            {!isWorkLocation && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Work Locations</h3>
                  <button
                    type="button"
                    onClick={addLocation}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Location
                  </button>
                </div>

                {locations.map((location, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium">Location {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeLocation(index)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="space-y-4">
                      <input
                        type="text"
                        placeholder="Location name"
                        value={location.name}
                        onChange={(e) => updateLocation(index, 'name', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md"
                      />
                      <input
                        type="text"
                        placeholder="Address Line 1"
                        value={location.addressLine1}
                        onChange={(e) => updateLocation(index, 'addressLine1', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="City"
                          value={location.city}
                          onChange={(e) => updateLocation(index, 'city', e.target.value)}
                          className="px-4 py-2 border border-gray-300 rounded-md"
                        />
                        <input
                          type="text"
                          placeholder="Postcode"
                          value={location.postcode}
                          onChange={(e) => updateLocation(index, 'postcode', e.target.value)}
                          className="px-4 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={location.isDefault}
                          onChange={(e) => updateLocation(index, 'isDefault', e.target.checked)}
                          className="mr-2"
                        />
                        Set as default location
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-center">
              <SkipStepButton onSkip={handleSkip} />
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-600">
            <p>You've chosen to add locations later.</p>
          </div>
        )}

        <StepNavigation
          currentStep={3}
          totalSteps={7}
          onNext={handleNext}
          onBack={() => router.push('/onboarding/step-2-business')}
          canGoNext={canProceed}
          isLoading={isSaving}
          saveStatus={saveStatus}
        />
      </div>
    </OnboardingLayout>
  )
}

