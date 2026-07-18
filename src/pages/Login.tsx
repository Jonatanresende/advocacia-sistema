import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Scale, Eye, EyeOff } from 'lucide-react'
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
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
      <div className="hidden lg:flex lg:w-[42%] flex-col justify-between bg-[var(--bg-sidebar)] px-12 py-14 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #C9A84C 0%, transparent 45%), radial-gradient(circle at 80% 80%, #C9A84C 0%, transparent 40%)',
          }}
        />
        <div className="relative z-10 flex items-center gap-3">
          <Scale className="text-[var(--accent)]" size={28} />
          <span className="text-[var(--sidebar-text)] font-display text-sm font-semibold tracking-wide uppercase">
            Escritório de Advocacia
          </span>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="font-display text-4xl leading-tight text-[var(--sidebar-text)] mb-4">
            Gestão completa do seu escritório
          </h1>
          <p className="text-[var(--sidebar-muted)] text-base leading-relaxed">
            Acesse leads, clientes, agendamentos e configurações em um só lugar.
          </p>
        </div>
        <p className="relative z-10 text-xs text-[var(--sidebar-muted)]">
          Acesso restrito a usuários autorizados
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <Scale className="text-[var(--accent)]" size={24} />
            <span className="font-display text-sm font-semibold tracking-wide uppercase text-[var(--text-main)]">
              Escritório de Advocacia
            </span>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-[12px] shadow-sm p-6 sm:p-8">
            <h2 className="font-display text-2xl text-[var(--text-main)] mb-1">Entrar</h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              Use o e-mail e a senha do administrador
            </p>

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
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && (
                <div className="rounded-[8px] border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full mt-2" size="lg" isLoading={isSubmitting}>
                Entrar no sistema
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
