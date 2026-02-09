'use client'

import { useState, useEffect } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import PayRunTable from './components/PayRunTable'
import CreatePayRunModal from './components/CreatePayRunModal'

interface Run {
  id: string
  name: string
  pay_period_start: string
  pay_period_end: string
  staff_count: number
  total_hours: number
  total_gross_pay: number
  status: string
}

export default function PayRunsPage() {
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [counts, setCounts] = useState<{ total: number; draft: number; reviewing: number; approved: number; finalised: number }>({
    total: 0,
    draft: 0,
    reviewing: 0,
    approved: 0,
    finalised: 0,
  })

  const fetchRuns = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      params.set('pageSize', '50')
      const res = await fetch(`/api/payroll/runs?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setRuns(data.runs || [])
      if (data.runs) {
        const draft = data.runs.filter((r: Run) => r.status === 'draft').length
        const reviewing = data.runs.filter((r: Run) => r.status === 'reviewing').length
        const approved = data.runs.filter((r: Run) => r.status === 'approved').length
        const finalised = data.runs.filter((r: Run) => r.status === 'finalised').length
        setCounts({
          total: data.runs.length,
          draft,
          reviewing,
          approved,
          finalised,
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRuns()
  }, [statusFilter])

  return (
    <div>
      <PageHeader
        title="Pay Runs"
        description="Manage and process payroll for your team"
        action={
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            + Create Run
          </button>
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Payroll', href: '/payroll' },
          { label: 'Pay Runs' },
        ]}
      />

      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Total</p>
          <p className="text-2xl font-semibold text-gray-900">{counts.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Draft</p>
          <p className="text-2xl font-semibold text-gray-900">{counts.draft}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Reviewing</p>
          <p className="text-2xl font-semibold text-gray-900">{counts.reviewing}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Finalised</p>
          <p className="text-2xl font-semibold text-gray-900">{counts.finalised}</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="reviewing">Reviewing</option>
          <option value="approved">Approved</option>
          <option value="finalised">Finalised</option>
        </select>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500">
          Loading…
        </div>
      ) : (
        <PayRunTable runs={runs} />
      )}

      <CreatePayRunModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchRuns}
      />
    </div>
  )
}
