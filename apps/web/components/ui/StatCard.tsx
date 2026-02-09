'use client'

interface StatCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  iconColor?: string
  trend?: {
    value: string
    isPositive: boolean
  }
  onClick?: () => void
}

export default function StatCard({ title, value, icon, iconColor, trend, onClick }: StatCardProps) {
  const Component = onClick ? 'button' : 'div'
  const colorClass = iconColor || 'bg-indigo-50 text-indigo-600'

  return (
    <Component
      onClick={onClick}
      className={`
        bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 p-5
        ${onClick ? 'cursor-pointer hover:shadow-md hover:ring-gray-950/10 transition-all duration-200' : ''}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 tracking-tight truncate">{value}</p>
          {trend && (
            <p className={`text-xs font-medium mt-1.5 ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              {trend.isPositive ? '\u2191' : '\u2193'} {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
            {icon}
          </div>
        )}
      </div>
    </Component>
  )
}

