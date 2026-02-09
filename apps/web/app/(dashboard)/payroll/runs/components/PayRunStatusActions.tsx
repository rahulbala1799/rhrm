'use client'

type Status = 'draft' | 'reviewing' | 'approved' | 'finalised'

interface PayRunStatusActionsProps {
  runId: string
  status: Status
  onStatusChange: () => void
}

const nextStatus: Record<Status, Status | null> = {
  draft: 'reviewing',
  reviewing: 'approved',
  approved: 'finalised',
  finalised: null,
}

export default function PayRunStatusActions({ runId, status, onStatusChange }: PayRunStatusActionsProps) {
  const next = nextStatus[status]

  const handleTransition = async () => {
    if (!next) return
    const res = await fetch(`/api/payroll/runs/${runId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    if (res.ok) onStatusChange()
  }

  const handleDelete = async () => {
    if (status !== 'draft') return
    if (!confirm('Delete this draft pay run? This cannot be undone.')) return
    const res = await fetch(`/api/payroll/runs/${runId}`, { method: 'DELETE' })
    if (res.ok) {
      window.location.href = '/payroll/runs'
    }
  }

  return (
    <div className="flex items-center gap-3">
      {next && (
        <button
          type="button"
          onClick={handleTransition}
          className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 shadow-sm transition-colors"
        >
          Mark as {next.charAt(0).toUpperCase() + next.slice(1)} →
        </button>
      )}
      {status === 'draft' && (
        <button
          type="button"
          onClick={handleDelete}
          className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg hover:bg-red-100 transition-colors"
        >
          Delete
        </button>
      )}
    </div>
  )
}
