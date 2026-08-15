interface PageHeaderProps {
  title: string
  description?: string
}

export default function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-6 pb-5 border-b border-[var(--border-card)]">
      <h1 className="text-[28px] font-extrabold font-display text-[var(--text-main)] leading-tight tracking-tight mb-1">
        {title}
      </h1>
      {description && (
        <p className="text-[13.5px] text-[var(--text-muted)] max-w-2xl leading-relaxed">
          {description}
        </p>
      )}
    </div>
  )
}
