import { NavLink, useNavigate } from 'react-router-dom'
import {
  Scale,
  LayoutDashboard,
  Kanban,
  MessageSquare,
  Users,
  UserCheck,
  Bell,
  CalendarDays,
  Settings,
  Sun,
  Moon,
  LogOut,
  UserCog,
  User
} from 'lucide-react'
import clsx from 'clsx'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/kanban', icon: Kanban, label: 'Kanban' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/leads', icon: Users, label: 'Leads' },
  { to: '/clientes', icon: UserCheck, label: 'Clientes' },
  { to: '/follow-up', icon: Bell, label: 'Follow Up' },
  { to: '/agendamentos', icon: CalendarDays, label: 'Agendamentos' },
]

interface SidebarProps {
  className?: string
  onNavigate?: () => void
}

export default function Sidebar({ className, onNavigate }: SidebarProps) {
  const { theme, toggleTheme } = useTheme()
  const { perfil, isAdmin, permissoes, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const visibleItems = navItems.filter((item) => {
    if (isAdmin) return true
    return permissoes.includes(item.to)
  })

  return (
    <aside
      className={clsx(
        'w-[240px] shrink-0 h-full bg-[#182635] border-r border-white/5 flex flex-col transition-colors z-40',
        className
      )}
    >
      <div className="h-16 flex items-center px-5 gap-3 shrink-0 border-b border-white/5">
        <Scale className="text-[var(--accent)] shrink-0" size={22} />
        <span className="text-white font-display text-sm font-semibold tracking-wide uppercase leading-tight">
          Escritório de Advocacia
        </span>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto flex flex-col gap-1 px-3">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              clsx(
                'relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-medium text-[13px]',
                isActive
                  ? 'bg-white/5 text-white'
                  : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[var(--accent)] rounded-r-full" />
                )}
                <item.icon size={18} className="shrink-0" />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="h-px bg-white/5 my-2 mx-2" />
            <NavLink
              to="/usuarios"
              onClick={onNavigate}
              className={({ isActive }) =>
                clsx(
                  'relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-medium text-[13px]',
                  isActive
                    ? 'bg-white/5 text-white'
                    : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[var(--accent)] rounded-r-full" />
                  )}
                  <UserCog size={18} className="shrink-0" />
                  <span>Usuários</span>
                </>
              )}
            </NavLink>
            <NavLink
              to="/configuracoes"
              onClick={onNavigate}
              className={({ isActive }) =>
                clsx(
                  'relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-medium text-[13px]',
                  isActive
                    ? 'bg-white/5 text-white'
                    : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[var(--accent)] rounded-r-full" />
                  )}
                  <Settings size={18} className="shrink-0" />
                  <span>Configurações</span>
                </>
              )}
            </NavLink>
          </>
        )}
      </nav>

      <div className="p-3 mt-auto border-t border-white/5 flex flex-col gap-1">
        <NavLink
          to="/meu-perfil"
          onClick={onNavigate}
          className={({ isActive }) =>
            clsx(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-[13px] font-medium',
              isActive
                ? 'bg-white/5 text-white'
                : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
            )
          }
        >
          <User size={18} className="shrink-0" />
          <div className="flex flex-col overflow-hidden text-left">
            <span className="truncate">{perfil?.nome || 'Meu Perfil'}</span>
            <span className="text-[10px] opacity-60 uppercase tracking-wider">{perfil?.role || 'Usuário'}</span>
          </div>
        </NavLink>

        <div className="h-px bg-white/5 my-1 mx-2" />

        <button
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#94A3B8] hover:bg-white/5 hover:text-white transition-colors text-[13px] font-medium"
        >
          {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#94A3B8] hover:bg-white/5 hover:text-white transition-colors text-[13px] font-medium"
        >
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}
