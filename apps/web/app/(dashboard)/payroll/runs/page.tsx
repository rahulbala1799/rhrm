import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'

export default function PayRunsPage() {
  return (
    <div>
      <PageHeader
        title="Pay Runs"
        description="Create and manage payroll runs"
        action={
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
            Create Pay Run
          </button>
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Payroll', href: '/payroll' },
          { label: 'Pay Runs' },
        ]}
      />

      <EmptyState
        icon={
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        title="No pay runs yet"
        description="Create your first pay run to process payroll for your staff. Pay runs calculate wages based on shifts and pay rates."
        action={{
          label: 'Create Pay Run',
          onClick: () => {},
        }}
      />
    </div>
  )
}

