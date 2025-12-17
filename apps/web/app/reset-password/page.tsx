import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ResetPasswordForm from './reset-password-form'

export default async function ResetPassword() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is not authenticated, they need to use the forgot password flow
  if (!user) {
    redirect('/forgot-password')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-md w-full">
        <h1 className="text-4xl font-bold mb-2 text-center">Set New Password</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Enter your new password below
        </p>
        <ResetPasswordForm />
      </div>
    </main>
  )
}


