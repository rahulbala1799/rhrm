'use client'

type Status = 'draft' | 'reviewing' | 'approved' | 'finalised'

const styles: Record<Status, string> = {
  draft: 'bg-gray-100 text-gray-800',
  reviewing: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  finalised: 'bg-green-100 text-green-800',
}

export default function PayRunStatusBadge({ status }: { status: Status }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {label}
    </span>
  )
}
