import PageHeader from '@/components/ui/PageHeader'
import StatCard from '@/components/ui/StatCard'
import SectionCard from '@/components/ui/SectionCard'

export default function CompliancePage() {
  return (
    <div>
      <PageHeader
        title="Compliance"
        description="Track right to work, certifications, and expiring documents"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Valid Documents"
          value={18}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Expiring Soon"
          value={2}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Missing Documents"
          value={3}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionCard title="Recent Activity">
            <div className="text-center py-8 text-gray-500 text-sm">
              No recent compliance activity
            </div>
          </SectionCard>
        </div>

        <div>
          <SectionCard title="Quick Links">
            <div className="space-y-2">
              <a
                href="/compliance/right-to-work"
                className="block px-4 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
              >
                Right to Work
              </a>
              <a
                href="/compliance/certifications"
                className="block px-4 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
              >
                Certifications
              </a>
              <a
                href="/compliance/expiries"
                className="block px-4 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
              >
                Expiry Tracker
              </a>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}


