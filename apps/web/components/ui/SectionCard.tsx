interface SectionCardProps {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  noPadding?: boolean
}

export default function SectionCard({ title, description, action, children, noPadding }: SectionCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-950/5 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
          {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className={noPadding ? '' : 'p-5'}>
        {children}
      </div>
    </div>
  )
}




