'use client'

import { useState } from 'react'

interface Staff {
  contracted_weekly_hours: number | null
  min_hours_per_week: number | null
  max_hours_per_week: number | null
  max_hours_per_day: number | null
  max_consecutive_days: number | null
  min_rest_hours_between_shifts: number | null
  preferred_working_days: number[] | null
  preferred_shift_types: string[] | null
}

interface HoursRulesTabProps {
  staff: Staff
  editing: boolean
  formRef?: (ref: HTMLFormElement | null) => void
  onSave: (data: any) => Promise<void>
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SHIFT_TYPES = ['morning', 'evening', 'night']

export default function HoursRulesTab({ staff, editing, formRef, onSave }: HoursRulesTabProps) {
  const [formData, setFormData] = useState({
    contracted_weekly_hours: staff.contracted_weekly_hours || '',
    min_hours_per_week: staff.min_hours_per_week || '',
    max_hours_per_week: staff.max_hours_per_week || '',
    max_hours_per_day: staff.max_hours_per_day || '',
    max_consecutive_days: staff.max_consecutive_days || '',
    min_rest_hours_between_shifts: staff.min_rest_hours_between_shifts || '',
    preferred_working_days: staff.preferred_working_days || [],
    preferred_shift_types: staff.preferred_shift_types || [],
  })

  const [validationError, setValidationError] = useState<string | null>(null)

  const handlePreferredDayToggle = (day: number) => {
    const current = formData.preferred_working_days || []
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day].sort()
    setFormData({ ...formData, preferred_working_days: updated })
  }

  const handleShiftTypeToggle = (type: string) => {
    const current = formData.preferred_shift_types || []
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type]
    setFormData({ ...formData, preferred_shift_types: updated })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation: min cannot exceed max
    if (formData.min_hours_per_week && formData.max_hours_per_week) {
      if (Number(formData.min_hours_per_week) > Number(formData.max_hours_per_week)) {
        setValidationError('Minimum hours per week cannot exceed maximum hours per week')
        return
      }
    }
    
    setValidationError(null)
    await onSave(formData)
  }

  if (editing) {
    return (
      <form
        ref={(el) => formRef?.(el)}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {validationError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{validationError}</p>
          </div>
        )}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Working Rules</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contracted Weekly Hours
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.contracted_weekly_hours}
                onChange={(e) => setFormData({ ...formData, contracted_weekly_hours: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Hours Per Week
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.min_hours_per_week}
                onChange={(e) => {
                  setFormData({ ...formData, min_hours_per_week: e.target.value })
                  setValidationError(null)
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  validationError ? 'border-red-300' : 'border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Hours Per Week
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.max_hours_per_week}
                onChange={(e) => {
                  setFormData({ ...formData, max_hours_per_week: e.target.value })
                  setValidationError(null)
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  validationError ? 'border-red-300' : 'border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Hours Per Day
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.max_hours_per_day}
                onChange={(e) => setFormData({ ...formData, max_hours_per_day: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Consecutive Days
              </label>
              <input
                type="number"
                min="1"
                value={formData.max_consecutive_days}
                onChange={(e) => setFormData({ ...formData, max_consecutive_days: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Rest Hours Between Shifts
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.min_rest_hours_between_shifts}
                onChange={(e) => setFormData({ ...formData, min_rest_hours_between_shifts: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Working Days
              </label>
              <div className="grid grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map((day, index) => (
                  <label key={index} className="flex flex-col items-center p-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.preferred_working_days?.includes(index) || false}
                      onChange={() => handlePreferredDayToggle(index)}
                      className="mb-1"
                    />
                    <span className="text-xs text-center">{day.slice(0, 3)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Shift Types
              </label>
              <div className="flex gap-4">
                {SHIFT_TYPES.map((type) => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.preferred_shift_types?.includes(type) || false}
                      onChange={() => handleShiftTypeToggle(type)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </form>
    )
  }

  // View Mode
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Working Rules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Contracted Weekly Hours</label>
            <p className="text-gray-900">{staff.contracted_weekly_hours || '—'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Min/Max Hours Per Week</label>
            <p className="text-gray-900">
              {staff.min_hours_per_week && staff.max_hours_per_week
                ? `${staff.min_hours_per_week} - ${staff.max_hours_per_week} hours per week`
                : staff.min_hours_per_week
                ? `Min: ${staff.min_hours_per_week} hours`
                : staff.max_hours_per_week
                ? `Max: ${staff.max_hours_per_week} hours`
                : '—'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Max Hours Per Day</label>
            <p className="text-gray-900">{staff.max_hours_per_day || '—'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Max Consecutive Days</label>
            <p className="text-gray-900">{staff.max_consecutive_days || '—'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Min Rest Hours Between Shifts</label>
            <p className="text-gray-900">{staff.min_rest_hours_between_shifts || '—'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Preferred Working Days</label>
            <p className="text-gray-900">
              {staff.preferred_working_days && staff.preferred_working_days.length > 0
                ? staff.preferred_working_days.map(d => DAYS_OF_WEEK[d].slice(0, 3)).join(', ')
                : '—'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Preferred Shift Types</label>
            <p className="text-gray-900">
              {staff.preferred_shift_types && staff.preferred_shift_types.length > 0
                ? staff.preferred_shift_types.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')
                : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

