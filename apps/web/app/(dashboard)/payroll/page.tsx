import PageHeader from '@/components/ui/PageHeader'
import StatCard from '@/components/ui/StatCard'
import SectionCard from '@/components/ui/SectionCard'

export default function PayrollPage() {
  return (
    <div>
      <PageHeader
        title="Payroll"
        description="Manage pay runs, exports, and wage rates"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="This Month"
          value="£12,450"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Last Pay Run"
          value="Dec 15, 2024"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          title="Staff Paid"
          value={12}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionCard
            title="Recent Pay Runs"
            action={
              <a href="/payroll/runs" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View All →
              </a>
            }
          >
            <div className="text-center py-8 text-gray-500 text-sm">
              No pay runs yet. Create your first pay run to get started.
            </div>
          </SectionCard>
        </div>

        <div>
          <SectionCard title="Quick Actions">
            <div className="space-y-2">
              <a
                href="/payroll/runs"
                className="block px-4 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
              >
                Create Pay Run
              </a>
              <a
                href="/payroll/exports"
                className="block px-4 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
              >
                Export Data
              </a>
              <a
                href="/payroll/rates"
                className="block px-4 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
              >
                Manage Pay Rates
              </a>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}


