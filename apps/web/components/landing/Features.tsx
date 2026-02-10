'use client'

import { useEffect, useRef, useState } from 'react'
import {
  CalendarDaysIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  ClockIcon,
  MapPinIcon,
  ArrowPathIcon,
  DevicePhoneMobileIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline'

const features = [
  {
    icon: CalendarDaysIcon,
    title: 'Visual Shift Planner',
    description: 'Drag-and-drop week and day views with real-time conflict detection. Schedule a full week in minutes.',
    color: 'bg-indigo-50 text-indigo-600',
    accent: 'group-hover:bg-indigo-100',
  },
  {
    icon: UsersIcon,
    title: 'Staff Profiles',
    description: 'Track roles, availability, certifications, and pay rates. See who is qualified and available at a glance.',
    color: 'bg-violet-50 text-violet-600',
    accent: 'group-hover:bg-violet-100',
  },
  {
    icon: CurrencyDollarIcon,
    title: 'Payroll & Budget',
    description: 'Toggle budget view to see shift costs in real-time. Export CSV payroll data with one click.',
    color: 'bg-emerald-50 text-emerald-600',
    accent: 'group-hover:bg-emerald-100',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Compliance Tracking',
    description: 'Automatic document expiry alerts. Track right-to-work, certifications, and contracts per staff member.',
    color: 'bg-amber-50 text-amber-600',
    accent: 'group-hover:bg-amber-100',
  },
  {
    icon: MapPinIcon,
    title: 'Multi-Location',
    description: 'Manage multiple sites from one dashboard. Assign staff to locations and see coverage gaps instantly.',
    color: 'bg-blue-50 text-blue-600',
    accent: 'group-hover:bg-blue-100',
  },
  {
    icon: ClockIcon,
    title: 'Time & Attendance',
    description: 'Staff clock in and out from the mobile app. Timesheets auto-calculate hours, breaks, and overtime.',
    color: 'bg-rose-50 text-rose-600',
    accent: 'group-hover:bg-rose-100',
  },
  {
    icon: BellAlertIcon,
    title: 'Smart Notifications',
    description: 'Automatic shift reminders 24 hours before. Document expiry warnings at 30, 14, and 7 days.',
    color: 'bg-cyan-50 text-cyan-600',
    accent: 'group-hover:bg-cyan-100',
  },
  {
    icon: DevicePhoneMobileIcon,
    title: 'Mobile App',
    description: 'Staff see their schedule, manage availability, and upload documents right from their phone.',
    color: 'bg-purple-50 text-purple-600',
    accent: 'group-hover:bg-purple-100',
  },
  {
    icon: ArrowPathIcon,
    title: 'Undo & Templates',
    description: 'Full undo/redo for all scheduling actions. Save shift templates to replicate common patterns.',
    color: 'bg-teal-50 text-teal-600',
    accent: 'group-hover:bg-teal-100',
  },
]

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[0]
  index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const Icon = feature.icon

  return (
    <div
      ref={ref}
      className={`group relative bg-white rounded-2xl p-6 ring-1 ring-gray-200/80 hover:ring-gray-300 hover:shadow-lg transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${feature.color} ${feature.accent} transition-colors`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-900">{feature.title}</h3>
      <p className="mt-2 text-sm text-gray-500 leading-relaxed">{feature.description}</p>
    </div>
  )
}

export default function Features() {
  return (
    <section id="features" className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 ring-1 ring-gray-200 mb-4">
            <span className="text-xs font-medium text-gray-600">Everything you need</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Built for the way you work
          </h2>
          <p className="mt-3 text-lg text-gray-500 max-w-2xl mx-auto">
            Every feature designed around real problems that retail and trades managers face daily.
            No bloat, no complexity.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
