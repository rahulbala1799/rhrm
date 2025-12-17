import { redirect } from 'next/navigation'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import StatCard from '@/components/ui/StatCard'
import SectionCard from '@/components/ui/SectionCard'

export default async function DashboardPage() {
  // Get user's role
  const { role } = await getTenantContext()

  // Redirect staff to their dashboard
  if (role === 'staff') {
    redirect('/staff-dashboard')
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of today's activity and quick actions"
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Link href="/schedule/week">
          <button className="w-full bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Create Schedule</p>
                <p className="text-sm text-gray-600">Plan shifts</p>
              </div>
            </div>
          </button>
        </Link>

        <Link href="/staff/new">
          <button className="w-full bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Add Staff</p>
                <p className="text-sm text-gray-600">New team member</p>
              </div>
            </div>
          </button>
        </Link>

        <Link href="/settings/invitations">
          <button className="w-full bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Invite Team</p>
                <p className="text-sm text-gray-600">Send invitations</p>
              </div>
            </div>
          </button>
        </Link>

        <Link href="/settings/locations">
          <button className="w-full bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Add Location</p>
                <p className="text-sm text-gray-600">New workplace</p>
              </div>
            </div>
          </button>
        </Link>
      </div>

      {/* Today Snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Shifts Today"
          value={12}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Unfilled Shifts"
          value={3}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="People On Leave"
          value={2}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <StatCard
          title="Expiring Docs"
          value={2}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schedule Preview */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Today's Schedule"
            action={
              <Link href="/schedule/week">
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View Week Planner →
                </button>
              </Link>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Time</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Role</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Location</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Staff</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">09:00 - 17:00</td>
                    <td className="py-3 px-4 text-sm text-gray-700">Sales Associate</td>
                    <td className="py-3 px-4 text-sm text-gray-700">Unit 14 Ashbourne</td>
                    <td className="py-3 px-4 text-sm text-gray-700">John Smith</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Confirmed
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">10:00 - 18:00</td>
                    <td className="py-3 px-4 text-sm text-gray-700">Cashier</td>
                    <td className="py-3 px-4 text-sm text-gray-700">Unit 14 Ashbourne</td>
                    <td className="py-3 px-4 text-sm text-gray-700">—</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Unfilled
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">14:00 - 22:00</td>
                    <td className="py-3 px-4 text-sm text-gray-700">Manager</td>
                    <td className="py-3 px-4 text-sm text-gray-700">Unit 14 Ashbourne</td>
                    <td className="py-3 px-4 text-sm text-gray-700">Sarah Johnson</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Confirmed
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        {/* Alerts / Tasks */}
        <div>
          <SectionCard title="Alerts & Tasks">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900">3 staff missing bank details</p>
                  <p className="text-xs text-yellow-700 mt-1">Required for payroll</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-900">2 certs expiring in 14 days</p>
                  <p className="text-xs text-orange-700 mt-1">Food safety certificates</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">1 wage rate not set</p>
                  <p className="text-xs text-red-700 mt-1">Manager role needs pay rate</p>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

