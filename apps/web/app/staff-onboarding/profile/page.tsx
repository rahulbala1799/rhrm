'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import StaffOnboardingLayout from '../layout'

export default function StaffProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load existing profile
    fetch('/api/me/profile')
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setFormData({
            fullName: data.profile.full_name || '',
            phone: data.profile.phone || '',
          })
        }
      })
      .catch(console.error)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/me/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.fullName,
          phone: formData.phone || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save profile')
      }

      // Mark staff onboarding as complete
      await fetch('/api/staff-onboarding/complete', {
        method: 'POST',
      })

      router.push('/staff-onboarding/complete')
    } catch (err: any) {
      setError(err.message || 'Failed to save profile')
      setSaving(false)
    }
  }

  return (
    <StaffOnboardingLayout currentStep={2} totalSteps={2}>
      <div>
        <h1 className="text-3xl font-bold mb-4">Complete Your Profile</h1>
        <p className="text-gray-600 mb-8">
          Let's set up your profile so your team can get to know you better.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="+1 (555) 123-4567"
            />
            <p className="text-xs text-gray-500 mt-1">Optional - for emergency contacts and notifications</p>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={saving || !formData.fullName.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Complete Setup'}
            </button>
          </div>
        </form>
      </div>
    </StaffOnboardingLayout>
  )
}

