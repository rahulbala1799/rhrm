'use client'

import { useEffect, useRef, useState } from 'react'
import {
  CalendarDaysIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'

// Live stat card component (mirrors the real StatCard from the app)
function LiveStatCard({
  title,
  value,
  icon,
  iconColor,
  trend,
  delay,
}: {
  title: string
  value: number
  icon: React.ReactNode
  iconColor: string
  trend?: { value: string; isPositive: boolean }
  delay: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [count, setCount] = useState(0)

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
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Animate count up
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => {
      const duration = 1200
      const steps = 30
      const increment = value / steps
      let current = 0
      const interval = setInterval(() => {
        current += increment
        if (current >= value) {
          setCount(value)
          clearInterval(interval)
        } else {
          setCount(Math.floor(current))
        }
      }, duration / steps)
      return () => clearInterval(interval)
    }, delay)
    return () => clearTimeout(timer)
  }, [visible, value, delay])

  return (
    <div
      ref={ref}
      className={`bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-5 transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 tracking-tight tabular-nums">
            {count}
          </p>
          {trend && (
            <p className={`text-xs font-medium mt-1.5 ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              {trend.isPositive ? '\u2191' : '\u2193'} {trend.value}
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

// Today's schedule table
function ScheduleTable() {
  const scheduleData = [
    { time: '06:00 - 14:00', role: 'Supervisor', location: 'Main Store', staff: 'Maria G.', status: 'confirmed', statusColor: 'bg-green-50 text-green-700' },
    { time: '07:00 - 15:00', role: 'Warehouse', location: 'Warehouse', staff: 'Tom W.', status: 'confirmed', statusColor: 'bg-green-50 text-green-700' },
    { time: '09:00 - 17:00', role: 'Barista', location: 'Main Store', staff: 'Sarah K.', status: 'confirmed', statusColor: 'bg-green-50 text-green-700' },
    { time: '09:00 - 17:00', role: 'Cashier', location: 'Downtown', staff: 'James L.', status: 'published', statusColor: 'bg-blue-50 text-blue-700' },
    { time: '12:00 - 20:00', role: 'Floor Staff', location: 'Main Store', staff: 'Priya P.', status: 'published', statusColor: 'bg-blue-50 text-blue-700' },
    { time: '14:00 - 22:00', role: 'Barista', location: 'Main Store', staff: 'Sarah K.', status: 'draft', statusColor: 'bg-gray-50 text-gray-600' },
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <ClockIcon className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">Today&apos;s Schedule</h3>
        </div>
        <span className="text-xs text-gray-400">6 shifts</span>
      </div>
      <div className="divide-y divide-gray-50">
        {scheduleData.map((row, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/50 transition-colors">
            <div className="w-24 text-xs font-medium text-gray-900 tabular-nums">{row.time}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-700">{row.role}</div>
              <div className="text-[11px] text-gray-400">{row.location}</div>
            </div>
            <div className="text-xs text-gray-600 font-medium">{row.staff}</div>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${row.statusColor}`}>
              {row.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Alerts panel
function AlertsPanel() {
  const alerts = [
    { icon: ExclamationTriangleIcon, text: '2 documents expiring this week', color: 'text-amber-500 bg-amber-50', link: 'View expiries' },
    { icon: CalendarDaysIcon, text: '3 unfilled shifts on Saturday', color: 'text-red-500 bg-red-50', link: 'View schedule' },
    { icon: CheckCircleIcon, text: 'Payroll export ready for download', color: 'text-green-500 bg-green-50', link: 'Download' },
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900">Alerts &amp; Tasks</h3>
        </div>
        <span className="text-xs text-gray-400">3 items</span>
      </div>
      <div className="divide-y divide-gray-50">
        {alerts.map((alert, i) => {
          const Icon = alert.icon
          return (
            <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${alert.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="flex-1 text-xs text-gray-700">{alert.text}</p>
              <span className="text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer">{alert.link}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function DashboardPreview() {
  return (
    <section id="dashboard" className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 ring-1 ring-emerald-100 mb-4">
            <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700">Real-time insights</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Your command center
          </h2>
          <p className="mt-3 text-lg text-gray-500 max-w-2xl mx-auto">
            See everything at a glance. Today&apos;s shifts, coverage gaps, compliance alerts, and team metrics
            all on one dashboard.
          </p>
        </div>

        {/* Dashboard mockup */}
        <div className="max-w-5xl mx-auto">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <LiveStatCard
              title="Shifts Today"
              value={12}
              icon={<CalendarDaysIcon className="w-5 h-5" />}
              iconColor="bg-indigo-50 text-indigo-600"
              trend={{ value: '8% from last week', isPositive: true }}
              delay={0}
            />
            <LiveStatCard
              title="Active Staff"
              value={24}
              icon={<UsersIcon className="w-5 h-5" />}
              iconColor="bg-violet-50 text-violet-600"
              trend={{ value: '2 new this month', isPositive: true }}
              delay={100}
            />
            <LiveStatCard
              title="Compliance"
              value={96}
              icon={<ShieldCheckIcon className="w-5 h-5" />}
              iconColor="bg-emerald-50 text-emerald-600"
              trend={{ value: '2% from last month', isPositive: true }}
              delay={200}
            />
            <LiveStatCard
              title="Unfilled Shifts"
              value={3}
              icon={<ExclamationTriangleIcon className="w-5 h-5" />}
              iconColor="bg-amber-50 text-amber-600"
              trend={{ value: '5 fewer than last week', isPositive: true }}
              delay={300}
            />
          </div>

          {/* Schedule + Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ScheduleTable />
            </div>
            <div>
              <AlertsPanel />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
