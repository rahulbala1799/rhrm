'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  MagnifyingGlassIcon,
  BellIcon,
  BuildingOffice2Icon,
  ChevronDownIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline'

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showTenantMenu, setShowTenantMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const tenantMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
      if (tenantMenuRef.current && !tenantMenuRef.current.contains(event.target as Node)) {
        setShowTenantMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6">
      {/* Left: Menu button + Search */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          aria-label="Toggle menu"
        >
          <Bars3Icon className="w-6 h-6" />
        </button>

        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search staff, shifts, locations..."
            className="block w-full pl-10 pr-3 py-2 bg-gray-100 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>
      </div>

      {/* Right: Notifications + Tenant Switcher + User Menu */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          <BellIcon className="w-6 h-6" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Tenant Switcher */}
        <div className="relative" ref={tenantMenuRef}>
          <button
            onClick={() => setShowTenantMenu(!showTenantMenu)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-sm font-medium text-gray-700"
          >
            <BuildingOffice2Icon className="w-4 h-4" />
            <span className="hidden sm:inline">Printnpack</span>
            <ChevronDownIcon className="w-4 h-4" />
          </button>
          {showTenantMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white/80 backdrop-blur-xl rounded-xl shadow-xl ring-1 ring-gray-950/5 border-0 py-1 z-50">
              <div className="px-4 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Switch Company</div>
              <div className="px-4 py-2 text-sm text-gray-500">No other companies</div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              JD
            </div>
            <ChevronDownIcon className="w-4 h-4 text-gray-600 hidden sm:block" />
          </button>
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white/80 backdrop-blur-xl rounded-xl shadow-xl ring-1 ring-gray-950/5 border-0 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-200/60">
                <p className="text-sm font-medium text-gray-900">John Doe</p>
                <p className="text-xs text-gray-500">john@example.com</p>
              </div>
              <Link
                href="/me/profile"
                className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg mx-1"
                onClick={() => setShowUserMenu(false)}
              >
                My Profile
              </Link>
              <Link
                href="/me/shifts"
                className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg mx-1"
                onClick={() => setShowUserMenu(false)}
              >
                My Shifts
              </Link>
              <div className="border-t border-gray-200/60 mt-1 pt-1">
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-50 rounded-lg mx-1"
                  >
                    Sign Out
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
