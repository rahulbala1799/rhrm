'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/dashboard/Sidebar'
import StaffSidebar from '@/components/dashboard/StaffSidebar'
import TopBar from '@/components/dashboard/TopBar'
import { CurrencyProvider } from './contexts/CurrencyContext'
import { LocationsProvider, type LocationRecord } from './contexts/LocationsContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [locations, setLocations] = useState<LocationRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/auth/role').then((res) => res.json()).then((data) => data.role),
      fetch('/api/settings/locations').then((res) => res.json()).then((data) => data.locations || []),
    ]).then(([roleData, locationsData]) => {
      if (!cancelled) {
        setUserRole(roleData)
        setLocations(locationsData as LocationRecord[])
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const SidebarComponent = userRole === 'staff' ? StaffSidebar : Sidebar

  return (
    <CurrencyProvider>
      <LocationsProvider initialLocations={locations}>
      <div className="flex h-screen bg-gray-50">
        <SidebarComponent isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
      </LocationsProvider>
    </CurrencyProvider>
  )
}

