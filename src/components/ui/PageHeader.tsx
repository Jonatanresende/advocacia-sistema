import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-6 pb-5 border-b border-[var(--border-card)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-extrabold font-display text-[var(--text-main)] leading-tight tracking-tight mb-1">
          {title}
        </h1>
        {description && (
          <p className="text-[13.5px] text-[var(--text-muted)] max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
