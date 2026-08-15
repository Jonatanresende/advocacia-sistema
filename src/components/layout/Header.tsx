import { Menu, Scale } from 'lucide-react'

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="h-[60px] bg-[var(--bg-sidebar)] border-b border-[var(--sidebar-border)] flex items-center px-4 md:hidden shrink-0 z-30 sticky top-0">
      <button
        onClick={onMenuClick}
        aria-label="Abrir menu"
        className="p-2 rounded-[8px] text-[var(--sidebar-text)] opacity-70 hover:opacity-100 hover:bg-[var(--sidebar-hover-bg)] transition-colors"
      >
        <Menu size={20} />
      </button>

      <div className="flex items-center gap-2.5 ml-3">
        <div className="w-6 h-6 rounded-[6px] bg-[var(--brand)]/20 flex items-center justify-center">
          <Scale className="text-[var(--brand)]" size={13} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[var(--sidebar-text)] text-[12.5px] font-bold tracking-tight">
            Angélica Tabosa
          </span>
          <span className="text-[var(--sidebar-muted)] text-[9.5px] uppercase tracking-wider">
            Advocacia Previdenciária
          </span>
        </div>
      </div>
    </header>
  )
}
