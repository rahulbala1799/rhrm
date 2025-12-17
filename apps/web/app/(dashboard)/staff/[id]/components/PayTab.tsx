'use client'

import { useState } from 'react'

interface Staff {
  pay_type: string | null
  hourly_rate: number | null
  salary_amount: number | null
  pay_frequency: string | null
  overtime_enabled: boolean
  overtime_rule_type: string | null
  overtime_multiplier: number | null
  overtime_flat_extra: number | null
}

interface PayTabProps {
  staff: Staff
  editing: boolean
  formRef?: (ref: HTMLFormElement | null) => void
  onSave: (data: any) => Promise<void>
}

export default function PayTab({ staff, editing, formRef, onSave }: PayTabProps) {
  const [formData, setFormData] = useState({
    pay_type: staff.pay_type || '',
    hourly_rate: staff.hourly_rate || '',
    salary_amount: staff.salary_amount || '',
    pay_frequency: staff.pay_frequency || '',
    overtime_enabled: staff.overtime_enabled,
    overtime_rule_type: staff.overtime_rule_type || '',
    overtime_multiplier: staff.overtime_multiplier || '',
    overtime_flat_extra: staff.overtime_flat_extra || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(formData)
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '—'
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount)
  }

  const formatFrequency = (freq: string | null) => {
    if (!freq) return ''
    return freq.charAt(0).toUpperCase() + freq.slice(1)
  }

  if (editing) {
    return (
      <form
        ref={(el) => formRef?.(el)}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pay Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pay Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="pay_type"
                    value="hourly"
                    checked={formData.pay_type === 'hourly'}
                    onChange={(e) => setFormData({ ...formData, pay_type: e.target.value })}
                    className="mr-2"
                  />
                  Hourly
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="pay_type"
                    value="salary"
                    checked={formData.pay_type === 'salary'}
                    onChange={(e) => setFormData({ ...formData, pay_type: e.target.value })}
                    className="mr-2"
                  />
                  Salary
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="pay_type"
                    value=""
                    checked={formData.pay_type === ''}
                    onChange={(e) => setFormData({ ...formData, pay_type: e.target.value })}
                    className="mr-2"
                  />
                  None
                </label>
              </div>
            </div>

            {formData.pay_type === 'hourly' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hourly Rate (£)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pay Frequency
                  </label>
                  <select
                    value={formData.pay_frequency}
                    onChange={(e) => setFormData({ ...formData, pay_frequency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select frequency</option>
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </>
            )}

            {formData.pay_type === 'salary' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Salary Amount (£)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.salary_amount}
                    onChange={(e) => setFormData({ ...formData, salary_amount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pay Frequency
                  </label>
                  <select
                    value={formData.pay_frequency}
                    onChange={(e) => setFormData({ ...formData, pay_frequency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select frequency</option>
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </>
            )}

            <div className="border-t pt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.overtime_enabled}
                  onChange={(e) => setFormData({ ...formData, overtime_enabled: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Overtime Enabled</span>
              </label>
            </div>

            {formData.overtime_enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Overtime Rule Type
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="overtime_rule_type"
                        value="multiplier"
                        checked={formData.overtime_rule_type === 'multiplier'}
                        onChange={(e) => setFormData({ ...formData, overtime_rule_type: e.target.value })}
                        className="mr-2"
                      />
                      Multiplier
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="overtime_rule_type"
                        value="flat_extra"
                        checked={formData.overtime_rule_type === 'flat_extra'}
                        onChange={(e) => setFormData({ ...formData, overtime_rule_type: e.target.value })}
                        className="mr-2"
                      />
                      Flat Extra
                    </label>
                  </div>
                </div>

                {formData.overtime_rule_type === 'multiplier' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Overtime Multiplier (e.g., 1.5 for 1.5x)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.overtime_multiplier}
                      onChange={(e) => setFormData({ ...formData, overtime_multiplier: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                )}

                {formData.overtime_rule_type === 'flat_extra' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Flat Extra Amount (£/hour)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.overtime_flat_extra}
                      onChange={(e) => setFormData({ ...formData, overtime_flat_extra: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </form>
    )
  }

  // View Mode
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Pay Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Pay Type:</span>
            <span className="font-medium text-gray-900">
              {staff.pay_type ? staff.pay_type.charAt(0).toUpperCase() + staff.pay_type.slice(1) : '—'}
            </span>
          </div>
          {staff.pay_type === 'hourly' && staff.hourly_rate && (
            <div className="flex justify-between">
              <span className="text-gray-600">Hourly Rate:</span>
              <span className="font-medium text-gray-900">{formatCurrency(staff.hourly_rate)} per hour</span>
            </div>
          )}
          {staff.pay_type === 'salary' && staff.salary_amount && (
            <div className="flex justify-between">
              <span className="text-gray-600">Salary:</span>
              <span className="font-medium text-gray-900">{formatCurrency(staff.salary_amount)} per {formatFrequency(staff.pay_frequency)}</span>
            </div>
          )}
          {staff.pay_frequency && (
            <div className="flex justify-between">
              <span className="text-gray-600">Pay Frequency:</span>
              <span className="font-medium text-gray-900">{formatFrequency(staff.pay_frequency)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Overtime:</span>
            <span className="font-medium text-gray-900">
              {staff.overtime_enabled ? 'Enabled' : 'Not enabled'}
            </span>
          </div>
          {staff.overtime_enabled && staff.overtime_rule_type === 'multiplier' && staff.overtime_multiplier && (
            <div className="flex justify-between">
              <span className="text-gray-600">Overtime Rule:</span>
              <span className="font-medium text-gray-900">{staff.overtime_multiplier}x multiplier</span>
            </div>
          )}
          {staff.overtime_enabled && staff.overtime_rule_type === 'flat_extra' && staff.overtime_flat_extra !== null && (
            <div className="flex justify-between">
              <span className="text-gray-600">Overtime Rule:</span>
              <span className="font-medium text-gray-900">+{formatCurrency(staff.overtime_flat_extra)} per hour</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

