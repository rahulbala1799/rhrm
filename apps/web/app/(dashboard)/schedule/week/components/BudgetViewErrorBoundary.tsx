'use client'

import React from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface BudgetViewErrorBoundaryProps {
  children: React.ReactNode
}

interface BudgetViewErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export default class BudgetViewErrorBoundary extends React.Component<
  BudgetViewErrorBoundaryProps,
  BudgetViewErrorBoundaryState
> {
  constructor(props: BudgetViewErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): BudgetViewErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error monitoring service
    console.error('Budget view error:', error, errorInfo)
    if (typeof window !== 'undefined' && (window as any).logError) {
      ;(window as any).logError('Budget view calculation error', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="budget-error-fallback p-4 bg-yellow-50 border border-yellow-200 rounded-lg m-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <p className="font-medium">Budget calculations unavailable</p>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            There was an error calculating budget information. The planner will continue to work normally.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 px-3 py-1.5 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

