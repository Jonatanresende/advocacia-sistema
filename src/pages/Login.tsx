import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Scale, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function Login() {
  const { session, isLoading, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--bg-base)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
      </div>
    )
  }

  if (session) {
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await signIn(email.trim(), password)
      if (result.error) {
        setError(result.error)
        return
      }
      navigate(from, { replace: true })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[var(--bg-base)]">

      {/* ── Painel hero (esquerdo) ─────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-[var(--bg-sidebar)] px-14 py-14 relative overflow-hidden border-r border-[var(--sidebar-border)]">
        {/* Gradients decorativos */}
        <div
          className="absolute inset-0 opacity-[0.08] dark:opacity-[0.12] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 25%, var(--brand) 0%, transparent 50%), radial-gradient(circle at 85% 75%, #3B82F6 0%, transparent 45%)',
          }}
        />

        {/* Logotipo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-[var(--brand)]/20 flex items-center justify-center">
            <Scale className="text-[var(--brand)]" size={20} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[var(--text-main)] text-[13.5px] font-bold tracking-tight">Angélica Tabosa</span>
            <span className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-semibold">Advocacia Previdenciária</span>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 max-w-sm">
          <h1 className="font-display text-[40px] font-extrabold leading-[1.1] text-[var(--text-main)] mb-5 tracking-tight">
            Gestão completa do seu escritório
          </h1>
          <p className="text-[var(--text-muted)] text-[15px] leading-relaxed mb-8">
            Leads, clientes, agendamentos e automações com IA — tudo em um só lugar.
          </p>

          {/* Features pills */}
          <div className="flex flex-col gap-2.5">
            {[
              'Funil de atendimento com Kanban',
              'Chat integrado com WhatsApp',
              'Agente de IA 24/7',
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[var(--brand)]/20 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand)]" />
                </div>
                <span className="text-[var(--text-muted)] text-[13px] font-medium">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <div className="relative z-10 flex items-center gap-2 text-[var(--text-muted)] opacity-80 text-[11px]">
          <ShieldCheck size={13} />
          <span>Acesso restrito a usuários autorizados</span>
        </div>
      </div>

      {/* ── Painel de login (direito) ──────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-[400px]">

          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-9 h-9 rounded-[9px] bg-[var(--brand)]/15 flex items-center justify-center">
              <Scale className="text-[var(--brand)]" size={18} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[var(--text-main)] text-[13px] font-bold">Angélica Tabosa</span>
              <span className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-semibold">Advocacia Previdenciária</span>
            </div>
          </div>

          {/* Card do formulário */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-[16px] p-7 sm:p-8" style={{ boxShadow: 'var(--shadow-elevated)' }}>
            <div className="mb-6">
              <h2 className="font-display text-[24px] font-extrabold text-[var(--text-main)] mb-1 tracking-tight">
                Bem-vindo de volta
              </h2>
              <p className="text-[13.5px] text-[var(--text-muted)]">
                Use o e-mail e a senha da sua conta
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="E-mail"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />

              <div className="relative">
                <Input
                  label="Senha"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-[34px] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && (
                <div className="rounded-[8px] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3.5 py-2.5 text-[13px] text-[var(--danger-text)]">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full mt-1" size="lg" isLoading={isSubmitting}>
                Entrar no sistema
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
