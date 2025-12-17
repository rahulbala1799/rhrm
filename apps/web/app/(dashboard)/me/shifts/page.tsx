import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'

export default function MyShiftsPage() {
  return (
    <div>
      <PageHeader
        title="My Shifts"
        description="View your upcoming and past shifts"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'My Profile', href: '/me/profile' },
          { label: 'My Shifts' },
        ]}
      />

      <EmptyState
        icon={
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        title="No shifts scheduled"
        description="Your upcoming shifts will appear here once they're assigned."
      />
    </div>
  )
}


