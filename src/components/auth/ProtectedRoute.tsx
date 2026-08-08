import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function ProtectedRoute() {
  const { session, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--bg-base)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export function AdminRoute() {
  const { session, isLoading, isAdmin } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--bg-base)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

/**
 * Bloqueia o acesso direto por URL a rotas que o papel do usuário não tem
 * permissão de ver, usando a mesma fonte de verdade (tabela `permissoes_role`,
 * carregada no AuthContext) que já esconde os itens correspondentes no Sidebar.
 * Admin sempre passa. Use `rota` com o mesmo valor cadastrado em `permissoes_role.rota`
 * (o caminho "base", sem parâmetros — ex: '/clientes' também cobre '/clientes/:id').
 */
export function RestrictedRoute({ rota }: { rota: string }) {
  const { session, isLoading, isAdmin, permissoes } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--bg-base)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!isAdmin && !permissoes.includes(rota)) {
    // Evita loop de redirecionamento: manda pra primeira rota que o usuário
    // realmente tem permissão de ver, em vez de sempre '/dashboard' (que pode
    // estar bloqueada pra esse papel também).
    const destino = permissoes[0] ?? '/meu-perfil'
    return <Navigate to={destino} replace />
  }

  return <Outlet />
}

