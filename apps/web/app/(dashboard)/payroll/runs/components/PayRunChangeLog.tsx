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
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Change log</h3>
      </div>
      <div className="p-5">
        <ul className="border-l-2 border-gray-200 pl-4 space-y-3">
          {changes.map((c) => (
            <li key={c.id} className="text-sm">
              <p className="text-gray-400 text-xs">
                {formatDate(c.created_at)} — {who(c)}
              </p>
              <p className="text-gray-700 mt-0.5">
                <span className="font-medium text-gray-900">{c.field_changed}</span>: {c.old_value ?? '—'} → {c.new_value ?? '—'}
                {c.reason && <span className="text-gray-500"> — &ldquo;{c.reason}&rdquo;</span>}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
