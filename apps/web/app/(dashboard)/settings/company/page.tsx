import PageHeader from '@/components/ui/PageHeader'

export default function CompanySettingsPage() {
  return (
    <div>
      <PageHeader
        title="Company Settings"
        description="Manage your company information and preferences"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings/company' },
          { label: 'Company' },
        ]}
      />

      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name
            </label>
            <input
              type="text"
              defaultValue="Printnpack"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business URL
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">yourcompany.com/</span>
              <input
                type="text"
                defaultValue="printnpack"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Type
            </label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option>Retail</option>
              <option>Hospitality</option>
              <option>Construction/Trades</option>
              <option>Agency/Staffing</option>
              <option>Healthcare/Care</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option>IE</option>
              <option>GB</option>
              <option>US</option>
            </select>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

