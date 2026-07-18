import { NavLink, useNavigate } from 'react-router-dom'
import {
  Scale,
  LayoutDashboard,
  Kanban,
  Users,
  UserCheck,
  Bell,
  CalendarDays,
  Settings,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react'
import clsx from 'clsx'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/kanban', icon: Kanban, label: 'Kanban' },
  { to: '/leads', icon: Users, label: 'Leads' },
  { to: '/clientes', icon: UserCheck, label: 'Clientes' },
  { to: '/follow-up', icon: Bell, label: 'Follow Up' },
  { to: '/agendamentos', icon: CalendarDays, label: 'Agendamentos' },
  { to: '/configuracoes', icon: Settings, label: 'Configurações' },
]

interface SidebarProps {
  className?: string
  onNavigate?: () => void
}

export default function Sidebar({ className, onNavigate }: SidebarProps) {
  const { theme, toggleTheme } = useTheme()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <aside
      className={clsx(
        'w-[240px] shrink-0 h-full bg-[var(--bg-sidebar)] border-r border-[var(--sidebar-border)] flex flex-col transition-colors z-40',
        className
      )}
    >
      <div className="h-16 flex items-center px-6 gap-3 shrink-0 border-b border-[var(--sidebar-border)]">
        <Scale className="text-[var(--accent)] shrink-0" size={24} />
        <span className="text-[var(--sidebar-text)] font-display text-sm font-semibold tracking-wide uppercase leading-tight">
          Escritório de Advocacia
        </span>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto flex flex-col gap-1 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-[8px] transition-all group font-medium text-sm',
                isActive
                  ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-text)] border-l-[3px] border-[var(--accent)]'
                  : 'text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-active)] hover:text-[var(--sidebar-text)] border-l-[3px] border-transparent'
              )
            }
          >
            <item.icon size={18} className="shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-[var(--sidebar-border)] flex flex-col gap-1">
        {user?.email && (
          <p className="px-3 py-1.5 text-xs text-[var(--sidebar-muted)] truncate" title={user.email}>
            {user.email}
          </p>
        )}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-[8px] text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-active)] hover:text-[var(--sidebar-text)] transition-colors text-sm font-medium"
        >
          <span className="flex items-center gap-3">
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </span>
        </button>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-active)] hover:text-[var(--sidebar-text)] transition-colors text-sm font-medium"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  )
}
