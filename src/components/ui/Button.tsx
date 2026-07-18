import type { ButtonHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  icon?: ReactNode
}

export default function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading,
  icon,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2',
        {
          'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]': variant === 'primary',
          'bg-[var(--accent)] text-white hover:opacity-90': variant === 'secondary',
          'border border-[var(--border-card)] bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-main)]': variant === 'outline',
          'bg-[var(--danger)] text-white hover:opacity-90': variant === 'danger',
          'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-main)]': variant === 'ghost',
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-6 py-3 text-base': size === 'lg',
          'opacity-50 cursor-not-allowed': disabled || isLoading,
        },
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="animate-spin" size={16} />}
      {!isLoading && icon && icon}
      {children}
    </button>
  )
}
