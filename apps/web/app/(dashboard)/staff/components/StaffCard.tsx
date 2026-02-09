'use client'

import Link from 'next/link'
import { MapPinIcon, BriefcaseIcon } from '@heroicons/react/24/outline'

interface Staff {
  id: string
  employee_number: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  employment_type: string | null
  status: string
  locations: {
    id: string
    name: string
  } | null
}

interface StaffCardProps {
  staff: Staff
  getStatusBadge: (status: string) => string
  formatEmploymentType: (type: string | null) => string
}

export default function StaffCard({ staff, getStatusBadge, formatEmploymentType }: StaffCardProps) {
  const fullName = `${staff.first_name} ${staff.last_name}`.trim() || staff.email || 'Unnamed staff'

  return (
    <Link
      href={`/staff/${staff.id}`}
      className="block bg-white rounded-xl ring-1 ring-gray-950/5 p-4 hover:shadow-md hover:ring-gray-950/10 transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">{fullName}</h3>
          <p className="text-sm text-gray-400 font-mono mt-0.5">{staff.employee_number}</p>
        </div>
        <span
          className={`px-2.5 py-0.5 inline-flex text-xs font-medium rounded-md flex-shrink-0 ml-2 ${getStatusBadge(
            staff.status
          )}`}
        >
          {staff.status.replace('_', ' ')}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          {staff.email && (
            <p className="text-gray-600 truncate">{staff.email}</p>
          )}
          {staff.phone && (
            <p className="text-xs text-gray-400 mt-0.5">{staff.phone}</p>
          )}
          {!staff.email && !staff.phone && (
            <p className="text-gray-400">—</p>
          )}
        </div>

        <div className="flex items-center gap-3 text-gray-500">
          {staff.locations?.name && (
            <span className="flex items-center gap-1">
              <MapPinIcon className="w-3.5 h-3.5" />
              {staff.locations.name}
            </span>
          )}
          {staff.employment_type && (
            <span className="flex items-center gap-1">
              <BriefcaseIcon className="w-3.5 h-3.5" />
              {formatEmploymentType(staff.employment_type)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
