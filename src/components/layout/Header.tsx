import { Menu } from 'lucide-react'

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="h-16 bg-[var(--bg-card)] border-b border-[var(--border-card)] flex items-center px-4 md:hidden shrink-0 z-30 sticky top-0">
      <button
        onClick={onMenuClick}
        className="p-2 rounded-[8px] hover:bg-[var(--bg-base)] text-[var(--text-main)] transition-colors"
      >
        <Menu size={24} />
      </button>
      <span className="ml-3 font-display font-semibold text-[var(--text-main)]">
        Sistema Advocacia
      </span>
    </header>
  )
}
