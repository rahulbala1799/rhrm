'use client'

import { useState, useEffect } from 'react'
import { addDays } from 'date-fns'
import { getCurrentPayPeriod } from '@/lib/pay-period/utils'
import type { PayPeriodConfig } from '@/lib/pay-period/utils'
import { useFormatCurrency } from '@/app/(dashboard)/hooks/useFormatCurrency'

interface CreatePayRunModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

export default function CreatePayRunModal({ isOpen, onClose, onCreated }: CreatePayRunModalProps) {
  const { format } = useFormatCurrency()
  const [suggestedStart, setSuggestedStart] = useState('')
  const [suggestedEnd, setSuggestedEnd] = useState('')
  const [payPeriodStart, setPayPeriodStart] = useState('')
  const [payPeriodEnd, setPayPeriodEnd] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [preview, setPreview] = useState<{
    staff_count: number
    total_hours: number
    estimated_gross: number
    unapproved_count: number
  } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    const load = async () => {
      try {
        const [configRes, lastRunRes] = await Promise.all([
          fetch('/api/settings/pay-period'),
          fetch('/api/payroll/runs?pageSize=1'),
        ])
        const configData = configRes.ok ? await configRes.json() : { config: { type: 'weekly', week_starts_on: 'monday' } }
        const config: PayPeriodConfig = configData.config
        const timezone = 'UTC'

        let nextStart: Date
        let nextEnd: Date

        if (lastRunRes.ok) {
          const { runs } = await lastRunRes.json()
          if (runs?.length > 0) {
            const last = runs[0]
            const lastEnd = new Date(last.pay_period_end + 'T00:00:00')
            nextStart = addDays(lastEnd, 1)
            nextEnd = addDays(nextStart, 6)
          } else {
            const period = getCurrentPayPeriod(new Date(), config, timezone)
            nextStart = period.start
            nextEnd = addDays(period.start, 6)
          }
        } else {
          const period = getCurrentPayPeriod(new Date(), config, timezone)
          nextStart = period.start
          nextEnd = addDays(period.start, 6)
        }

        const startStr = nextStart.toISOString().split('T')[0]
        const endStr = nextEnd.toISOString().split('T')[0]
        setSuggestedStart(startStr)
        setSuggestedEnd(endStr)
        if (!useCustom) {
          setPayPeriodStart(startStr)
          setPayPeriodEnd(endStr)
        }
      } catch (e) {
        setError('Failed to load suggested period')
      }
    }
    load()
  }, [isOpen, useCustom])

  useEffect(() => {
    if (!isOpen || !payPeriodStart || !payPeriodEnd) return
    setLoadingPreview(true)
    fetch('/api/payroll/runs/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pay_period_start: payPeriodStart, pay_period_end: payPeriodEnd }),
    })
      .then((r) => r.json())
      .then((data) => {
        setPreview(data)
      })
      .catch(() => setPreview(null))
      .finally(() => setLoadingPreview(false))
  }, [isOpen, payPeriodStart, payPeriodEnd])

  const handleCreate = async () => {
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/payroll/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pay_period_start: payPeriodStart, pay_period_end: payPeriodEnd }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create pay run')
      }
      onCreated()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create pay run')
    } finally {
      setCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Create Pay Run</h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pay Period</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={!useCustom}
                    onChange={() => setUseCustom(false)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{suggestedStart && suggestedEnd ? `${suggestedStart} – ${suggestedEnd} (suggested)` : 'Loading…'}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={useCustom}
                    onChange={() => setUseCustom(true)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Custom date range</span>
                </label>
              </div>
            </div>

            {useCustom && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                  <input
                    type="date"
                    value={payPeriodStart}
                    onChange={(e) => setPayPeriodStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                  <input
                    type="date"
                    value={payPeriodEnd}
                    onChange={(e) => setPayPeriodEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            )}

            {!useCustom && suggestedStart && (
              <input type="hidden" value={payPeriodStart} readOnly />
            )}
            {!useCustom && suggestedEnd && (
              <input type="hidden" value={payPeriodEnd} readOnly />
            )}

            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Preview</p>
              {loadingPreview ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : preview ? (
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>{preview.staff_count} staff with approved timesheets</li>
                  <li>{Number(preview.total_hours).toFixed(2)} total hours</li>
                  <li>{format(preview.estimated_gross)} estimated gross</li>
                  {preview.unapproved_count > 0 && (
                    <li className="text-amber-700 mt-2">
                      ⚠ {preview.unapproved_count} staff have unapproved timesheets in this period (will be excluded)
                    </li>
                  )}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No preview</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !payPeriodStart || !payPeriodEnd}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating…' : 'Create Run'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
