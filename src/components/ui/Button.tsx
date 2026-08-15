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
        'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 rounded-[8px]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-card)]',
        'active:scale-[0.98]',
        {
          // Primary: azul-ardósia (ação principal)
          'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm':
            variant === 'primary',
          // Secondary: dourado da marca (ação de destaque secundária)
          'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] shadow-sm':
            variant === 'secondary',
          // Outline: neutro com borda
          'border border-[var(--border-card)] bg-transparent hover:bg-[var(--bg-base)] text-[var(--text-main)]':
            variant === 'outline',
          // Danger: vermelho
          'bg-[var(--danger)] text-white hover:opacity-90 shadow-sm':
            variant === 'danger',
          // Ghost: sem fundo
          'bg-transparent hover:bg-[var(--bg-base)] text-[var(--text-main)]':
            variant === 'ghost',

          'px-3 py-1.5 text-xs': size === 'sm',
          'px-4 py-2 text-sm':   size === 'md',
          'px-5 py-2.5 text-sm': size === 'lg',

          'opacity-50 cursor-not-allowed': disabled || isLoading,
        },
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="animate-spin" size={15} />}
      {!isLoading && icon && icon}
      {children}
    </button>
  )
}
