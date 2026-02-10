import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ForgotPasswordForm from './forgot-password-form'

export default async function ForgotPassword() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/go')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-md w-full">
        <h1 className="text-4xl font-bold mb-2 text-center">Reset Password</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Enter your email and we'll send you a password reset link
        </p>
        <ForgotPasswordForm />
        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Remember your password?{' '}
          <a href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </main>
  )
}




