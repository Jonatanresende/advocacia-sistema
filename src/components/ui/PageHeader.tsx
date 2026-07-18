interface PageHeaderProps {
  title: string
  description?: string
}

export default function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-[28px] font-bold font-display text-[var(--text-main)] mb-2">{title}</h1>
      {description && (
        <p className="text-sm text-[var(--text-muted)] max-w-3xl">
          {description}
        </p>
      )}
    </div>
  )
}
