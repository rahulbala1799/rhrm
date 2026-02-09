'use client'

import { useState } from 'react'
import { useFormatCurrency } from '@/app/(dashboard)/hooks/useFormatCurrency'

interface Line {
  id: string
  employee_number: string
  staff_name: string
  regular_hours: number
  overtime_hours: number
  hourly_rate: number
  adjustments: number
  adjustment_reason: string | null
  gross_pay: number
  status: string
}

interface PayRunLineEditorProps {
  line: Line
  runId: string
  runStatus: string
  onSaved: () => void
  onCancel: () => void
}

export default function PayRunLineEditor({ line, runId, runStatus, onSaved, onCancel }: PayRunLineEditorProps) {
  const { format } = useFormatCurrency()
  const [adjustments, setAdjustments] = useState(String(line.adjustments))
  const [adjustmentReason, setAdjustmentReason] = useState(line.adjustment_reason || '')
  const [excluded, setExcluded] = useState(line.status === 'excluded')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    const adjNum = parseFloat(adjustments) || 0
    if (adjNum !== 0 && !adjustmentReason.trim() && runStatus === 'approved') {
      setError('Reason is required for adjustments on an approved run')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/payroll/runs/${runId}/lines/${line.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adjustments: adjNum,
          adjustment_reason: adjustmentReason.trim() || null,
          status: excluded ? 'excluded' : 'included',
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update')
      }
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
      <p className="font-medium text-gray-900 mb-3">
        #{line.employee_number} {line.staff_name}
      </p>
      <p className="text-sm text-gray-600 mb-3">
        Regular: {Number(line.regular_hours).toFixed(2)}h | OT: {Number(line.overtime_hours).toFixed(2)}h | Rate: {format(line.hourly_rate)}
      </p>
      {error && (
        <p className="text-sm text-red-600 mb-2">{error}</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment (£)</label>
          <input
            type="number"
            step="0.01"
            value={adjustments}
            onChange={(e) => setAdjustments(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
          <input
            type="text"
            value={adjustmentReason}
            onChange={(e) => setAdjustmentReason(e.target.value)}
            placeholder="e.g. Missed Monday shift"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 mb-3">
        <input
          type="checkbox"
          checked={excluded}
          onChange={(e) => setExcluded(e.target.checked)}
          className="rounded border-gray-300"
        />
        <span className="text-sm text-gray-700">Exclude from this pay run</span>
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
