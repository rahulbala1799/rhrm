import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'

export default function StaffWagesPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <PageHeader
        title="Wages & Pay Rules"
        description="Configure pay rates and wage rules for this staff member"
        action={
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
            Set Pay Rate
          </button>
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Staff', href: '/staff' },
          { label: 'Profile', href: `/staff/${params.id}` },
          { label: 'Wages' },
        ]}
      />

      <EmptyState
        icon={
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        title="No pay rate configured"
        description="Set up hourly rates, salary, or other pay rules for this staff member to enable payroll calculations."
        action={{
          label: 'Configure Pay Rate',
          onClick: () => {},
        }}
      />
    </div>
  )
}

