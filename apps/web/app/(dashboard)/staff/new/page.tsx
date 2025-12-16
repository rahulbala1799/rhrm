import PageHeader from '@/components/ui/PageHeader'

export default function NewStaffPage() {
  return (
    <div>
      <PageHeader
        title="Add Staff Member"
        description="Add a new team member to your organization"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Staff', href: '/staff' },
          { label: 'Add Staff' },
        ]}
      />

      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="John"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option>Select a role</option>
              <option>Manager</option>
              <option>Sales Associate</option>
              <option>Cashier</option>
            </select>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Add Staff Member
            </button>
            <a
              href="/staff"
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
            >
              Cancel
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}

