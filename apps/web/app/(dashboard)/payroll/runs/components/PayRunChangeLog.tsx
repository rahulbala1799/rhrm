'use client'

interface Change {
  id: string
  field_changed: string
  old_value: string | null
  new_value: string | null
  reason: string | null
  created_at: string
  changed_by_profile?: { full_name?: string; email?: string } | null
}

export default function PayRunChangeLog({ changes }: { changes: Change[] }) {
  if (changes.length === 0) {
    return (
      <div className="text-sm text-gray-500 mt-4">
        No changes recorded yet.
      </div>
    )
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const who = (c: Change) => c.changed_by_profile?.full_name || c.changed_by_profile?.email || 'Someone'

  return (
    <div className="mt-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Change log</h3>
      <ul className="border-l-2 border-gray-200 pl-4 space-y-3">
        {changes.map((c) => (
          <li key={c.id} className="text-sm">
            <p className="text-gray-500">
              {formatDate(c.created_at)} — {who(c)}
            </p>
            <p className="text-gray-800">
              {c.field_changed}: {c.old_value ?? '—'} → {c.new_value ?? '—'}
              {c.reason && <span className="text-gray-600"> — "{c.reason}"</span>}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
