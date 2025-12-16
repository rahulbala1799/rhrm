'use client'

import { useState, useEffect } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'

interface Location {
  id: string
  name: string
  address: string | null
  postcode: string | null
  phone: string | null
  created_at: string
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    postcode: '',
    phone: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/settings/locations')
      if (!response.ok) throw new Error('Failed to fetch')
      const { locations } = await response.json()
      setLocations(locations || [])
    } catch (error) {
      console.error('Error fetching locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (location?: Location) => {
    if (location) {
      setEditingLocation(location)
      setFormData({
        name: location.name || '',
        address: location.address || '',
        postcode: location.postcode || '',
        phone: location.phone || '',
      })
    } else {
      setEditingLocation(null)
      setFormData({ name: '', address: '', postcode: '', phone: '' })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingLocation(null)
    setFormData({ name: '', address: '', postcode: '', phone: '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const url = editingLocation
        ? `/api/settings/locations/${editingLocation.id}`
        : '/api/settings/locations'
      const method = editingLocation ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save')
      }

      handleCloseModal()
      fetchLocations()
      alert(editingLocation ? 'Location updated successfully!' : 'Location created successfully!')
    } catch (error: any) {
      console.error('Error saving location:', error)
      alert(error.message || 'Failed to save location')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return

    try {
      const response = await fetch(`/api/settings/locations/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete')
      }

      fetchLocations()
      alert('Location deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting location:', error)
      alert(error.message || 'Failed to delete location')
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Locations"
          description="Manage your business locations"
        />
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Locations"
        description="Manage your business locations"
        action={
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            Add Location
          </button>
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings/company' },
          { label: 'Locations' },
        ]}
      />

      {locations.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          title="No locations added"
          description="Add your business locations to organize shifts and staff by workplace."
          action={{
            label: 'Add First Location',
            onClick: () => handleOpenModal(),
          }}
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Address</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Postcode</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Phone</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {locations.map((location) => (
                <tr key={location.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{location.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{location.address || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{location.postcode || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{location.phone || '—'}</td>
                  <td className="px-6 py-4 text-sm text-right space-x-2">
                    <button
                      onClick={() => handleOpenModal(location)}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(location.id)}
                      className="text-red-600 hover:text-red-700 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingLocation ? 'Edit Location' : 'Add Location'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Postcode</label>
                <input
                  type="text"
                  value={formData.postcode}
                  onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-4 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingLocation ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
