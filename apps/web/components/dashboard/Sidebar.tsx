'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  HomeIcon,
  CalendarDaysIcon,
  CalendarIcon,
  ClockIcon,
  RectangleStackIcon,
  InboxStackIcon,
  UsersIcon,
  UserPlusIcon,
  EnvelopeOpenIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  TagIcon,
  ShieldCheckIcon,
  DocumentCheckIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
  BuildingOffice2Icon,
  MapPinIcon,
  SwatchIcon,
  BriefcaseIcon,
  LockClosedIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  UserCircleIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  badge?: number | string
}

interface NavSection {
  id: string
  title: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    id: 'scheduling',
    title: 'Scheduling',
    icon: CalendarDaysIcon,
    items: [
      { label: 'Schedule Hub', href: '/schedule', icon: CalendarDaysIcon },
      { label: 'Week Planner', href: '/schedule/week', icon: CalendarIcon },
      { label: 'Day View', href: '/schedule/day', icon: ClockIcon },
      { label: 'Templates', href: '/schedule/templates', icon: RectangleStackIcon },
      { label: 'Requests', href: '/schedule/requests', icon: InboxStackIcon, badge: 3 },
    ],
  },
  {
    id: 'people',
    title: 'People',
    icon: UsersIcon,
    items: [
      { label: 'Staff List', href: '/staff', icon: UsersIcon },
      { label: 'Invite Staff', href: '/settings/invitations', icon: EnvelopeOpenIcon },
      { label: 'Add Staff', href: '/staff/new', icon: UserPlusIcon },
    ],
  },
  {
    id: 'payroll',
    title: 'Payroll',
    icon: CurrencyDollarIcon,
    items: [
      { label: 'Dashboard', href: '/payroll', icon: CurrencyDollarIcon },
      { label: 'Pay Runs', href: '/payroll/runs', icon: DocumentTextIcon },
      { label: 'Exports', href: '/payroll/exports', icon: ArrowDownTrayIcon },
      { label: 'Pay Rates', href: '/payroll/rates', icon: TagIcon },
    ],
  },
  {
    id: 'compliance',
    title: 'Compliance',
    icon: ShieldCheckIcon,
    items: [
      { label: 'Overview', href: '/compliance', icon: ShieldCheckIcon },
      { label: 'Right to Work', href: '/compliance/right-to-work', icon: DocumentCheckIcon },
      { label: 'Certifications', href: '/compliance/certifications', icon: AcademicCapIcon },
      { label: 'Expiries', href: '/compliance/expiries', icon: ExclamationTriangleIcon, badge: 2 },
      { label: 'Contract', href: '/compliance/contract', icon: DocumentTextIcon },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: Cog6ToothIcon,
    items: [
      { label: 'Company', href: '/settings/company', icon: BuildingOffice2Icon },
      { label: 'Pay Period', href: '/settings/pay', icon: CalendarIcon },
      { label: 'Locations', href: '/settings/locations', icon: MapPinIcon },
      { label: 'Job Roles', href: '/settings/job-roles', icon: SwatchIcon },
      { label: 'Roles', href: '/settings/roles', icon: BriefcaseIcon },
      { label: 'Compliance Docs', href: '/settings/compliance-documents', icon: DocumentCheckIcon },
      { label: 'Review Submissions', href: '/settings/compliance-documents/review', icon: ShieldCheckIcon },
      { label: 'Permissions', href: '/settings/permissions', icon: LockClosedIcon },
      { label: 'Invitations', href: '/settings/invitations', icon: EnvelopeOpenIcon },
      { label: 'Audit Log', href: '/settings/audit', icon: ClipboardDocumentListIcon },
      { label: 'Billing', href: '/settings/billing', icon: CreditCardIcon },
    ],
  },
]

const STORAGE_KEY = 'sidebar-collapsed-sections'

function loadCollapsedSections(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function saveCollapsedSections(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setCollapsed(loadCollapsedSections())
  }, [])

  const toggleSection = (sectionId: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [sectionId]: !prev[sectionId] }
      saveCollapsedSections(next)
      return next
    })
  }

  useEffect(() => {
    if (!pathname) return
    const activeSection = navSections.find((section) =>
      section.items.some((item) => pathname === item.href || pathname?.startsWith(item.href + '/'))
    )
    if (activeSection && collapsed[activeSection.id]) {
      setCollapsed((prev) => {
        const next = { ...prev, [activeSection.id]: false }
        saveCollapsedSections(next)
        return next
      })
    }
  }, [pathname])

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-gray-950 text-gray-300
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        <div className="h-16 flex items-center px-5 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <UsersIcon className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-semibold text-[15px] text-white tracking-tight">HR Staff</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
          <div className="px-3 mb-1">
            <Link
              href="/dashboard"
              onClick={() => onClose()}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${
                  pathname === '/dashboard'
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }
              `}
            >
              <HomeIcon className="w-5 h-5 shrink-0" />
              <span>Dashboard</span>
            </Link>
          </div>

          <div className="px-3 mt-2 space-y-0.5">
            {navSections.map((section) => {
              const isExpanded = !collapsed[section.id]
              const sectionHasActive = section.items.some(
                (item) => pathname === item.href || pathname?.startsWith(item.href + '/')
              )
              const SectionIcon = section.icon

              return (
                <div key={section.id}>
                  <button
                    onClick={() => toggleSection(section.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider
                      transition-colors select-none
                      ${sectionHasActive ? 'text-gray-200' : 'text-gray-500 hover:text-gray-300'}
                    `}
                  >
                    <SectionIcon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left">{section.title}</span>
                    <ChevronRightIcon
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-200 ease-in-out ${
                      isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="ml-3 pl-4 border-l border-white/10 space-y-0.5 py-0.5">
                      {section.items.map((item) => {
                        const isActive =
                          pathname === item.href || pathname?.startsWith(item.href + '/')
                        const Icon = item.icon

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => onClose()}
                            className={`
                              flex items-center gap-3 px-3 py-1.5 rounded-md text-[13px] font-medium
                              transition-colors
                              ${
                                isActive
                                  ? 'bg-indigo-500/15 text-indigo-300 border-l-2 border-indigo-400 -ml-[1px] pl-[11px]'
                                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                              }
                            `}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="flex-1 truncate">{item.label}</span>
                            {item.badge != null && (
                              <span className="min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-red-500/20 text-red-400 rounded-full px-1">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </nav>

        <div className="border-t border-white/10 p-3">
          <Link
            href="/me/profile"
            onClick={() => onClose()}
            className={`
              flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                pathname === '/me/profile' || pathname?.startsWith('/me/profile/')
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }
            `}
          >
            <UserCircleIcon className="w-5 h-5 shrink-0" />
            <span>My Profile</span>
          </Link>
        </div>
      </aside>
    </>
  )
}
