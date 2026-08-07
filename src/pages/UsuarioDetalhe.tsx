import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  User,
  Mail,
  Phone,
  Shield,
  Briefcase,
  UserCheck,
  KeyRound,
  Trash2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useUsuarios } from '../hooks/useUsuarios'
import type { Advogado } from '../types'
import { useToast } from '../contexts/ToastContext'

type Role = 'advogado' | 'funcionario'

const ROLE_OPTIONS: { value: Role; label: string; icon: React.ElementType; desc: string }[] = [
  {
    value: 'advogado',
    label: 'Advogado',
    icon: Briefcase,
    desc: 'Acessa seus próprios leads e agendamentos',
  },
  {
    value: 'funcionario',
    label: 'Funcionário',
    icon: UserCheck,
    desc: 'Acesso configurável pelo administrador',
  },
]

const PRESET_COLORS = [
  { value: '#3b82f6', label: 'Azul', class: 'bg-blue-500' },
  { value: '#10b981', label: 'Verde', class: 'bg-emerald-500' },
  { value: '#8b5cf6', label: 'Roxo', class: 'bg-purple-500' },
  { value: '#f59e0b', label: 'Laranja', class: 'bg-amber-500' },
  { value: '#ef4444', label: 'Vermelho', class: 'bg-red-500' },
  { value: '#ec4899', label: 'Rosa', class: 'bg-pink-500' },
  { value: '#14b8a6', label: 'Ciano', class: 'bg-teal-500' },
]

export default function UsuarioDetalhe() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'novo'

  const { usuarios, criarUsuario, atualizarUsuario, excluirUsuario, isLoading: isLoadingUsuarios } = useUsuarios()
  const { error: toastError } = useToast()

  const [advogados, setAdvogados] = useState<Advogado[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [showSenha, setShowSenha] = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)

  // Form state
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [role, setRole] = useState<Role>('advogado')
  const [advogadoId, setAdvogadoId] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [ativo, setAtivo] = useState(true)
  
  // Auto-create lawyer option
  const [criarCadastroAdvogado, setCriarCadastroAdvogado] = useState(true)
  const [advogadoCor, setAdvogadoCor] = useState('#3b82f6')

  const usuario = !isNew ? usuarios.find((u) => u.id === id) : null

  // Load advogados (from advogados table for linking)
  useEffect(() => {
    supabase
      .from('advogados')
      .select('*')
      .eq('ativo', true)
      .then(({ data }) => {
        if (data) setAdvogados(data as Advogado[])
      })
  }, [])

  // Populate form on edit
  useEffect(() => {
    if (usuario) {
      setNome(usuario.nome)
      setEmail(usuario.email)
      setTelefone(usuario.telefone || '')
      setRole(usuario.role as Role)
      setAdvogadoId(usuario.advogado_id || '')
      setAtivo(usuario.ativo)
    }
  }, [usuario])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isNew && !senha) {
      toastError('Defina uma senha para o novo usuário')
      return
    }
    if (senha && senha !== confirmarSenha) {
      toastError('As senhas não coincidem')
      return
    }
    if (!nome || !email || !role) {
      toastError('Preencha todos os campos obrigatórios')
      return
    }

    setIsSaving(true)
    try {
      if (isNew) {
        const { error: err } = await criarUsuario({
          nome,
          email,
          senha,
          role,
          telefone: telefone || undefined,
          advogado_id: (!criarCadastroAdvogado && advogadoId) ? advogadoId : undefined,
          criar_cadastro_advogado: role === 'advogado' ? criarCadastroAdvogado : undefined,
          cor: role === 'advogado' && criarCadastroAdvogado ? advogadoCor : undefined,
        })
        if (!err) navigate('/usuarios')
      } else if (id) {
        const { error: err } = await atualizarUsuario(id, {
          nome,
          role,
          ativo,
          telefone: telefone || null,
          advogado_id: advogadoId || null,
          ...(senha ? { senha } : {}),
        })
        if (!err) navigate('/usuarios')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id || id === 'novo') return
    if (!confirm(`Tem certeza que deseja excluir permanentemente o usuário "${nome}"? Esta ação removerá o acesso dele e não pode ser desfeita.`)) {
      return
    }
    setIsSaving(true)
    try {
      const { error: err } = await excluirUsuario(id)
      if (!err) navigate('/usuarios')
    } finally {
      setIsSaving(false)
    }
  }

  const pageTitle = isNew ? 'Novo Usuário' : usuario?.nome || 'Editar Usuário'

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-base)] overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 bg-[var(--bg-card)] border-b border-[var(--border-card)] shrink-0">
        <button
          type="button"
          onClick={() => navigate('/usuarios')}
          className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-main)] text-[13px] font-medium mb-4 transition-colors"
        >
          <ArrowLeft size={15} />
          Voltar para Usuários
        </button>
        <h1 className="text-2xl font-display font-semibold text-[var(--text-main)] tracking-tight">
          {pageTitle}
        </h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          {isNew ? 'Crie um novo acesso ao sistema.' : 'Edite os dados e permissões do usuário.'}
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-8">
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">

          {/* Dados Pessoais */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-[14px] p-6">
            <h2 className="text-[15px] font-display font-semibold text-[var(--text-main)] mb-5 flex items-center gap-2">
              <User size={16} className="text-[var(--accent)]" />
              Dados Pessoais
            </h2>
            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Dr. João Silva"
                  required
                  className="w-full px-3 py-2.5 bg-[var(--bg-base)] border border-[var(--border-card)] rounded-[10px] text-[var(--text-main)] text-[14px] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  E-mail *
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@escritorio.com"
                    required
                    disabled={!isNew}
                    className="w-full pl-9 pr-3 py-2.5 bg-[var(--bg-base)] border border-[var(--border-card)] rounded-[10px] text-[var(--text-main)] text-[14px] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                {!isNew && (
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">O e-mail não pode ser alterado.</p>
                )}
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
            </div>
          </div>

          {/* Papel */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-[14px] p-6">
            <h2 className="text-[15px] font-display font-semibold text-[var(--text-main)] mb-5 flex items-center gap-2">
              <Shield size={16} className="text-[var(--accent)]" />
              Papel no Sistema
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {ROLE_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const isSelected = role === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value)}
                    className={`flex flex-col items-start gap-2 p-4 rounded-[12px] border-2 text-left transition-all ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                        : 'border-[var(--border-card)] hover:border-[var(--accent)]/30'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-[var(--accent)]/20' : 'bg-white/5'}`}>
                      <Icon size={16} className={isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
                    </div>
                    <div>
                      <p className={`text-[13px] font-semibold ${isSelected ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
                        {opt.label}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Vincular/Criar advogado */}
            {role === 'advogado' && (
              <div className="mt-5 border-t border-[var(--border-card)] pt-5 flex flex-col gap-4">
                {isNew ? (
                  <>
                    <div className="flex flex-col gap-2">
                      <label className="block text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        Vínculo com a Agenda
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-[13px] text-[var(--text-main)] cursor-pointer">
                          <input
                            type="radio"
                            name="vincular_agenda"
                            checked={criarCadastroAdvogado}
                            onChange={() => setCriarCadastroAdvogado(true)}
                            className="accent-[var(--accent)]"
                          />
                          Criar novo cadastro automaticamente
                        </label>
                        {advogados.length > 0 && (
                          <label className="flex items-center gap-2 text-[13px] text-[var(--text-main)] cursor-pointer">
                            <input
                              type="radio"
                              name="vincular_agenda"
                              checked={!criarCadastroAdvogado}
                              onChange={() => setCriarCadastroAdvogado(false)}
                              className="accent-[var(--accent)]"
                            />
                            Vincular a um existente
                          </label>
                        )}
                      </div>
                    </div>

                    {criarCadastroAdvogado ? (
                      <div>
                        <label className="block text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                          Cor no Calendário / Agenda
                        </label>
                        <div className="flex flex-wrap gap-2.5">
                          {PRESET_COLORS.map((c) => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setAdvogadoCor(c.value)}
                              className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${c.class} ${
                                advogadoCor === c.value
                                  ? 'border-[var(--text-main)] scale-110 shadow-lg'
                                  : 'border-transparent hover:scale-105'
                              }`}
                              title={c.label}
                            >
                              {advogadoCor === c.value && (
                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                              )}
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-2">
                          Essa cor será usada para identificar os agendamentos deste advogado no calendário.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                          Selecionar Advogado
                        </label>
                        <select
                          value={advogadoId}
                          onChange={(e) => setAdvogadoId(e.target.value)}
                          className="w-full px-3 py-2.5 bg-[var(--bg-base)] border border-[var(--border-card)] rounded-[10px] text-[var(--text-main)] text-[14px] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
                        >
                          <option value="">— Selecionar advogado cadastrado —</option>
                          {advogados.map((adv) => (
                            <option key={adv.id} value={adv.id}>
                              {adv.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <label className="block text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                      Vincular ao Cadastro de Advogado
                    </label>
                    <select
                      value={advogadoId}
                      onChange={(e) => setAdvogadoId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[var(--bg-base)] border border-[var(--border-card)] rounded-[10px] text-[var(--text-main)] text-[14px] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
                    >
                      <option value="">— Selecionar advogado cadastrado —</option>
                      {advogados.map((adv) => (
                        <option key={adv.id} value={adv.id}>
                          {adv.nome}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      Vincula este login ao cadastro de advogado (cor, disponibilidade de horários).
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Senha */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-[14px] p-6">
            <h2 className="text-[15px] font-display font-semibold text-[var(--text-main)] mb-1 flex items-center gap-2">
              <KeyRound size={16} className="text-[var(--accent)]" />
              {isNew ? 'Senha de Acesso' : 'Redefinir Senha'}
            </h2>
            {!isNew && (
              <p className="text-[12px] text-[var(--text-muted)] mb-4">
                Deixe em branco para manter a senha atual.
              </p>
            )}
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  {isNew ? 'Senha *' : 'Nova Senha'}
                </label>
                <div className="relative">
                  <input
                    type={showSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required={isNew}
                    minLength={8}
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
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Confirmar Senha {isNew && '*'}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmar ? 'text' : 'password'}
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="Repita a senha"
                    required={isNew || !!senha}
                    className="w-full px-3 pr-10 py-2.5 bg-[var(--bg-base)] border border-[var(--border-card)] rounded-[10px] text-[var(--text-main)] text-[14px] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmar(!showConfirmar)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                  >
                    {showConfirmar ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {senha && confirmarSenha && senha !== confirmarSenha && (
                  <p className="text-[11px] text-red-400 mt-1">As senhas não coincidem</p>
                )}
              </div>
            </div>
          </div>

          {/* Status (apenas em edição) */}
          {!isNew && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-[14px] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-semibold text-[var(--text-main)]">Status da conta</p>
                  <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                    Usuários inativos não conseguem fazer login no sistema.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAtivo(!ativo)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    ativo ? 'bg-[var(--accent)]' : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                      ativo ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className={`text-[12px] font-semibold mt-3 ${ativo ? 'text-green-400' : 'text-red-400'}`}>
                {ativo ? '● Conta Ativa' : '○ Conta Inativa'}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving || isLoadingUsuarios}
              className="flex items-center gap-2 px-6 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white rounded-[10px] text-[13px] font-semibold transition-all shadow-lg shadow-[var(--accent)]/20 hover:shadow-[var(--accent)]/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Save size={15} />
              )}
              {isNew ? 'Criar Usuário' : 'Salvar Alterações'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/usuarios')}
              className="px-6 py-2.5 border border-[var(--border-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-muted)] rounded-[10px] text-[13px] font-semibold transition-all"
            >
              Cancelar
            </button>
            {!isNew && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSaving || isLoadingUsuarios}
                className="flex items-center gap-2 px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-[10px] text-[13px] font-semibold transition-all ml-auto"
              >
                <Trash2 size={15} />
                Excluir Usuário
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
