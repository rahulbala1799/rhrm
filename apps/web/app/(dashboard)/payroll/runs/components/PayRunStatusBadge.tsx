'use client'

type Status = 'draft' | 'reviewing' | 'approved' | 'finalised'

const styles: Record<Status, string> = {
  draft: 'bg-gray-50 text-gray-700 ring-1 ring-gray-200',
  reviewing: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  approved: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  finalised: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
}

export default function PayRunStatusBadge({ status }: { status: Status }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${styles[status]}`}>
      {label}
    </span>
  )
}
