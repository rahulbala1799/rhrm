import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import {
  CalendarDaysIcon,
  ClockIcon,
  RectangleStackIcon,
  InboxStackIcon,
} from '@heroicons/react/24/outline'

export default function SchedulePage() {
  return (
    <div>
      <PageHeader
        title="Scheduling Hub"
        description="Manage shifts, templates, and time-off requests"
        action={
          <Link href="/schedule/week">
            <button className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 shadow-sm font-medium text-sm">
              Create Schedule
            </button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/schedule/week">
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-5 hover:shadow-md hover:ring-gray-950/10 transition-all duration-200 cursor-pointer">
            <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center mb-4 text-indigo-600">
              <CalendarDaysIcon className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Week Planner</h3>
            <p className="text-sm text-gray-600">Plan shifts for the week</p>
          </div>
        </Link>

        <Link href="/schedule/day">
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-5 hover:shadow-md hover:ring-gray-950/10 transition-all duration-200 cursor-pointer">
            <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center mb-4 text-emerald-600">
              <ClockIcon className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Day View</h3>
            <p className="text-sm text-gray-600">Today's schedule</p>
          </div>
        </Link>

        <Link href="/schedule/templates">
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-5 hover:shadow-md hover:ring-gray-950/10 transition-all duration-200 cursor-pointer">
            <div className="w-12 h-12 bg-violet-50 rounded-lg flex items-center justify-center mb-4 text-violet-600">
              <RectangleStackIcon className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Templates</h3>
            <p className="text-sm text-gray-600">Reusable shift patterns</p>
          </div>
        </Link>

        <Link href="/schedule/requests">
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-5 hover:shadow-md hover:ring-gray-950/10 transition-all duration-200 cursor-pointer relative">
            <span className="absolute top-4 right-4 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">3</span>
            <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center mb-4 text-amber-600">
              <InboxStackIcon className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Requests</h3>
            <p className="text-sm text-gray-600">Time-off & availability</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
