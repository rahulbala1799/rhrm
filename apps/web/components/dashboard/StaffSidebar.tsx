'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  ClockIcon,
  CalendarDaysIcon,
  UserCircleIcon,
  DocumentCheckIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  badge?: number | string
}

interface NavSection {
  title: string
  items: NavItem[]
}

const staffNavSections: NavSection[] = [
  {
    title: 'My Work',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: HomeIcon },
      { label: 'My Shifts', href: '/me/shifts', icon: ClockIcon },
      { label: 'My Availability', href: '/me/availability', icon: CalendarDaysIcon },
    ],
  },
  {
    title: 'My Profile',
    items: [
      { label: 'Profile', href: '/me/profile', icon: UserCircleIcon },
      { label: 'My Compliance', href: '/compliance', icon: DocumentCheckIcon },
    ],
  },
]

export default function StaffSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-gray-950 text-gray-300
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <UsersIcon className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-semibold text-[15px] text-white tracking-tight">HR Staff</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3">
          <div className="px-3 space-y-5">
            {staffNavSections.map((section) => (
              <div key={section.title}>
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  {section.title}
                </h3>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => onClose()}
                        className={`
                          flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                          transition-colors
                          ${
                            isActive
                              ? 'bg-indigo-500/15 text-indigo-300'
                              : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                          }
                        `}
                      >
                        <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-indigo-400' : ''}`} />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-red-500/20 text-red-400 rounded-full px-1">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Role Badge */}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300">
              Staff Member
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}
