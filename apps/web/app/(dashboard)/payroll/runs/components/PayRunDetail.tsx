'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import PayRunStatusBadge from './PayRunStatusBadge'
import PayRunStatusActions from './PayRunStatusActions'
import PayRunLineEditor from './PayRunLineEditor'
import PayRunChangeLog from './PayRunChangeLog'
import { useFormatCurrency } from '@/app/(dashboard)/hooks/useFormatCurrency'

interface Line {
  id: string
  employee_number: string
  staff_name: string
  regular_hours: number
  overtime_hours: number
  hourly_rate: number
  overtime_rate: number
  adjustments: number
  adjustment_reason: string | null
  gross_pay: number
  status: string
}

interface Run {
  id: string
  name: string
  status: string
  pay_period_start?: string
  pay_period_end?: string
  total_hours: number
  total_gross_pay: number
  staff_count: number
  notes: string | null
  lines?: Line[]
}

interface PayRunDetailProps {
  runId: string
}

export default function PayRunDetail({ runId }: PayRunDetailProps) {
  const { format } = useFormatCurrency()
  const [run, setRun] = useState<Run | null>(null)
  const [changes, setChanges] = useState<any[]>([])
  const [editingLineId, setEditingLineId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchRun = async () => {
    if (!runId) return
    setLoading(true)
    setFetchError(null)
    try {
      const [runRes, changesRes] = await Promise.all([
        fetch(`/api/payroll/runs/${runId}`),
        fetch(`/api/payroll/runs/${runId}/changes`),
      ])
      if (runRes.ok) {
        const data = await runRes.json()
        setRun({
          ...data,
          lines: Array.isArray(data.lines) ? data.lines : [],
        })
      } else {
        setRun(null)
        const errBody = await runRes.json().catch(() => ({}))
        setFetchError(errBody.error || `Failed to load (${runRes.status})`)
      }
      if (changesRes.ok) {
        const data = await changesRes.json()
        setChanges(data.changes || [])
      }
    } catch (e) {
      console.error(e)
      setRun(null)
      setFetchError('Network or server error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRun()
  }, [runId])

  if (loading && !run) {
    return (
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-12 text-center text-gray-500">
        Loading…
      </div>
    )
  }

  if (!run) {
    return (
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-12 text-center">
        <p className="text-gray-700 font-medium">Pay run not found</p>
        {fetchError && <p className="mt-1 text-sm text-red-600">{fetchError}</p>}
        <Link href="/payroll/runs" className="mt-4 inline-block text-sm text-indigo-600 hover:text-indigo-700 transition-colors">
          ← Back to Pay Runs
        </Link>
      </div>
    )
  }

  const lines = run.lines || []
  const editingLine = editingLineId ? lines.find((l) => l.id === editingLineId) : null
  const canEdit = run.status !== 'finalised'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/payroll/runs" className="text-sm text-indigo-600 hover:text-indigo-700 transition-colors">
            ← Pay Runs
          </Link>
          <span className="text-gray-300">/</span>
          <span className="font-medium text-gray-900">{run.name}</span>
          <PayRunStatusBadge status={run.status as any} />
        </div>
        <div className="flex items-center gap-3">
          <PayRunStatusActions runId={runId} status={run.status as any} onStatusChange={fetchRun} />
          <button
            type="button"
            onClick={async () => {
              const res = await fetch(`/api/payroll/runs/${runId}/export`, { method: 'POST' })
              if (!res.ok) return
              const blob = await res.blob()
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = run.pay_period_start && run.pay_period_end ? `pay-run-${run.pay_period_start}-to-${run.pay_period_end}.csv` : 'pay-run.csv'
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white ring-1 ring-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-5">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Staff</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{run.staff_count}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-5">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total hours</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{Number(run.total_hours).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-5">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Gross pay</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{format(Number(run.total_gross_pay))}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Line items</h2>
        {editingLine && canEdit && (
          <PayRunLineEditor
            line={editingLine}
            runId={runId}
            runStatus={run.status}
            onSaved={() => { setEditingLineId(null); fetchRun() }}
            onCancel={() => setEditingLineId(null)}
          />
        )}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Employee</th>
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Reg hrs</th>
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">OT hrs</th>
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Rate</th>
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Adj</th>
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Gross</th>
                {canEdit && <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider" />}
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} className={`border-b border-gray-50 last:border-0 transition-colors ${line.status === 'excluded' ? 'bg-gray-50/50 text-gray-400' : 'hover:bg-gray-50/50'}`}>
                  <td className="px-5 py-3">
                    <span className="text-sm font-medium text-gray-900">#{line.employee_number} {line.staff_name}</span>
                    {line.adjustment_reason && (
                      <p className="text-xs text-gray-500 mt-0.5">adj: {line.adjustment_reason}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-sm text-gray-600">{Number(line.regular_hours).toFixed(2)}</td>
                  <td className="px-5 py-3 text-right text-sm text-gray-600">{Number(line.overtime_hours).toFixed(2)}</td>
                  <td className="px-5 py-3 text-right text-sm text-gray-600">{format(line.hourly_rate)}</td>
                  <td className="px-5 py-3 text-right text-sm text-gray-600">
                    {Number(line.adjustments) !== 0 ? (Number(line.adjustments) > 0 ? '+' : '') + format(line.adjustments) : '—'}
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-medium text-gray-900">{format(line.gross_pay)}</td>
                  {canEdit && (
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setEditingLineId(editingLineId === line.id ? null : line.id)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        {editingLineId === line.id ? 'Cancel' : 'Edit'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PayRunChangeLog changes={changes} />
    </div>
  )
}
