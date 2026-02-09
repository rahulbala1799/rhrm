'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { CurrencyDollarIcon, CalendarIcon, UsersIcon } from '@heroicons/react/24/outline'
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
            <div key={i} className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-5 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-100 rounded w-28" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard
            title="This month"
            value={formatCurrency(thisMonthTotal)}
            icon={<CurrencyDollarIcon className="w-5 h-5" />}
          />
          <StatCard
            title="Last pay run"
            value={lastPayRunDate ?? '—'}
            icon={<CalendarIcon className="w-5 h-5" />}
          />
          <StatCard
            title="Staff in last run"
            value={lastRunStaffCount}
            icon={<UsersIcon className="w-5 h-5" />}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionCard
            title="Recent pay runs"
            action={
              <Link href="/payroll/runs" className="text-[13px] font-medium text-indigo-600 hover:text-indigo-700">
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
              <div className="py-8 text-center text-gray-400 text-sm">
                No pay runs yet. Create a run from shifts in the Week Planner for a date range.
              </div>
            ) : (
              <ul className="space-y-1">
                {recentRuns.map((run) => (
                  <li key={run.id}>
                    <Link
                      href={`/payroll/runs/${run.id}`}
                      className="flex items-center justify-between hover:bg-gray-50 rounded-lg px-3 py-2.5 transition-colors"
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
                className="flex items-center justify-between w-full px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
              >
                Create pay run
                <span className="text-gray-300">→</span>
              </Link>
              <Link
                href="/payroll/exports"
                className="flex items-center justify-between w-full px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
              >
                Export data
                <span className="text-gray-300">→</span>
              </Link>
              <Link
                href="/payroll/rates"
                className="flex items-center justify-between w-full px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
              >
                Manage pay rates
                <span className="text-gray-300">→</span>
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
