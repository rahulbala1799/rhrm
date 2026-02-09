'use client'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {icon && (
        <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mb-5 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 text-center max-w-sm mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium text-sm shadow-sm transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

