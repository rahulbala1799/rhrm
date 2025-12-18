'use client'

interface BudgetViewToggleProps {
  isActive: boolean
  onToggle: (active: boolean) => void
}

export default function BudgetViewToggle({
  isActive,
  onToggle,
}: BudgetViewToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <span
        id="budget-view-description"
        className="sr-only"
      >
        {isActive
          ? 'Budget view is active. Showing shift costs and totals.'
          : 'Budget view is inactive. Click to show shift costs and totals.'}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={isActive}
        aria-label="Toggle budget view"
        aria-describedby="budget-view-description"
        onClick={() => onToggle(!isActive)}
        className={`${
          isActive ? 'bg-blue-600' : 'bg-gray-200'
        } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
      >
        <span
          className={`${
            isActive ? 'translate-x-6' : 'translate-x-1'
          } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
        />
      </button>
      <label
        htmlFor="budget-view-toggle"
        className="text-sm font-medium text-gray-700 cursor-pointer"
        onClick={() => onToggle(!isActive)}
      >
        Budget View
      </label>
    </div>
  )
}

