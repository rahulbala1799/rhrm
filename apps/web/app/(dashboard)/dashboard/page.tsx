import { redirect } from 'next/navigation'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import StatCard from '@/components/ui/StatCard'
import SectionCard from '@/components/ui/SectionCard'
import {
  CalendarDaysIcon,
  UserPlusIcon,
  EnvelopeIcon,
  MapPinIcon,
  ClockIcon,
  ExclamationCircleIcon,
  UsersIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'

export default async function DashboardPage() {
  const { role } = await getTenantContext()

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { href: '/schedule/week', icon: CalendarDaysIcon, label: 'Create Schedule', sub: 'Plan shifts', color: 'bg-indigo-50 text-indigo-600' },
          { href: '/staff/new', icon: UserPlusIcon, label: 'Add Staff', sub: 'New team member', color: 'bg-emerald-50 text-emerald-600' },
          { href: '/settings/invitations', icon: EnvelopeIcon, label: 'Invite Team', sub: 'Send invitations', color: 'bg-violet-50 text-violet-600' },
          { href: '/settings/locations', icon: MapPinIcon, label: 'Add Location', sub: 'New workplace', color: 'bg-amber-50 text-amber-600' },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <div className="group bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-4 hover:shadow-md hover:ring-gray-950/10 transition-all duration-200 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{item.label}</p>
                  <p className="text-[13px] text-gray-500">{item.sub}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Today Snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard title="Shifts Today" value={12} iconColor="bg-indigo-50 text-indigo-600" icon={<ClockIcon className="w-5 h-5" />} />
        <StatCard title="Unfilled Shifts" value={3} iconColor="bg-red-50 text-red-600" icon={<ExclamationCircleIcon className="w-5 h-5" />} />
        <StatCard title="People On Leave" value={2} iconColor="bg-amber-50 text-amber-600" icon={<UsersIcon className="w-5 h-5" />} />
        <StatCard title="Expiring Docs" value={2} iconColor="bg-orange-50 text-orange-600" icon={<DocumentTextIcon className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schedule Preview */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Today's Schedule"
            noPadding
            action={
              <Link href="/schedule/week" className="text-[13px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                View Week Planner →
              </Link>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2.5 px-5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Time</th>
                    <th className="text-left py-2.5 px-5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                    <th className="text-left py-2.5 px-5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Location</th>
                    <th className="text-left py-2.5 px-5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Staff</th>
                    <th className="text-left py-2.5 px-5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { time: '09:00 - 17:00', role: 'Sales Associate', loc: 'Unit 14 Ashbourne', staff: 'John Smith', status: 'Confirmed', statusColor: 'bg-emerald-50 text-emerald-700' },
                    { time: '10:00 - 18:00', role: 'Cashier', loc: 'Unit 14 Ashbourne', staff: null, status: 'Unfilled', statusColor: 'bg-red-50 text-red-700' },
                    { time: '14:00 - 22:00', role: 'Manager', loc: 'Unit 14 Ashbourne', staff: 'Sarah Johnson', status: 'Confirmed', statusColor: 'bg-emerald-50 text-emerald-700' },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-5 text-sm font-medium text-gray-900">{row.time}</td>
                      <td className="py-3 px-5 text-sm text-gray-600">{row.role}</td>
                      <td className="py-3 px-5 text-sm text-gray-600">{row.loc}</td>
                      <td className="py-3 px-5 text-sm text-gray-600">{row.staff ?? <span className="text-gray-400">—</span>}</td>
                      <td className="py-3 px-5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${row.statusColor}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        {/* Alerts */}
        <div>
          <SectionCard title="Alerts & Tasks">
            <div className="space-y-2.5">
              {[
                { icon: '!', bg: 'bg-amber-500', title: '3 staff missing bank details', sub: 'Required for payroll' },
                { icon: '!', bg: 'bg-orange-500', title: '2 certs expiring in 14 days', sub: 'Food safety certificates' },
                { icon: '!', bg: 'bg-red-500', title: '1 wage rate not set', sub: 'Manager role needs pay rate' },
              ].map((alert, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100/80 transition-colors">
                  <div className={`w-6 h-6 rounded-full ${alert.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <span className="text-white text-xs font-bold">{alert.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{alert.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
