import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'

export default function ContractGeneratorPage() {
  return (
    <div>
      <PageHeader
        title="Contract Generator"
        description="Create and manage employee contracts"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'Contract', href: '/compliance/contract' },
          { label: 'Contract Generator' },
        ]}
        action={
          <Link href="/compliance/contract">
            <span className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
              ← Back to Contract
            </span>
          </Link>
        }
      />

      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-8 text-center text-gray-500">
        Contract generator tools will be built here.
      </div>
    </div>
  )
}
