'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'

interface Availability {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_available: boolean
  valid_from: string | null
  valid_until: string | null
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function StaffAvailabilityPage() {
  const params = useParams()
  const [availability, setAvailability] = useState<Availability[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    is_available: true,
    valid_from: '',
    valid_until: '',
  })

  useEffect(() => {
    if (params.id) {
      fetchAvailability()
    }
  }, [params.id])

  const fetchAvailability = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/staff/${params.id}/availability`)
      if (response.ok) {
        const data = await response.json()
        setAvailability(data.availability || [])
      }
    } catch (error) {
      console.error('Error fetching availability:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch(`/api/staff/${params.id}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          valid_from: formData.valid_from || null,
          valid_until: formData.valid_until || null,
        }),
      })

      if (response.ok) {
        setShowAddForm(false)
        setFormData({
          day_of_week: 1,
          start_time: '09:00',
          end_time: '17:00',
          is_available: true,
          valid_from: '',
          valid_until: '',
        })
        fetchAvailability()
      }
    } catch (error) {
      console.error('Error creating availability:', error)
    }
  }

  const handleDelete = async (availabilityId: string) => {
    if (!confirm('Are you sure you want to delete this availability slot?')) {
      return
    }

    try {
      const response = await fetch(`/api/staff/${params.id}/availability/${availabilityId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchAvailability()
      }
    } catch (error) {
      console.error('Error deleting availability:', error)
    }
  }

  const groupByDay = () => {
    const grouped: { [key: number]: Availability[] } = {}
    availability.forEach((slot) => {
      if (!grouped[slot.day_of_week]) {
        grouped[slot.day_of_week] = []
      }
      grouped[slot.day_of_week].push(slot)
    })
    return grouped
  }

  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const groupedAvailability = groupByDay()

  return (
    <div>
      <PageHeader
        title="Availability"
        description="View and manage this staff member's availability"
        action={
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            {showAddForm ? 'Cancel' : 'Add Availability'}
          </button>
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Staff', href: '/staff' },
          { label: 'Profile', href: `/staff/${params.id}` },
          { label: 'Availability' },
        ]}
      />

      {showAddForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Availability Slot</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Day of Week
                </label>
                <select
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {DAYS_OF_WEEK.map((day, index) => (
                    <option key={index} value={index}>{day}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available
                </label>
                <select
                  value={formData.is_available ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.value === 'true' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="true">Available</option>
                  <option value="false">Unavailable</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valid From (Optional)
                </label>
                <input
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valid Until (Optional)
                </label>
                <input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Add Slot
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-2 text-sm text-gray-600">Loading availability...</p>
          </div>
        ) : availability.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
              title="No availability set"
              description="This staff member hasn't set their availability yet. They can set it themselves or you can configure it for them."
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {DAYS_OF_WEEK.map((day, index) => (
              <div key={index} className="p-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">{day}</h4>
                {groupedAvailability[index] && groupedAvailability[index].length > 0 ? (
                  <div className="space-y-2">
                    {groupedAvailability[index].map((slot) => (
                      <div key={slot.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${slot.is_available ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                            </p>
                            {(slot.valid_from || slot.valid_until) && (
                              <p className="text-xs text-gray-500">
                                {slot.valid_from && `From ${new Date(slot.valid_from).toLocaleDateString()}`}
                                {slot.valid_from && slot.valid_until && ' • '}
                                {slot.valid_until && `Until ${new Date(slot.valid_until).toLocaleDateString()}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(slot.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No availability set for this day</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
