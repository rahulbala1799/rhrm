'use client'

import { useState, useEffect } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import PayRunDetail from '../components/PayRunDetail'

export default function PayRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null)
  useEffect(() => {
    params.then((p) => setId(p.id))
  }, [params])

  if (!id) return null

  return (
    <div>
      <PageHeader
        title="Pay run"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Payroll', href: '/payroll' },
          { label: 'Pay Runs', href: '/payroll/runs' },
          { label: 'Detail' },
        ]}
      />
      <PayRunDetail runId={id} />
    </div>
  )
}
