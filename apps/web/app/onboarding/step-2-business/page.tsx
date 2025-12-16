'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboardingProgress } from '../hooks/useOnboardingProgress'
import { OnboardingLayout } from '../components/OnboardingLayout'
import { StepNavigation } from '../components/StepNavigation'

const BUSINESS_TYPES = [
  'Retail',
  'Hospitality',
  'Construction/Trades',
  'Agency/Staffing',
  'Healthcare/Care',
  'Other',
]

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50)
}

function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    // Remove http://, https://, www.
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    // Remove domain extensions (.com, .ie, etc.) and everything after the last dot
    .replace(/\.[a-z]{2,}(\/.*)?$/i, '')
    // Replace dots, spaces, and other invalid chars with hyphens
    .replace(/[^a-z0-9-]/g, '-')
    // Replace multiple hyphens with single hyphen
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)
}

export default function Step2BusinessPage() {
  const router = useRouter()
  const { progress, sessionId, saveProgress, initializeSession } = useOnboardingProgress()
  const [businessName, setBusinessName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [checkingSlug, setCheckingSlug] = useState(false)
  const [businessType, setBusinessType] = useState('')
  const [otherBusinessType, setOtherBusinessType] = useState('')
  const [companyRegistration, setCompanyRegistration] = useState('')
  const [vatNumber, setVatNumber] = useState('')
  const [country, setCountry] = useState('GB')
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null)

  useEffect(() => {
    if (!sessionId) {
      initializeSession()
    }

    // Load existing data
    if (progress?.data) {
      setBusinessName(progress.data.businessName || '')
      setSlug(progress.data.slug || '')
      setBusinessType(progress.data.businessType || '')
      setOtherBusinessType(progress.data.otherBusinessType || '')
      setCompanyRegistration(progress.data.companyRegistrationNumber || '')
      setVatNumber(progress.data.vatNumber || '')
      setCountry(progress.data.country || 'GB')
    }
  }, [sessionId, progress, initializeSession])

  useEffect(() => {
    if (businessName) {
      const generatedSlug = generateSlug(businessName)
      setSlug(generatedSlug)
      setSlugAvailable(null)
    }
  }, [businessName])

  const checkSlugAvailability = async (slugToCheck: string) => {
    if (!slugToCheck) {
      setSlugAvailable(null)
      return
    }

    setCheckingSlug(true)
    try {
      const response = await fetch(`/api/tenants/check-slug?slug=${encodeURIComponent(slugToCheck)}`)
      const data = await response.json()
      setSlugAvailable(data.available)
    } catch (error) {
      console.error('Error checking slug:', error)
      setSlugAvailable(null)
    } finally {
      setCheckingSlug(false)
    }
  }

  const handleSlugBlur = () => {
    if (slug) {
      checkSlugAvailability(slug)
    }
  }

  const handleNext = async () => {
    if (!businessName || !slug) {
      return
    }

    setIsSaving(true)
    setSaveStatus('saving')

    const saved = await saveProgress(2, {
      businessName,
      slug,
      businessType,
      otherBusinessType: businessType === 'Other' ? otherBusinessType : undefined,
      companyRegistrationNumber: companyRegistration || undefined,
      vatNumber: vatNumber || undefined,
      country,
    })

    if (saved) {
      setSaveStatus('saved')
      router.push('/onboarding/step-3-locations')
    } else {
      setSaveStatus('error')
      router.push('/onboarding/step-3-locations')
    }
  }

  const canProceed = !!(businessName && slug && (!slug || slugAvailable !== false))

  return (
    <OnboardingLayout currentStep={2} totalSteps={7}>
      <div>
        <h1 className="text-3xl font-bold mb-4">Business Information</h1>
        <p className="text-gray-600 mb-8">
          Tell us about your business
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business/Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Acme Inc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business URL <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">yourcompany.com/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  const sanitized = sanitizeSlug(e.target.value)
                  setSlug(sanitized)
                  setSlugAvailable(null)
                }}
                onBlur={handleSlugBlur}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="acme-inc"
              />
            </div>
            {checkingSlug && (
              <p className="text-sm text-gray-500 mt-1">Checking availability...</p>
            )}
            {slugAvailable === false && (
              <p className="text-sm text-red-600 mt-1">This URL is already taken. Please choose another.</p>
            )}
            {slugAvailable === true && (
              <p className="text-sm text-green-600 mt-1">This URL is available!</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Type <span className="text-red-500">*</span>
            </label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a type</option>
              {BUSINESS_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {businessType === 'Other' && (
              <input
                type="text"
                value={otherBusinessType}
                onChange={(e) => setOtherBusinessType(e.target.value)}
                placeholder="Please specify"
                className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Registration Number (optional)
            </label>
            <input
              type="text"
              value={companyRegistration}
              onChange={(e) => setCompanyRegistration(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              VAT Number (optional)
            </label>
            <input
              type="text"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country of Operation <span className="text-red-500">*</span>
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
        </div>

        <StepNavigation
          currentStep={2}
          totalSteps={7}
          onNext={handleNext}
          onBack={() => router.push('/onboarding/step-1-welcome')}
          canGoNext={canProceed}
          isLoading={isSaving}
          saveStatus={saveStatus}
        />
      </div>
    </OnboardingLayout>
  )
}

