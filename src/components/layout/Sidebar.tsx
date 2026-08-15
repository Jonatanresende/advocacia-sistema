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
  User,
} from 'lucide-react'
import clsx from 'clsx'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'

/* ── Grupos de navegação ─────────────────────────────────────────── */
const navGroups = [
  {
    label: 'Visão Geral',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Atendimento',
    items: [
      { to: '/kanban',  icon: Kanban,         label: 'Kanban' },
      { to: '/chat',    icon: MessageSquare,   label: 'Chat' },
      { to: '/leads',   icon: Users,           label: 'Leads' },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { to: '/clientes',      icon: UserCheck,   label: 'Clientes' },
      { to: '/agendamentos',  icon: CalendarDays, label: 'Agendamentos' },
      { to: '/follow-up',     icon: Bell,        label: 'Follow Up' },
    ],
  },
]

const adminItems = [
  { to: '/usuarios',      icon: UserCog,   label: 'Usuários' },
  { to: '/configuracoes', icon: Settings,  label: 'Configurações' },
]

interface SidebarProps {
  className?: string
  onNavigate?: () => void
}

function NavItem({
  to,
  icon: Icon,
  label,
  onNavigate,
}: {
  to: string
  icon: React.ElementType
  label: string
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        clsx(
          'group relative flex items-center gap-3 px-3 py-2 rounded-[8px] transition-all duration-150',
          'text-[13px] font-medium',
          isActive
            ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)] font-semibold'
            : 'text-[var(--sidebar-text)] opacity-75 hover:opacity-100 hover:bg-[var(--sidebar-hover-bg)]'
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Indicador lateral (dourado de marca) */}
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[var(--brand)] rounded-r-full" />
          )}
          <Icon
            size={16}
            className={clsx(
              'shrink-0 transition-transform duration-150',
              'group-hover:translate-x-0.5'
            )}
          />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ className, onNavigate }: SidebarProps) {
  const { theme, toggleTheme } = useTheme()
  const { perfil, isAdmin, permissoes, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const isVisible = (to: string) => {
    if (isAdmin) return true
    return permissoes.includes(to)
  }

  return (
    <aside
      className={clsx(
        'w-[236px] shrink-0 h-full bg-[var(--bg-sidebar)] flex flex-col transition-colors z-40',
        'border-r border-[var(--sidebar-border)]',
        className
      )}
    >
      {/* Logo */}
      <div className="h-[60px] flex items-center px-5 gap-3 shrink-0 border-b border-[var(--sidebar-border)]">
        <div className="w-8 h-8 rounded-[8px] bg-[var(--brand)]/15 flex items-center justify-center shrink-0">
          <Scale className="text-[var(--brand)]" size={16} />
        </div>
        <div className="flex flex-col leading-tight overflow-hidden">
          <span className="text-[var(--sidebar-text)] text-[12.5px] font-bold truncate tracking-tight">
            Angélica Tabosa
          </span>
          <span className="text-[var(--sidebar-muted)] text-[10px] font-medium uppercase tracking-wider truncate">
            Advocacia Previdenciária
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 flex flex-col gap-4">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => isVisible(item.to))
          if (visibleItems.length === 0) return null

          return (
            <div key={group.label} className="flex flex-col gap-0.5">
              <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--sidebar-section)]">
                {group.label}
              </p>
              {visibleItems.map((item) => (
                <NavItem
                  key={item.to}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )
        })}

        {/* Admin: Sistema */}
        {isAdmin && (
          <div className="flex flex-col gap-0.5">
            <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--sidebar-section)]">
              Sistema
            </p>
            {adminItems.map((item) => (
              <NavItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-2.5 border-t border-[var(--sidebar-border)] flex flex-col gap-1">
        {/* Perfil */}
        <NavLink
          to="/meu-perfil"
          onClick={onNavigate}
          className={({ isActive }) =>
            clsx(
              'w-full flex items-center gap-3 px-3 py-2 rounded-[8px] transition-all duration-150 text-[13px] font-medium',
              isActive
                ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)]'
                : 'text-[var(--sidebar-text)] opacity-75 hover:opacity-100 hover:bg-[var(--sidebar-hover-bg)]'
            )
          }
        >
          <div className="w-7 h-7 rounded-full bg-[var(--brand)]/20 text-[var(--brand)] flex items-center justify-center shrink-0 text-[11px] font-bold">
            {perfil?.nome ? perfil.nome[0].toUpperCase() : <User size={13} />}
          </div>
          <div className="flex flex-col overflow-hidden text-left">
            <span className="truncate text-[12.5px] text-[var(--sidebar-text)] font-semibold">{perfil?.nome || 'Meu Perfil'}</span>
            <span className="text-[10px] text-[var(--sidebar-muted)] uppercase tracking-wider">
              {perfil?.role || 'Usuário'}
            </span>
          </div>
        </NavLink>

        <div className="h-px bg-[var(--sidebar-border)] my-0.5 mx-2" />

        {/* Toggle tema */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-[8px] text-[var(--sidebar-text)] opacity-70 hover:opacity-100 hover:bg-[var(--sidebar-hover-bg)] transition-all duration-150 text-[13px] font-medium"
        >
          {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
          <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
        </button>

        {/* Sair */}
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-[8px] text-[var(--sidebar-text)] opacity-70 hover:opacity-100 hover:bg-[var(--sidebar-hover-bg)] transition-all duration-150 text-[13px] font-medium"
        >
          <LogOut size={15} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}
