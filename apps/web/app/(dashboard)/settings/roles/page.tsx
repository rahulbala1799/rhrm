'use client'

import PageHeader from '@/components/ui/PageHeader'
import SectionCard from '@/components/ui/SectionCard'

const ROLES = [
  {
    name: 'Superadmin',
    value: 'superadmin',
    description: 'Full system access across all tenants. Can manage platform settings.',
    color: 'bg-purple-100 text-purple-800',
    permissions: [
      'All admin permissions',
      'Access to all tenants',
      'Platform management',
    ],
  },
  {
    name: 'Admin',
    value: 'admin',
    description: 'Full access to your organization. Can manage all settings, staff, and data.',
    color: 'bg-red-100 text-red-800',
    permissions: [
      'Manage company settings',
      'Add/edit/delete locations',
      'Manage all staff members',
      'Create and manage schedules',
      'Access payroll and compliance',
      'Send invitations',
      'Manage roles and permissions',
    ],
  },
  {
    name: 'Manager',
    value: 'manager',
    description: 'Can manage schedules, staff, and day-to-day operations.',
    color: 'bg-blue-100 text-blue-800',
    permissions: [
      'View and edit schedules',
      'Manage staff in assigned locations',
      'View timesheets',
      'Access compliance documents',
      'Create shifts',
      'Cannot delete locations or manage company settings',
    ],
  },
  {
    name: 'Staff',
    value: 'staff',
    description: 'Basic access to view schedules and manage their own profile.',
    color: 'bg-gray-100 text-gray-800',
    permissions: [
      'View own schedule',
      'View own timesheets',
      'Update own profile',
      'Set availability',
      'View assigned shifts only',
    ],
  },
]

export default function RolesPage() {
  return (
    <div>
      <PageHeader
        title="Job Roles & Permissions"
        description="Understand the roles and permissions in your organization"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings/company' },
          { label: 'Roles' },
        ]}
      />

      <div className="space-y-6">
        {ROLES.map((role) => (
          <SectionCard
            key={role.value}
            title={role.name}
            description={role.description}
          >
            <div className="mt-4">
              <div className="mb-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${role.color}`}>
                  {role.name}
                </span>
              </div>
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Permissions:</h4>
              <ul className="space-y-2">
                {role.permissions.map((permission, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{permission}</span>
                  </li>
                ))}
              </ul>
            </div>
          </SectionCard>
        ))}
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-semibold text-blue-900 mb-1">About Roles</h4>
            <p className="text-sm text-blue-800">
              Roles define what team members can access and manage in your organization. 
              You can assign roles when sending invitations or by editing member permissions. 
              Role changes take effect immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
