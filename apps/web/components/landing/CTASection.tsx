'use client'

import Link from 'next/link'
import { ChevronRightIcon } from '@heroicons/react/24/outline'

export default function CTASection() {
  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="relative">
          {/* Background glow */}
          <div className="absolute inset-0 -m-8 bg-gradient-to-r from-indigo-50 via-purple-50/50 to-indigo-50 rounded-3xl blur-2xl" />

          <div className="relative bg-white rounded-3xl p-10 sm:p-14 ring-1 ring-gray-200 shadow-xl shadow-gray-900/5">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Ready to streamline your scheduling?
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-lg mx-auto">
              Join hundreds of businesses saving hours every week. Start your free 14-day trial today.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 hover:shadow-xl hover:shadow-indigo-600/30"
              >
                Start Free Trial
                <ChevronRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold text-gray-700 bg-white rounded-xl ring-1 ring-gray-200 hover:ring-gray-300 hover:bg-gray-50 transition-all shadow-sm"
              >
                Log in to your account
              </Link>
            </div>

            <p className="mt-6 text-xs text-gray-400">
              No credit card required. Full access for 14 days. Cancel anytime.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
