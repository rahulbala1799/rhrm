import PageHeader from '@/components/ui/PageHeader'
import Link from 'next/link'

export default function StaffProfilePage({ params }: { params: { id: string } }) {
  return (
    <div>
      <PageHeader
        title="Staff Profile"
        description="View and manage staff member details"
        action={
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
            Edit Profile
          </button>
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Staff', href: '/staff' },
          { label: 'Profile' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Name</label>
                <p className="text-gray-900 mt-1">John Doe</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className="text-gray-900 mt-1">john@example.com</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Phone</label>
                <p className="text-gray-900 mt-1">+1 234 567 8900</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Details</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Role</label>
                <p className="text-gray-900 mt-1">Sales Associate</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Location</label>
                <p className="text-gray-900 mt-1">Unit 14 Ashbourne</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Start Date</label>
                <p className="text-gray-900 mt-1">January 15, 2024</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
            <div className="space-y-2">
              <Link
                href={`/staff/${params.id}/documents`}
                className="block px-4 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
              >
                Documents
              </Link>
              <Link
                href={`/staff/${params.id}/wages`}
                className="block px-4 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
              >
                Wages & Pay Rules
              </Link>
              <Link
                href={`/staff/${params.id}/availability`}
                className="block px-4 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
              >
                Availability
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

