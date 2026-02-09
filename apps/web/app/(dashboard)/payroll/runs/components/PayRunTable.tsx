'use client'

import Link from 'next/link'
import PayRunStatusBadge from './PayRunStatusBadge'
import { useFormatCurrency } from '@/app/(dashboard)/hooks/useFormatCurrency'

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

export default function PayRunTable({ runs }: { runs: Run[] }) {
  const { format } = useFormatCurrency()

  if (runs.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500">
        No pay runs yet. Create one to get started.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Period</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Staff</th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Hours</th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Gross</th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {runs.map((run) => (
            <tr key={run.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <Link href={`/payroll/runs/${run.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                  {run.name}
                </Link>
              </td>
              <td className="px-6 py-4 text-sm text-gray-700">{run.staff_count}</td>
              <td className="px-6 py-4 text-sm text-right text-gray-700">{Number(run.total_hours).toFixed(2)}</td>
              <td className="px-6 py-4 text-sm text-right text-gray-700">{format(Number(run.total_gross_pay))}</td>
              <td className="px-6 py-4 text-right">
                <PayRunStatusBadge status={run.status as 'draft' | 'reviewing' | 'approved' | 'finalised'} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
