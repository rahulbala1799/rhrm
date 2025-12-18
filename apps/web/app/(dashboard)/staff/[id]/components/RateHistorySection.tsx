'use client'

import { useState, useEffect } from 'react'
import { useFormatCurrency } from '@/app/(dashboard)/hooks/useFormatCurrency'

interface RateHistoryEntry {
  id: string
  hourly_rate: number
  effective_date: string
  notes: string | null
  created_at: string
  created_by: string | null
}

interface RateHistorySectionProps {
  staffId: string
  role: string | null
}

export default function RateHistorySection({ staffId, role }: RateHistorySectionProps) {
  const { format } = useFormatCurrency()
  const [history, setHistory] = useState<RateHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    hourly_rate: '',
    effective_date: '',
    notes: ''
  })

  const isAdmin = role === 'admin' || role === 'superadmin'

  useEffect(() => {
    if (isAdmin && staffId) {
      fetchHistory()
    }
  }, [staffId, isAdmin])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/staff/${staffId}/rate-history`)
      if (!response.ok) {
        if (response.status === 403) {
          setError('You do not have permission to view rate history')
        } else {
          setError('Failed to load rate history')
        }
        return
      }
      const { history: fetchedHistory } = await response.json()
      setHistory(fetchedHistory || [])
    } catch (error) {
      console.error('Error fetching rate history:', error)
      setError('Failed to load rate history')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    setError(null)

    try {
      const response = await fetch(`/api/staff/${staffId}/rate-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hourly_rate: parseFloat(formData.hourly_rate),
          effective_date: formData.effective_date,
          notes: formData.notes || null
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add rate')
      }

      // Reset form and refresh
      setFormData({ hourly_rate: '', effective_date: '', notes: '' })
      setShowAddForm(false)
      fetchHistory()
    } catch (error: any) {
      setError(error.message || 'Failed to add rate')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (rateId: string) => {
    if (!confirm('Are you sure you want to delete this rate? This can only be done for future-dated rates.')) {
      return
    }

    try {
      const response = await fetch(`/api/staff/${staffId}/rate-history/${rateId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete rate')
      }

      fetchHistory()
    } catch (error: any) {
      alert(error.message || 'Failed to delete rate')
    }
  }

  const isPastRate = (date: string) => {
    const today = new Date().toISOString().split('T')[0]
    return date <= today
  }

  if (!isAdmin) {
    return null // Only admins can see rate history
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="ml-3 text-sm text-gray-600">Loading rate history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Rate History</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          {showAddForm ? 'Cancel' : '+ Add Rate'}
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAdd} className="mb-6 bg-gray-50 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hourly Rate <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.hourly_rate}
              onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Effective Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.effective_date}
              onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {formData.effective_date && isPastRate(formData.effective_date) && (
              <p className="text-xs text-yellow-600 mt-1">
                ⚠️ Adding a past-dated rate. Please provide notes explaining why.
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={isPastRate(formData.effective_date) ? 'Required for past-dated rates' : 'Optional notes'}
            />
            {formData.effective_date && isPastRate(formData.effective_date) && !formData.notes && (
              <p className="text-xs text-red-600 mt-1">Notes are required for past-dated rates</p>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setFormData({ hourly_rate: '', effective_date: '', notes: '' })
                setError(null)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adding || (isPastRate(formData.effective_date) && !formData.notes)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? 'Adding...' : 'Add Rate'}
            </button>
          </div>
        </form>
      )}

      {history.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No rate history found. Add a rate to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Effective Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hourly Rate
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {history.map((entry) => {
                const isPast = isPastRate(entry.effective_date)
                return (
                  <tr key={entry.id} className={isPast ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {entry.effective_date}
                      {isPast && (
                        <span className="ml-2 text-xs text-gray-500">(Past)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {format(entry.hourly_rate)}/hr
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {entry.notes || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                      {!isPast && (
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

