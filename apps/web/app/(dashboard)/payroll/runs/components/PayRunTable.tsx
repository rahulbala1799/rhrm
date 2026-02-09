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
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-12 text-center text-gray-500">
        No pay runs yet. Create one to get started.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Period</th>
            <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Staff</th>
            <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Hours</th>
            <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Gross</th>
            <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
              <td className="px-5 py-3">
                <Link href={`/payroll/runs/${run.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                  {run.name}
                </Link>
              </td>
              <td className="px-5 py-3 text-sm text-gray-600">{run.staff_count}</td>
              <td className="px-5 py-3 text-sm text-right text-gray-600">{Number(run.total_hours).toFixed(2)}</td>
              <td className="px-5 py-3 text-sm text-right font-medium text-gray-900">{format(Number(run.total_gross_pay))}</td>
              <td className="px-5 py-3 text-right">
                <PayRunStatusBadge status={run.status as 'draft' | 'reviewing' | 'approved' | 'finalised'} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
