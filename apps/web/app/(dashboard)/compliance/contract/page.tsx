import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import { DocumentTextIcon } from '@heroicons/react/24/outline'

export default function ContractPage() {
  return (
    <div>
      <PageHeader
        title="Contract"
        description="Create and manage staff contracts and employee handbook"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'Contract' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/compliance/contract/generator">
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-5 hover:shadow-md hover:ring-gray-950/10 transition-all duration-200 cursor-pointer">
            <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center mb-4 text-indigo-600">
              <DocumentTextIcon className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Contract Generator</h3>
            <p className="text-sm text-gray-600">Create and manage employee contracts</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
