'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface StaffPaginationProps {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export default function StaffPagination({
  page,
  pageSize,
  total,
  totalPages,
}: StaffPaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updatePage = (newPage: number) => {
    // Validate page number
    if (newPage < 1 || newPage > totalPages || isNaN(newPage)) {
      return // Don't navigate to invalid pages
    }
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.push(`/staff?${params.toString()}`)
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  // Generate page numbers to show
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const pages: (number | string)[] = []
    
    // Always show first page
    pages.push(1)
    
    if (page > 3) {
      pages.push('...')
    }
    
    // Show pages around current page
    const start = Math.max(2, page - 1)
    const end = Math.min(totalPages - 1, page + 1)
    
    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== totalPages) {
        pages.push(i)
      }
    }
    
    if (page < totalPages - 2) {
      pages.push('...')
    }
    
    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages)
    }
    
    return pages
  }

  if (totalPages <= 1) {
    return (
      <div className="px-6 py-4 border-t border-gray-200 bg-white">
        <p className="text-sm text-gray-600">
          {total === 0 ? 'No staff members' : `Showing ${total} staff member${total === 1 ? '' : 's'}`}
        </p>
      </div>
    )
  }

  return (
    <div className="px-6 py-4 border-t border-gray-200 bg-white">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-600">
          Showing <span className="font-medium">{from}</span> to <span className="font-medium">{to}</span> of{' '}
          <span className="font-medium">{total}</span> staff
        </p>

        <div className="flex items-center gap-2">
          {/* Previous Button */}
          <button
            onClick={() => updatePage(page - 1)}
            disabled={page === 1}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
          >
            Previous
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((pageNum, index) => {
              if (pageNum === '...') {
                return (
                  <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                    ...
                  </span>
                )
              }

              const pageNumber = pageNum as number
              const isCurrentPage = pageNumber === page

              return (
                <button
                  key={pageNumber}
                  onClick={() => updatePage(pageNumber)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isCurrentPage
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNumber}
                </button>
              )
            })}
          </div>

          {/* Next Button */}
          <button
            onClick={() => updatePage(page + 1)}
            disabled={page === totalPages}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

