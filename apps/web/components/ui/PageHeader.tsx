interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  breadcrumbs?: Array<{ label: string; href?: string }>
}

export default function PageHeader({ title, description, action, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-4">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="flex items-center">
                {index > 0 && (
                  <svg className="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                {crumb.href ? (
                  <a href={crumb.href} className="hover:text-gray-700">
                    {crumb.label}
                  </a>
                ) : (
                  <span className={index === breadcrumbs.length - 1 ? 'text-gray-900 font-medium' : ''}>
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {description && <p className="mt-2 text-sm text-gray-600">{description}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  )
}


