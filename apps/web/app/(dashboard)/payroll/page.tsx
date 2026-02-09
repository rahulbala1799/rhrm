'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import PageHeader from '@/components/ui/PageHeader'
import StatCard from '@/components/ui/StatCard'
import SectionCard from '@/components/ui/SectionCard'
import { useFormatCurrency } from '@/app/(dashboard)/hooks/useFormatCurrency'
import PayRunStatusBadge from './runs/components/PayRunStatusBadge'

interface PayRun {
  id: string
  name: string
  status: string
  pay_period_start: string
  pay_period_end: string
  total_hours: number
  total_gross_pay: number
  staff_count: number
  created_at: string
}

export default function PayrollPage() {
  const { format: formatCurrency } = useFormatCurrency()
  const [runs, setRuns] = useState<PayRun[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/payroll/runs?pageSize=50')
      .then((res) => res.ok ? res.json() : { runs: [] })
      .then((data) => {
        if (!cancelled) setRuns(data.runs || [])
      })
      .catch(() => { if (!cancelled) setRuns([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const now = new Date()
  const thisYear = now.getFullYear()
  const thisMonth = now.getMonth()

  const thisMonthRuns = useMemo(() => {
    return runs.filter((r) => {
      const end = new Date(r.pay_period_end + 'T00:00:00')
      return end.getFullYear() === thisYear && end.getMonth() === thisMonth
    })
  }, [runs, thisYear, thisMonth])

  const thisMonthTotal = useMemo(() => {
    return thisMonthRuns.reduce((sum, r) => sum + Number(r.total_gross_pay || 0), 0)
  }, [thisMonthRuns])

  const lastRun = runs[0] ?? null
  const lastPayRunDate = lastRun ? format(new Date(lastRun.pay_period_end + 'T00:00:00'), 'MMM d, yyyy') : null
  const lastRunStaffCount = lastRun?.staff_count ?? 0

  const recentRuns = runs.slice(0, 8)

  return (
    <div>
      <PageHeader
        title="Payroll"
        description="Pay runs are built from shifts in the Week Planner for the selected date range."
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-28" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard
            title="This month"
            value={formatCurrency(thisMonthTotal)}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Last pay run"
            value={lastPayRunDate ?? '—'}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />
          <StatCard
            title="Staff in last run"
            value={lastRunStaffCount}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionCard
            title="Recent pay runs"
            action={
              <Link href="/payroll/runs" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                View all →
              </Link>
            }
          >
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : recentRuns.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-sm">
                No pay runs yet. Create a run from shifts in the Week Planner for a date range.
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {recentRuns.map((run) => (
                  <li key={run.id}>
                    <Link
                      href={`/payroll/runs/${run.id}`}
                      className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{run.name}</p>
                        <p className="text-sm text-gray-500">
                          {Number(run.total_hours).toFixed(1)}h · {formatCurrency(Number(run.total_gross_pay))} · {run.staff_count} staff
                        </p>
                      </div>
                      <PayRunStatusBadge status={run.status as any} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <div>
          <SectionCard title="Actions">
            <div className="space-y-2">
              <Link
                href="/payroll/runs"
                className="flex items-center justify-between w-full px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 text-sm font-medium text-gray-700 transition-colors"
              >
                Create pay run
                <span className="text-gray-400">→</span>
              </Link>
              <Link
                href="/payroll/exports"
                className="flex items-center justify-between w-full px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 text-sm font-medium text-gray-700 transition-colors"
              >
                Export data
                <span className="text-gray-400">→</span>
              </Link>
              <Link
                href="/payroll/rates"
                className="flex items-center justify-between w-full px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 text-sm font-medium text-gray-700 transition-colors"
              >
                Manage pay rates
                <span className="text-gray-400">→</span>
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
