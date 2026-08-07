import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Users, UserCog, Search, Pencil, Shield, Briefcase, User, Trash2 } from 'lucide-react'
import { useUsuarios, type UsuarioCompleto } from '../hooks/useUsuarios'
import type { UserRole } from '../types'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  advogado: 'Advogado',
  funcionario: 'Funcionário',
}

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  advogado: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  funcionario: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
}

const ROLE_ICONS: Record<UserRole, React.ElementType> = {
  admin: Shield,
  advogado: Briefcase,
  funcionario: User,
}

function getInitials(nome: string) {
  return nome
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function AvatarCircle({ nome, role }: { nome: string; role: UserRole }) {
  const colors: Record<UserRole, string> = {
    admin: 'from-purple-600 to-purple-400',
    advogado: 'from-blue-600 to-blue-400',
    funcionario: 'from-amber-600 to-amber-400',
  }
  return (
    <div
      className={`w-10 h-10 rounded-full bg-gradient-to-br ${colors[role]} flex items-center justify-center text-white font-bold text-[13px] shrink-0 shadow-lg`}
    >
      {getInitials(nome)}
    </div>
  )
}

function ToggleAtivo({
  id,
  ativo,
  onToggle,
  disabled,
}: {
  id: string
  ativo: boolean
  onToggle: (id: string, ativo: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle(id, !ativo)
      }}
      disabled={disabled}
      title={ativo ? 'Desativar usuário' : 'Ativar usuário'}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
        ativo ? 'bg-[var(--accent)]' : 'bg-white/10'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md transition-transform ${
          ativo ? 'translate-x-4.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

export default function Usuarios() {
  const navigate = useNavigate()
  const { usuarios, isLoading, toggleAtivo, excluirUsuario } = useUsuarios()
  const [tab, setTab] = useState<'advogado' | 'funcionario'>('advogado')
  const [search, setSearch] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = usuarios.filter((u) => {
    if (u.role === 'admin') return false
    if (u.role !== tab) return false
    if (!search) return true
    const q = search.toLowerCase()
    return u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  const advogadoCount = usuarios.filter((u) => u.role === 'advogado').length
  const funcionarioCount = usuarios.filter((u) => u.role === 'funcionario').length

  const handleToggle = async (id: string, ativo: boolean) => {
    setTogglingId(id)
    await toggleAtivo(id, ativo)
    setTogglingId(null)
  }

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir permanentemente o usuário "${nome}"? Esta ação removerá o acesso dele e não pode ser desfeita.`)) {
      return
    }
    setDeletingId(id)
    await excluirUsuario(id)
    setDeletingId(null)
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-base)] overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 bg-[var(--bg-card)] border-b border-[var(--border-card)] shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-semibold text-[var(--text-main)] tracking-tight">
              Usuários do Sistema
            </h1>
            <p className="text-[var(--text-muted)] text-sm mt-1">
              Gerencie o acesso de advogados e funcionários ao CRM.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/usuarios/novo')}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white rounded-[10px] text-[13px] font-semibold transition-all shadow-lg shadow-[var(--accent)]/20 hover:shadow-[var(--accent)]/40 hover:-translate-y-0.5"
          >
            <UserPlus size={16} />
            Novo Usuário
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-5">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Briefcase size={14} className="text-blue-400" />
            <span className="text-[12px] font-semibold text-blue-400">{advogadoCount} Advogado{advogadoCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <User size={14} className="text-amber-400" />
            <span className="text-[12px] font-semibold text-amber-400">{funcionarioCount} Funcionário{funcionarioCount !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-5 bg-[var(--bg-base)] p-1 rounded-[10px] w-fit">
          {(['advogado', 'funcionario'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setTab(r)}
              className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] font-semibold transition-all ${
                tab === r
                  ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {r === 'advogado' ? <Briefcase size={14} /> : <Users size={14} />}
              {ROLE_LABELS[r]}s
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Search */}
        <div className="relative mb-5 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder={`Buscar ${tab === 'advogado' ? 'advogado' : 'funcionário'}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[var(--bg-card)] border border-[var(--border-card)] rounded-[10px] text-[13px] text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-[var(--bg-card)] border border-[var(--border-card)] rounded-[14px] flex items-center justify-center mb-4">
              <UserCog size={22} className="text-[var(--text-muted)]" />
            </div>
            <p className="text-[var(--text-main)] font-semibold text-[15px] font-display">
              Nenhum {tab === 'advogado' ? 'advogado' : 'funcionário'} cadastrado
            </p>
            <p className="text-[var(--text-muted)] text-[13px] mt-1">
              Clique em "Novo Usuário" para adicionar.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((usuario) => (
              <UsuarioCard
                key={usuario.id}
                usuario={usuario}
                onEdit={() => navigate(`/usuarios/${usuario.id}`)}
                onToggle={handleToggle}
                isToggling={togglingId === usuario.id}
                onDelete={() => handleDelete(usuario.id, usuario.nome)}
                isDeleting={deletingId === usuario.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function UsuarioCard({
  usuario,
  onEdit,
  onToggle,
  isToggling,
  onDelete,
  isDeleting,
}: {
  usuario: UsuarioCompleto
  onEdit: () => void
  onToggle: (id: string, ativo: boolean) => void
  isToggling: boolean
  onDelete: () => void
  isDeleting: boolean
}) {
  const RoleIcon = ROLE_ICONS[usuario.role]

  return (
    <div
      className={`flex items-center gap-4 p-4 bg-[var(--bg-card)] border border-[var(--border-card)] rounded-[14px] transition-all hover:border-[var(--accent)]/30 hover:shadow-lg hover:shadow-black/20 group ${
        !usuario.ativo ? 'opacity-50' : ''
      }`}
    >
      <AvatarCircle nome={usuario.nome} role={usuario.role} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[var(--text-main)] font-semibold text-[14px] font-display truncate">
            {usuario.nome}
          </p>
          {!usuario.ativo && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 font-semibold">
              Inativo
            </span>
          )}
        </div>
        <p className="text-[var(--text-muted)] text-[12px] mt-0.5 truncate">{usuario.email}</p>
        {usuario.telefone && (
          <p className="text-[var(--text-muted)] text-[12px] mt-0.5">{usuario.telefone}</p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span
          className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${ROLE_COLORS[usuario.role]}`}
        >
          <RoleIcon size={11} />
          {ROLE_LABELS[usuario.role]}
        </span>

        <ToggleAtivo
          id={usuario.id}
          ativo={usuario.ativo}
          onToggle={onToggle}
          disabled={isToggling}
        />

        <button
          type="button"
          onClick={onEdit}
          disabled={isDeleting}
          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-30"
          title="Editar usuário"
        >
          <Pencil size={15} />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          disabled={isDeleting}
          className="p-2 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-30"
          title="Excluir usuário permanentemente"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}
