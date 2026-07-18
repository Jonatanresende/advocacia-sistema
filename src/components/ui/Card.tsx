import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  noPadding?: boolean
}

export default function Card({ children, className, noPadding = false }: CardProps) {
  return (
    <div
      className={[
        'bg-[var(--bg-card)] border border-[var(--border-card)] rounded-card shadow-sm overflow-hidden',
        !noPadding ? 'p-4 sm:p-6' : '',
        className || ''
      ].join(' ')}
    >
      {children}
    </div>
  )
}
