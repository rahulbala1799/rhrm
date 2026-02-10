'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import SectionCard from '@/components/ui/SectionCard'

type Tab = 'setup' | 'roles' | 'assign'

interface Defaults {
  employer_legal_name?: string
  employer_registered_address?: string
  probation_length_weeks?: number
  probation_notice?: string
  disciplinary_doc_name?: string
  grievance_doc_name?: string
  privacy_notice_name?: string
  safety_statement_location?: string
  annual_leave?: string
  request_process?: string
  employee_notice?: string
  employer_notice?: string
}

interface Template {
  id: string
  template_id: string
  name: string
  jurisdiction: string
  version: string
  is_standard: boolean
}

interface RoleDefault {
  id: string
  job_role_id: string
  template_id: string
  contract_templates: { id: string; name: string; template_id: string } | null
}

interface JobRole {
  id: string
  name: string
}

interface Assignment {
  id: string
  staff_id: string
  status: string
  issued_at: string | null
  contract_templates: { name: string; template_id: string } | null
  staff: { first_name: string; last_name: string; email: string | null } | null
}

interface StaffMember {
  id: string
  first_name: string
  last_name: string
  email: string | null
}

export default function ContractGeneratorPage() {
  const [tab, setTab] = useState<Tab>('setup')
  const [defaults, setDefaults] = useState<Defaults>({})
  const [defaultsLoading, setDefaultsLoading] = useState(true)
  const [defaultsSaving, setDefaultsSaving] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [roleDefaults, setRoleDefaults] = useState<RoleDefault[]>([])
  const [jobRoles, setJobRoles] = useState<JobRole[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [assignmentsLoading, setAssignmentsLoading] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newTemplateId, setNewTemplateId] = useState('')
  const [newStaffId, setNewStaffId] = useState('')
  const [newForm, setNewForm] = useState<Record<string, string>>({})
  const [newSubmitting, setNewSubmitting] = useState(false)
  const [newError, setNewError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/contracts/defaults')
      .then((r) => r.json())
      .then((d) => {
        setDefaults(d.defaults ?? {})
      })
      .catch(() => setDefaults({}))
      .finally(() => setDefaultsLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/contracts/templates')
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => setTemplates([]))
  }, [])

  useEffect(() => {
    fetch('/api/contracts/role-defaults')
      .then((r) => r.json())
      .then((d) => setRoleDefaults(d.role_defaults ?? []))
      .catch(() => setRoleDefaults([]))
  }, [])

  useEffect(() => {
    fetch('/api/settings/job-roles')
      .then((r) => r.json())
      .then((d) => setJobRoles(d.roles ?? []))
      .catch(() => setJobRoles([]))
  }, [])

  useEffect(() => {
    if (tab === 'assign') {
      setAssignmentsLoading(true)
      fetch('/api/contracts/assignments')
        .then((r) => r.json())
        .then((d) => setAssignments(d.assignments ?? []))
        .finally(() => setAssignmentsLoading(false))
    }
  }, [tab])

  useEffect(() => {
    if (showNewModal) {
      fetch('/api/staff?pageSize=500')
        .then((r) => r.json())
        .then((d) => setStaff(d.staff ?? []))
        .catch(() => setStaff([]))
      if (templates.length) setNewTemplateId(templates[0].id)
      setNewStaffId('')
      setNewForm({})
      setNewError(null)
    }
  }, [showNewModal, templates])

  const saveDefaults = async () => {
    setDefaultsSaving(true)
    try {
      const res = await fetch('/api/contracts/defaults', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaults_json: defaults }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save')
    } catch (e: any) {
      alert(e.message || 'Failed to save')
    } finally {
      setDefaultsSaving(false)
    }
  }

  const saveRoleDefault = async (jobRoleId: string, templateId: string) => {
    try {
      const res = await fetch('/api/contracts/role-defaults', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_role_id: jobRoleId, template_id: templateId }),
      })
      if (!res.ok) throw new Error('Failed to save')
      const d = await res.json()
      setRoleDefaults((prev) => {
        const rest = prev.filter((r) => r.job_role_id !== jobRoleId)
        return [...rest, { id: d.role_default.id, job_role_id: jobRoleId, template_id: templateId, contract_templates: templates.find((t) => t.id === templateId) ?? null }]
      })
    } catch {
      alert('Failed to save role default')
    }
  }

  const getDefaultTemplateForRole = (jobRoleId: string) => {
    const r = roleDefaults.find((rd) => rd.job_role_id === jobRoleId)
    return r?.template_id ?? ''
  }

  const createAssignment = async () => {
    if (!newTemplateId || !newStaffId) {
      setNewError('Please select a template and a staff member')
      return
    }
    const selectedStaff = staff.find((s) => s.id === newStaffId)
    const fullName = selectedStaff ? `${selectedStaff.first_name} ${selectedStaff.last_name}`.trim() : ''
    const generation_input = {
      employer: {
        legal_name: newForm.employer_legal_name ?? defaults.employer_legal_name ?? '',
        registered_address: newForm.employer_registered_address ?? defaults.employer_registered_address ?? '',
      },
      employee: {
        full_name: newForm.employee_full_name ?? fullName,
        address: newForm.employee_address ?? '',
      },
      employment: {
        start_date: newForm.start_date ?? new Date().toISOString().slice(0, 10),
        contract_type: 'permanent',
      },
      role: {
        title: newForm.role_title ?? '',
        reports_to_name: newForm.reports_to_name ?? '',
        reports_to_title: newForm.reports_to_title ?? '',
        summary_duties: newForm.summary_duties ?? '',
      },
      work: { location_primary: newForm.location_primary ?? '' },
      working: {
        hours_per_week: newForm.hours_per_week ?? '',
        days_pattern: newForm.days_pattern ?? '',
        roster_notice: newForm.roster_notice ?? '1 week',
      },
      pay: {
        amount: newForm.pay_amount ?? '',
        type: newForm.pay_type ?? 'hourly',
        frequency: newForm.pay_frequency ?? 'weekly',
        method: newForm.pay_method ?? 'bank transfer',
      },
      leave: {
        annual_leave: newForm.annual_leave ?? defaults.annual_leave ?? 'statutory minimum',
        request_process: newForm.request_process ?? defaults.request_process ?? 'as notified',
      },
      termination: {
        employee_notice: newForm.employee_notice ?? defaults.employee_notice ?? '1 week',
        employer_notice: newForm.employer_notice ?? defaults.employer_notice ?? 'statutory minimum',
      },
      policies: {
        disciplinary_doc_name: newForm.disciplinary_doc_name ?? defaults.disciplinary_doc_name ?? 'Disciplinary Procedure',
        grievance_doc_name: newForm.grievance_doc_name ?? defaults.grievance_doc_name ?? 'Grievance Procedure',
        privacy_notice_name: newForm.privacy_notice_name ?? defaults.privacy_notice_name ?? 'Employee Privacy Notice',
        safety_statement_location: newForm.safety_statement_location ?? defaults.safety_statement_location ?? 'as notified',
      },
    }
    setNewSubmitting(true)
    setNewError(null)
    try {
      const res = await fetch('/api/contracts/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: newTemplateId,
          staff_id: newStaffId,
          generation_input,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create contract')
      setShowNewModal(false)
      setAssignments((prev) => [data.assignment, ...prev])
      window.open(`/compliance/contract/generator/document?id=${data.assignment.id}`, '_blank')
    } catch (e: any) {
      setNewError(e.message || 'Failed to create contract')
    } finally {
      setNewSubmitting(false)
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'setup', label: 'Company setup' },
    { id: 'roles', label: 'Role mapping' },
    { id: 'assign', label: 'Assign contract' },
  ]

  return (
    <div>
      <PageHeader
        title="Contract Generator"
        description="Create and manage employee contracts"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'Contract', href: '/compliance/contract' },
          { label: 'Contract Generator' },
        ]}
        action={
          <Link href="/compliance/contract" className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
            ← Back to Contract
          </Link>
        }
      />

      <div className="flex gap-2 border-b border-gray-200 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.id ? 'bg-white border border-b-0 border-gray-200 text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'setup' && (
        <SectionCard
          title="Company contract defaults"
          description="One-time setup: these values prefill every new contract."
          action={
            <button
              onClick={saveDefaults}
              disabled={defaultsSaving || defaultsLoading}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium disabled:opacity-50"
            >
              {defaultsSaving ? 'Saving...' : 'Save'}
            </button>
          }
        >
          {defaultsLoading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employer legal name</label>
                <input
                  type="text"
                  value={defaults.employer_legal_name ?? ''}
                  onChange={(e) => setDefaults((d) => ({ ...d, employer_legal_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employer address</label>
                <input
                  type="text"
                  value={defaults.employer_registered_address ?? ''}
                  onChange={(e) => setDefaults((d) => ({ ...d, employer_registered_address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Probation notice</label>
                <input
                  type="text"
                  placeholder="e.g. 1 week"
                  value={defaults.probation_notice ?? ''}
                  onChange={(e) => setDefaults((d) => ({ ...d, probation_notice: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Disciplinary procedure doc name</label>
                <input
                  type="text"
                  value={defaults.disciplinary_doc_name ?? ''}
                  onChange={(e) => setDefaults((d) => ({ ...d, disciplinary_doc_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grievance procedure doc name</label>
                <input
                  type="text"
                  value={defaults.grievance_doc_name ?? ''}
                  onChange={(e) => setDefaults((d) => ({ ...d, grievance_doc_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Privacy notice name</label>
                <input
                  type="text"
                  value={defaults.privacy_notice_name ?? ''}
                  onChange={(e) => setDefaults((d) => ({ ...d, privacy_notice_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Safety statement location</label>
                <input
                  type="text"
                  value={defaults.safety_statement_location ?? ''}
                  onChange={(e) => setDefaults((d) => ({ ...d, safety_statement_location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {tab === 'roles' && (
        <SectionCard
          title="Default template per role"
          description="When assigning a contract, the system will suggest this template for the selected role."
        >
          {jobRoles.length === 0 ? (
            <p className="text-sm text-gray-500">No job roles yet. Add roles in Settings → Job Roles.</p>
          ) : (
            <div className="space-y-3">
              {jobRoles.map((role) => (
                <div key={role.id} className="flex items-center gap-4">
                  <span className="w-48 text-sm font-medium text-gray-900">{role.name}</span>
                  <select
                    value={getDefaultTemplateForRole(role.id)}
                    onChange={(e) => saveRoleDefault(role.id, e.target.value)}
                    className="flex-1 max-w-md px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="">— No default —</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {tab === 'assign' && (
        <SectionCard
          title="Contract assignments"
          description="Issued contracts. Staff can view and upload signed copies from My Compliance."
          action={
            <button
              onClick={() => setShowNewModal(true)}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium"
            >
              New contract
            </button>
          }
        >
          {assignmentsLoading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : assignments.length === 0 ? (
            <p className="text-sm text-gray-500">No contracts issued yet. Click &quot;New contract&quot; to create one.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-2 pr-4">Employee</th>
                    <th className="pb-2 pr-4">Template</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Issued</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id} className="border-b border-gray-100">
                      <td className="py-2 pr-4">
                        {a.staff ? `${a.staff.first_name} ${a.staff.last_name}` : a.staff_id}
                      </td>
                      <td className="py-2 pr-4">{a.contract_templates?.name ?? '—'}</td>
                      <td className="py-2 pr-4">
                        <span className="capitalize">{a.status.replace('_', ' ')}</span>
                      </td>
                      <td className="py-2 pr-4">{a.issued_at ? new Date(a.issued_at).toLocaleDateString() : '—'}</td>
                      <td className="py-2">
                        <a
                          href={`/compliance/contract/generator/document?id=${a.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-700"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">New contract</h3>
              <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="p-5 space-y-4">
              {newError && <p className="text-sm text-red-600">{newError}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                <select
                  value={newTemplateId}
                  onChange={(e) => setNewTemplateId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Staff member</label>
                <select
                  value={newStaffId}
                  onChange={(e) => setNewStaffId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Select...</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                  <input
                    type="date"
                    value={newForm.start_date ?? ''}
                    onChange={(e) => setNewForm((f) => ({ ...f, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job title</label>
                  <input
                    type="text"
                    value={newForm.role_title ?? ''}
                    onChange={(e) => setNewForm((f) => ({ ...f, role_title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="e.g. Sales Assistant"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Place of work</label>
                <input
                  type="text"
                  value={newForm.location_primary ?? ''}
                  onChange={(e) => setNewForm((f) => ({ ...f, location_primary: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  placeholder="Address or location name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hours per week</label>
                  <input
                    type="text"
                    value={newForm.hours_per_week ?? ''}
                    onChange={(e) => setNewForm((f) => ({ ...f, hours_per_week: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="e.g. 39"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pay amount</label>
                  <input
                    type="text"
                    value={newForm.pay_amount ?? ''}
                    onChange={(e) => setNewForm((f) => ({ ...f, pay_amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="e.g. 12.50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duties summary</label>
                <input
                  type="text"
                  value={newForm.summary_duties ?? ''}
                  onChange={(e) => setNewForm((f) => ({ ...f, summary_duties: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  placeholder="Brief description of role duties"
                />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowNewModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={createAssignment} disabled={newSubmitting} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium disabled:opacity-50">
                {newSubmitting ? 'Creating...' : 'Generate & issue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
