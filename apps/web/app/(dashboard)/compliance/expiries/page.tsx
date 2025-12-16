import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'

export default function ExpiriesPage() {
  return (
    <div>
      <PageHeader
        title="Expiry Tracker"
        description="Monitor documents and certifications that are expiring soon"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'Expiries' },
        ]}
      />

      <EmptyState
        icon={
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        title="No expiring documents"
        description="All documents and certifications are up to date. Documents expiring within 30 days will appear here."
      />
    </div>
  )
}

