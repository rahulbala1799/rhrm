'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  UsersIcon,
  CalendarDaysIcon,
  ClockIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  ChevronRightIcon,
  HomeIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'

function MiniSidebar() {
  const sections = [
    { icon: HomeIcon, label: 'Dashboard', active: false },
    { icon: CalendarDaysIcon, label: 'Schedule', active: true },
    { icon: UsersIcon, label: 'People', active: false },
    { icon: CurrencyDollarIcon, label: 'Payroll', active: false },
    { icon: ShieldCheckIcon, label: 'Compliance', active: false },
    { icon: Cog6ToothIcon, label: 'Settings', active: false },
  ]

  return (
    <div className="w-48 bg-gray-950 text-gray-300 flex flex-col shrink-0 rounded-l-xl">
      <div className="h-11 flex items-center px-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-indigo-500 rounded-md flex items-center justify-center">
            <UsersIcon className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-xs text-white tracking-tight">HR Staff</span>
        </div>
      </div>
      <div className="flex-1 py-2 px-2 space-y-0.5">
        {sections.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium ${
                item.active
                  ? 'bg-indigo-500/15 text-indigo-300'
                  : 'text-gray-500'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{item.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MiniTopBar() {
  return (
    <div className="h-11 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 px-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-32 h-6 bg-gray-100 rounded-md" />
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-gray-100 rounded-full" />
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-indigo-100 rounded-full" />
          <span className="text-[10px] font-medium text-gray-600">Printnpack</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
            <span className="text-[8px] font-bold text-white">JD</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniScheduleGrid() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const staff = [
    { name: 'Sarah K.', initials: 'SK', color: 'bg-violet-100 text-violet-700' },
    { name: 'James L.', initials: 'JL', color: 'bg-blue-100 text-blue-700' },
    { name: 'Maria G.', initials: 'MG', color: 'bg-emerald-100 text-emerald-700' },
    { name: 'Tom W.', initials: 'TW', color: 'bg-amber-100 text-amber-700' },
  ]

  const shifts: Record<string, Record<string, { time: string; status: string; role?: string }>> = {
    'Sarah K.': {
      Mon: { time: '9-5', status: 'confirmed', role: 'Barista' },
      Tue: { time: '9-5', status: 'confirmed', role: 'Barista' },
      Wed: { time: '12-8', status: 'published' },
      Fri: { time: '9-5', status: 'confirmed', role: 'Barista' },
      Sat: { time: '10-6', status: 'draft' },
    },
    'James L.': {
      Mon: { time: '12-8', status: 'published' },
      Wed: { time: '9-5', status: 'confirmed', role: 'Cashier' },
      Thu: { time: '9-5', status: 'confirmed', role: 'Cashier' },
      Fri: { time: '12-8', status: 'published' },
    },
    'Maria G.': {
      Tue: { time: '6-2', status: 'confirmed', role: 'Supervisor' },
      Wed: { time: '6-2', status: 'confirmed', role: 'Supervisor' },
      Thu: { time: '12-8', status: 'draft' },
      Sat: { time: '9-5', status: 'published' },
      Sun: { time: '9-3', status: 'draft' },
    },
    'Tom W.': {
      Mon: { time: '9-5', status: 'confirmed', role: 'Warehouse' },
      Tue: { time: '9-5', status: 'published' },
      Thu: { time: '6-2', status: 'confirmed', role: 'Warehouse' },
      Fri: { time: '9-5', status: 'confirmed', role: 'Warehouse' },
      Sun: { time: '10-4', status: 'draft' },
    },
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 border-gray-200 text-gray-600',
    published: 'bg-blue-50 border-blue-200 text-blue-700',
    confirmed: 'bg-green-50 border-green-200 text-green-700',
  }

  return (
    <div className="flex-1 bg-gray-50 overflow-hidden">
      {/* Mini header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/60 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChevronRightIcon className="w-3 h-3 text-gray-400 rotate-180" />
          <ChevronRightIcon className="w-3 h-3 text-gray-400" />
          <CalendarDaysIcon className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-[10px] font-semibold text-gray-900">Feb 10 - Feb 16, 2026</span>
          <span className="text-[9px] bg-white ring-1 ring-gray-300 text-gray-600 rounded px-1.5 py-0.5 font-medium">Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] bg-gray-900 text-white rounded px-2 py-1 font-medium">Create Shift</span>
        </div>
      </div>

      {/* Grid */}
      <div className="px-2 pt-1">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-20 text-left text-[9px] font-medium text-gray-500 pb-1 px-1">Staff</th>
              {days.map((day) => (
                <th key={day} className="text-center text-[9px] font-medium text-gray-500 pb-1 px-0.5">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.name} className="border-t border-gray-200/60">
                <td className="py-1 px-1">
                  <div className="flex items-center gap-1">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[6px] font-bold ${member.color}`}>
                      {member.initials}
                    </div>
                    <span className="text-[9px] font-medium text-gray-700 truncate">{member.name}</span>
                  </div>
                </td>
                {days.map((day) => {
                  const shift = shifts[member.name]?.[day]
                  return (
                    <td key={day} className="py-1 px-0.5">
                      {shift ? (
                        <div className={`rounded border p-0.5 text-center ${statusColors[shift.status]}`}>
                          <div className="text-[7px] font-semibold">{shift.time}</div>
                          {shift.role && (
                            <div className="text-[6px] opacity-75">{shift.role}</div>
                          )}
                        </div>
                      ) : (
                        <div className="h-5" />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Hero() {
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 8
      el.style.transform = `perspective(1200px) rotateY(${x}deg) rotateX(${-y}deg)`
    }
    const handleLeave = () => {
      el.style.transform = 'perspective(1200px) rotateY(0deg) rotateX(0deg)'
    }
    el.addEventListener('mousemove', handleMove)
    el.addEventListener('mouseleave', handleLeave)
    return () => {
      el.removeEventListener('mousemove', handleMove)
      el.removeEventListener('mouseleave', handleLeave)
    }
  }, [])

  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 via-white to-white" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-indigo-100/40 via-purple-50/30 to-transparent rounded-full blur-3xl" />
      <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-blue-100/30 to-transparent rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 ring-1 ring-indigo-100">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-indigo-700">Built for retail &amp; trades agencies</span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-center text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-[1.1] max-w-4xl mx-auto">
          Staff scheduling that
          <span className="relative inline-block ml-3">
            <span className="relative z-10 text-indigo-600">actually works</span>
            <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 8.5C50 2.5 150 2.5 198 8.5" stroke="#818CF8" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </span>
        </h1>

        {/* Subheadline */}
        <p className="mt-6 text-center text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Manage shifts, track compliance, run payroll, and keep your team in sync.
          One platform built specifically for multi-location teams.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-semibold text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/10 hover:shadow-xl hover:shadow-gray-900/20"
          >
            Start Free Trial
            <ChevronRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <button
            onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-semibold text-gray-700 bg-white rounded-xl ring-1 ring-gray-200 hover:ring-gray-300 hover:bg-gray-50 transition-all shadow-sm"
          >
            <CalendarDaysIcon className="w-4 h-4 text-indigo-500" />
            Try the Scheduler
          </button>
        </div>

        {/* App Preview */}
        <div className="mt-16 sm:mt-20 max-w-4xl mx-auto">
          <div
            ref={previewRef}
            className="rounded-xl border border-gray-200/80 bg-white shadow-2xl shadow-gray-900/10 overflow-hidden transition-transform duration-200 ease-out"
          >
            <div className="flex h-[320px] sm:h-[380px]">
              <div className="hidden sm:flex">
                <MiniSidebar />
              </div>
              <div className="flex-1 flex flex-col min-w-0">
                <MiniTopBar />
                <MiniScheduleGrid />
              </div>
            </div>
          </div>
          {/* Glow effect under the preview */}
          <div className="mt-[-20px] mx-auto w-3/4 h-20 bg-gradient-to-b from-indigo-500/5 to-transparent rounded-full blur-2xl" />
        </div>
      </div>
    </section>
  )
}
