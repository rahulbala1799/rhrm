'use client'

import { useParams } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import PayRunDetail from '../components/PayRunDetail'

export default function PayRunDetailPage() {
  const params = useParams()
  const id = params?.id as string | undefined

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
