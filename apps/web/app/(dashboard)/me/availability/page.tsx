import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'

export default function MyAvailabilityPage() {
  return (
    <div>
      <PageHeader
        title="My Availability"
        description="Set your preferred working hours and availability"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'My Profile', href: '/me/profile' },
          { label: 'Availability' },
        ]}
      />

      <EmptyState
        icon={
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        }
        title="Availability not set"
        description="Set your preferred working hours and days to help with shift scheduling."
      />
    </div>
  )
}

