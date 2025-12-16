import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'

export default function PayRatesPage() {
  return (
    <div>
      <PageHeader
        title="Pay Rates & Wage Rules"
        description="Configure hourly rates, salaries, and wage rules"
        action={
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
            Add Pay Rate
          </button>
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Payroll', href: '/payroll' },
          { label: 'Pay Rates' },
        ]}
      />

      <EmptyState
        icon={
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        }
        title="No pay rates configured"
        description="Set up pay rates for different roles and positions. These rates will be used to calculate payroll."
        action={{
          label: 'Add First Pay Rate',
          onClick: () => {},
        }}
      />
    </div>
  )
}

