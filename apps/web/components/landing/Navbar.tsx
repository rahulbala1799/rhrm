'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  UsersIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id: string) => {
    setMobileOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-200/60'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <UsersIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900 tracking-tight">
              HR Staff
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => scrollTo('features')}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100/80 transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollTo('demo')}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100/80 transition-colors"
            >
              Demo
            </button>
            <button
              onClick={() => scrollTo('dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100/80 transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => scrollTo('pricing')}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100/80 transition-colors"
            >
              Pricing
            </button>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-all shadow-sm hover:shadow-md"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {mobileOpen ? (
              <XMarkIcon className="w-6 h-6 text-gray-700" />
            ) : (
              <Bars3Icon className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-gray-200/60">
          <div className="px-4 py-4 space-y-1">
            <button
              onClick={() => scrollTo('features')}
              className="block w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              Features
            </button>
            <button
              onClick={() => scrollTo('demo')}
              className="block w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              Demo
            </button>
            <button
              onClick={() => scrollTo('dashboard')}
              className="block w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              Dashboard
            </button>
            <button
              onClick={() => scrollTo('pricing')}
              className="block w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              Pricing
            </button>
            <div className="pt-3 border-t border-gray-200 flex flex-col gap-2">
              <Link
                href="/login"
                className="block text-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="block text-center px-4 py-3 text-sm font-semibold text-white bg-gray-900 rounded-xl hover:bg-gray-800"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
