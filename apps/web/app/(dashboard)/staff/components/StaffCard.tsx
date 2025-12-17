'use client'

import Link from 'next/link'

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
      className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">{fullName}</h3>
          <p className="text-sm text-gray-500 font-mono mt-0.5">{staff.employee_number}</p>
        </div>
        <span
          className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full flex-shrink-0 ml-2 ${getStatusBadge(
            staff.status
          )}`}
        >
          {staff.status.replace('_', ' ')}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        {/* Contact Info */}
        <div>
          {staff.email && (
            <p className="text-gray-900 truncate">{staff.email}</p>
          )}
          {staff.phone && (
            <p className="text-xs text-gray-500 mt-0.5">{staff.phone}</p>
          )}
          {!staff.email && !staff.phone && (
            <p className="text-gray-400">—</p>
          )}
        </div>

        {/* Location & Type */}
        <div className="flex items-center gap-3 text-gray-600">
          {staff.locations?.name && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {staff.locations.name}
            </span>
          )}
          {staff.employment_type && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {formatEmploymentType(staff.employment_type)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

