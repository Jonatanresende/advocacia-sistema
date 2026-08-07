import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import {
  User,
  Mail,
  Phone,
  Shield,
  Save,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  Briefcase,
  UserCheck,
} from 'lucide-react'
import type { UserRole } from '../types'

const ROLE_INFO: Record<UserRole, { label: string; icon: React.ElementType; color: string }> = {
  admin: {
    label: 'Administrador',
    icon: Shield,
    color: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
  },
  advogado: {
    label: 'Advogado',
    icon: Briefcase,
    color: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  },
  funcionario: {
    label: 'Funcionário',
    icon: UserCheck,
    color: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
  },
}

function getInitials(nome: string) {
  return nome
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export default function MeuPerfil() {
  const { user, perfil, role } = useAuth()
  const { success, error } = useToast()

  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [isSavingPerfil, setIsSavingPerfil] = useState(false)

  // Password change
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [showNovaSenha, setShowNovaSenha] = useState(false)
  const [isSavingSenha, setIsSavingSenha] = useState(false)
  const [senhaSucesso, setSenhaSucesso] = useState(false)

  useEffect(() => {
    if (perfil) {
      setNome(perfil.nome)
      setTelefone(perfil.telefone || '')
    }
  }, [perfil])

  const handleSavePerfil = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      error('O nome não pode ficar em branco')
      return
    }
    setIsSavingPerfil(true)
    try {
      const { error: err } = await supabase
        .from('perfis')
        .update({ nome: nome.trim(), telefone: telefone || null })
        .eq('id', user!.id)

      if (err) throw err
      success('Perfil atualizado com sucesso!')
    } catch (err) {
      console.error(err)
      error('Erro ao salvar perfil')
    } finally {
      setIsSavingPerfil(false)
    }
  }

  const handleSaveSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaSenha || !confirmarSenha) {
      error('Preencha a nova senha e a confirmação')
      return
    }
    if (novaSenha !== confirmarSenha) {
      error('As senhas não coincidem')
      return
    }
    if (novaSenha.length < 8) {
      error('A senha deve ter pelo menos 8 caracteres')
      return
    }
    setIsSavingSenha(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password: novaSenha })
      if (err) throw err
      setSenhaSucesso(true)
      setNovaSenha('')
      setConfirmarSenha('')
      success('Senha alterada com sucesso!')
      setTimeout(() => setSenhaSucesso(false), 3000)
    } catch (err) {
      console.error(err)
      error('Erro ao alterar senha')
    } finally {
      setIsSavingSenha(false)
    }
  }

  const roleInfo = role ? ROLE_INFO[role] : null
  const RoleIcon = roleInfo?.icon || User

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-base)] overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 bg-[var(--bg-card)] border-b border-[var(--border-card)] shrink-0">
        <h1 className="text-2xl font-display font-semibold text-[var(--text-main)] tracking-tight">
          Meu Perfil
        </h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Gerencie suas informações pessoais e segurança da conta.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl space-y-6">

          {/* Avatar + Info card */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-[14px] p-6">
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-blue-500 flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-[var(--accent)]/30">
                  {perfil?.nome ? getInitials(perfil.nome) : <User size={28} />}
                </div>
                {/* Online dot */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-[var(--bg-card)]" />
              </div>

              <div className="flex-1">
                <p className="text-xl font-display font-bold text-[var(--text-main)]">
                  {perfil?.nome || 'Usuário'}
                </p>
                <p className="text-[var(--text-muted)] text-[13px] mt-0.5">{user?.email}</p>
                {roleInfo && (
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border mt-2 ${roleInfo.color}`}
                  >
                    <RoleIcon size={11} />
                    {roleInfo.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Dados Pessoais */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-[14px] p-6">
            <h2 className="text-[15px] font-display font-semibold text-[var(--text-main)] mb-5 flex items-center gap-2">
              <User size={16} className="text-[var(--accent)]" />
              Dados Pessoais
            </h2>
            <form onSubmit={handleSavePerfil} className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Nome de Exibição *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-[var(--bg-base)] border border-[var(--border-card)] rounded-[10px] text-[var(--text-main)] text-[14px] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
                />
              </div>

              {/* Email (readonly) */}
              <div>
                <label className="block text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  E-mail
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full pl-9 pr-3 py-2.5 bg-[var(--bg-base)] border border-[var(--border-card)] rounded-[10px] text-[var(--text-muted)] text-[14px] opacity-60 cursor-not-allowed"
                  />
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">O e-mail não pode ser alterado.</p>
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Telefone
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="tel"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full pl-9 pr-3 py-2.5 bg-[var(--bg-base)] border border-[var(--border-card)] rounded-[10px] text-[var(--text-main)] text-[14px] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingPerfil}
                className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white rounded-[10px] text-[13px] font-semibold transition-all shadow-lg shadow-[var(--accent)]/20 disabled:opacity-50"
              >
                {isSavingPerfil ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Save size={15} />
                )}
                Salvar Perfil
              </button>
            </form>
          </div>

          {/* Alterar Senha */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-[14px] p-6">
            <h2 className="text-[15px] font-display font-semibold text-[var(--text-main)] mb-1 flex items-center gap-2">
              <KeyRound size={16} className="text-[var(--accent)]" />
              Alterar Senha
            </h2>
            <p className="text-[12px] text-[var(--text-muted)] mb-5">
              Escolha uma senha forte com pelo menos 8 caracteres.
            </p>

            <form onSubmit={handleSaveSenha} className="space-y-4">
              {/* Nova Senha */}
              <div>
                <label className="block text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Nova Senha *
                </label>
                <div className="relative">
                  <input
                    type={showNovaSenha ? 'text' : 'password'}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    minLength={8}
                    className="w-full px-3 pr-10 py-2.5 bg-[var(--bg-base)] border border-[var(--border-card)] rounded-[10px] text-[var(--text-main)] text-[14px] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNovaSenha(!showNovaSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                  >
                    {showNovaSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirmar Senha */}
              <div>
                <label className="block text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Confirmar Nova Senha *
                </label>
                <div className="relative">
                  <input
                    type={showSenha ? 'text' : 'password'}
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full px-3 pr-10 py-2.5 bg-[var(--bg-base)] border border-[var(--border-card)] rounded-[10px] text-[var(--text-main)] text-[14px] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha(!showSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                  >
                    {showSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {novaSenha && confirmarSenha && novaSenha !== confirmarSenha && (
                  <p className="text-[11px] text-red-400 mt-1">As senhas não coincidem</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSavingSenha || senhaSucesso}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all shadow-lg disabled:opacity-50 ${
                  senhaSucesso
                    ? 'bg-green-500 text-white shadow-green-500/20'
                    : 'bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white shadow-[var(--accent)]/20'
                }`}
              >
                {isSavingSenha ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : senhaSucesso ? (
                  <CheckCircle2 size={15} />
                ) : (
                  <KeyRound size={15} />
                )}
                {senhaSucesso ? 'Senha Alterada!' : 'Alterar Senha'}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  )
}
