'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckIcon } from '@heroicons/react/24/outline'

const plans = [
  {
    name: 'Starter',
    description: 'For small teams getting started',
    monthlyPrice: 29,
    yearlyPrice: 24,
    features: [
      'Up to 15 staff members',
      '1 location',
      'Shift scheduling (week & day views)',
      'Staff profiles & availability',
      'Basic compliance tracking',
      'Mobile app access',
      'Email support',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Professional',
    description: 'For growing multi-location teams',
    monthlyPrice: 69,
    yearlyPrice: 59,
    features: [
      'Up to 50 staff members',
      'Up to 5 locations',
      'Everything in Starter, plus:',
      'Shift templates & duplication',
      'Budget view with cost tracking',
      'Payroll exports (CSV)',
      'Advanced compliance (expiry alerts)',
      'Overtime calculations',
      'Audit log',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    description: 'For large operations at scale',
    monthlyPrice: 149,
    yearlyPrice: 129,
    features: [
      'Unlimited staff members',
      'Unlimited locations',
      'Everything in Professional, plus:',
      'Multi-tenant management',
      'Custom job roles & permissions',
      'API access',
      'SSO integration',
      'Dedicated account manager',
      'Custom onboarding',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
]

export default function Pricing() {
  const [yearly, setYearly] = useState(true)

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mt-3 text-lg text-gray-500 max-w-xl mx-auto">
            Start free for 14 days. No credit card required.
          </p>

          {/* Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 bg-white rounded-xl p-1 ring-1 ring-gray-200 shadow-sm">
            <button
              onClick={() => setYearly(false)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                !yearly ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                yearly ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Yearly
              <span className="ml-1.5 text-[10px] font-bold text-emerald-400">SAVE 15%</span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-2xl p-6 sm:p-8 transition-all ${
                plan.popular
                  ? 'ring-2 ring-indigo-600 shadow-xl shadow-indigo-600/10 scale-[1.02]'
                  : 'ring-1 ring-gray-200 shadow-sm hover:shadow-md'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900 tracking-tight">
                    ${yearly ? plan.yearlyPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-sm text-gray-500">/month</span>
                </div>
                {yearly && (
                  <p className="text-xs text-gray-400 mt-1">
                    Billed annually (${plan.yearlyPrice * 12}/yr)
                  </p>
                )}
              </div>

              <Link
                href="/signup"
                className={`block w-full text-center px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
                  plan.popular
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20'
                    : 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm'
                }`}
              >
                {plan.cta}
              </Link>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    {feature.includes('Everything in') ? (
                      <>
                        <span className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-medium text-gray-700">{feature}</span>
                      </>
                    ) : (
                      <>
                        <CheckIcon className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
