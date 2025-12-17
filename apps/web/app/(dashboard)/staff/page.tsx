'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import StaffFilters from './components/StaffFilters'
import StaffPagination from './components/StaffPagination'
import StaffTableSkeleton from './components/StaffTableSkeleton'
import StaffCard from './components/StaffCard'

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

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export default function StaffPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [canCreateStaff, setCanCreateStaff] = useState(false)
  const [loadingRole, setLoadingRole] = useState(true)

  // Validate and sanitize URL params with strict defaults
  const validatePage = (pageParam: string | null): number => {
    if (!pageParam) return 1
    const parsed = parseInt(pageParam, 10)
    return !isNaN(parsed) && parsed > 0 ? parsed : 1
  }

  const validatePageSize = (pageSizeParam: string | null): number => {
    if (!pageSizeParam) return 25
    const parsed = parseInt(pageSizeParam, 10)
    if (!isNaN(parsed) && parsed > 0) {
      return Math.min(parsed, 100) // Cap at 100 for performance
    }
    return 25
  }

  const validateStatus = (statusParam: string | null): string => {
    const validStatuses = ['active', 'on_leave', 'terminated']
    return statusParam && validStatuses.includes(statusParam) ? statusParam : ''
  }

  const validateLocationId = (locationIdParam: string | null): string => {
    if (!locationIdParam) return ''
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(locationIdParam) ? locationIdParam : ''
  }

  // Get validated params from URL
  const currentPage = validatePage(searchParams?.get('page'))
  const pageSize = validatePageSize(searchParams?.get('pageSize'))

  // Fetch user role for permission check
  useEffect(() => {
    fetch('/api/auth/role')
      .then(res => res.json())
      .then(data => {
        const role = data.role || 'staff'
        setCanCreateStaff(['admin', 'manager', 'superadmin'].includes(role))
        setLoadingRole(false)
      })
      .catch(() => {
        setCanCreateStaff(false)
        setLoadingRole(false)
      })
  }, [])

  // Fetch staff data
  const fetchStaff = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      const search = (searchParams?.get('search') || '').trim()
      const status = validateStatus(searchParams?.get('status'))
      const locationId = validateLocationId(searchParams?.get('location_id'))

      if (search) params.append('search', search)
      if (status) params.append('status', status)
      if (locationId) params.append('location_id', locationId)
      
      // Always include pagination params
      params.append('page', currentPage.toString())
      params.append('pageSize', pageSize.toString())

      const response = await fetch(`/api/staff?${params}`)

      if (response.status === 401) {
        setError('Please sign in to view staff members.')
        setLoading(false)
        return
      }

      if (response.status === 403) {
        setError('You don\'t have permission to view this page.')
        setLoading(false)
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch staff members')
      }

      const data = await response.json()
      setStaff(data.staff || [])

      // Set pagination if provided
      if (data.pagination) {
        setPagination(data.pagination)
      } else {
        // Fallback for backward compatibility
        setPagination({
          page: 1,
          pageSize: data.staff?.length || 0,
          total: data.staff?.length || 0,
          totalPages: 1,
        })
      }
    } catch (err: any) {
      console.error('Error fetching staff:', err)
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch staff when URL params change
  useEffect(() => {
    fetchStaff()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams?.toString(), currentPage])

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      on_leave: 'bg-yellow-100 text-yellow-800',
      terminated: 'bg-red-100 text-red-800',
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  const formatEmploymentType = (type: string | null) => {
    if (!type) return '—'
    const map: Record<string, string> = {
      full_time: 'Full-time',
      part_time: 'Part-time',
      casual: 'Casual',
      contractor: 'Contractor',
    }
    return map[type] || type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const retry = () => {
    fetchStaff()
  }

  return (
    <div>
      <PageHeader
        title="Staff"
        description="Manage your team members and their details."
        action={
          canCreateStaff && !loadingRole ? (
            <Link href="/staff/new">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors">
                Add Staff
              </button>
            </Link>
          ) : null
        }
      />

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Filters */}
        <StaffFilters onFilterChange={fetchStaff} />

        {/* Error State */}
        {error && (
          <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <button
                onClick={retry}
                className="px-3 py-1.5 text-sm font-medium text-red-800 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <StaffTableSkeleton />
              </table>
            </div>
          ) : staff.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              title="No staff members yet"
              description="Add your first team member to get started. You can add their details, documents, and availability."
            />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {staff.map((member) => {
                      const fullName = `${member.first_name} ${member.last_name}`.trim() || member.email || 'Unnamed staff'
                      
                      return (
                        <tr
                          key={member.id}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={(e) => {
                            // Only navigate if user isn't selecting text
                            const selection = window.getSelection()
                            if (!selection || selection.toString().length === 0) {
                              router.push(`/staff/${member.id}`)
                            }
                          }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900 font-mono">
                              {member.employee_number}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link
                              href={`/staff/${member.id}`}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {fullName}
                            </Link>
                          </td>
                          <td 
                            className="px-6 py-4 whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="text-sm text-gray-900 select-text">
                              {member.email || '—'}
                            </div>
                            {member.phone && (
                              <div className="text-xs text-gray-500 mt-0.5 select-text">
                                {member.phone}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {member.locations?.name || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatEmploymentType(member.employment_type)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(
                                member.status
                              )}`}
                            >
                              {formatStatus(member.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Link
                              href={`/staff/${member.id}`}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {staff.map((member) => (
                  <StaffCard
                    key={member.id}
                    staff={member}
                    getStatusBadge={getStatusBadge}
                    formatEmploymentType={formatEmploymentType}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <StaffPagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            totalPages={pagination.totalPages}
          />
        )}
      </div>
    </div>
  )
}
