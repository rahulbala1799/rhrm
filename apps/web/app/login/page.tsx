import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginForm from './login-form'

export default async function Login() {
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
        <h1 className="text-4xl font-bold mb-2 text-center">Welcome Back</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Sign in to your HR & Staff Management account
        </p>
        <LoginForm />
      </div>
    </main>
  )
}

