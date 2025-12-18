import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SignupForm from './signup-form'

export default async function Signup() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-md w-full">
        <h1 className="text-4xl font-bold mb-2 text-center">Create Account</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Sign up to get started with HR & Staff Management
        </p>
        <SignupForm />
        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </main>
  )
}




