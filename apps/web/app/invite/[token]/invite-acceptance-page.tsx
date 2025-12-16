'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  expires_at: string
  tenants: {
    name: string
    slug: string
  } | null | {
    name: string
    slug: string
  }[]
}

interface Props {
  invitation: Invitation
  token: string
}

export default function InviteAcceptancePage({ invitation, token }: Props) {
  const router = useRouter()
  const [isSignup, setIsSignup] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: invitation.email,
    password: '',
    fullName: '',
  })

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Sign up
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`,
          data: {
            full_name: formData.fullName,
          },
        },
      })

      if (signupError) throw signupError

      // If email confirmation is required, show message
      if (signupData.user && !signupData.session) {
        alert('Please check your email to confirm your account, then return to accept the invitation.')
        return
      }

      // If logged in immediately, accept invitation
      if (signupData.session) {
        await acceptInvitation()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up')
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (loginError) throw loginError

      // Accept invitation after login
      await acceptInvitation()
    } catch (err: any) {
      setError(err.message || 'Failed to log in')
      setLoading(false)
    }
  }

  const acceptInvitation = async () => {
    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to accept invitation')
      }

      // Redirect to staff onboarding
      window.location.href = '/staff-onboarding/welcome'
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation')
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You're Invited!</h1>
          <p className="text-gray-600">
            Join <span className="font-semibold text-gray-900">
              {Array.isArray(invitation.tenants) 
                ? invitation.tenants[0]?.name || 'the team'
                : invitation.tenants?.name || 'the team'}
            </span> as{' '}
            <span className="font-semibold text-gray-900 capitalize">{invitation.role}</span>
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="mb-6">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setIsSignup(true)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                isSignup
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => setIsSignup(false)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                !isSignup
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Log In
            </button>
          </div>
        </div>

        <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-4">
          {isSignup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
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
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
            <p className="text-xs text-gray-500 mt-1">This email was invited</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={isSignup ? 'Create a password' : 'Enter your password'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : isSignup ? 'Sign Up & Accept' : 'Log In & Accept'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            By continuing, you agree to join{' '}
            {Array.isArray(invitation.tenants) 
              ? invitation.tenants[0]?.name || 'the organization'
              : invitation.tenants?.name || 'the organization'}
          </p>
        </div>
      </div>
    </div>
  )
}

