import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/layout/Layout'
import ProtectedRoute, { AdminRoute, RestrictedRoute } from './components/auth/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Kanban from './pages/Kanban'
import Chat from './pages/Chat'
import Leads from './pages/Leads'
import LeadDetalhe from './pages/LeadDetalhe'
import Clientes from './pages/Clientes'
import ClienteDetalhe from './pages/ClienteDetalhe'
import FollowUp from './pages/FollowUp'
import Agendamentos from './pages/Agendamentos'
import Configuracoes from './pages/Configuracoes'
import Usuarios from './pages/Usuarios'
import UsuarioDetalhe from './pages/UsuarioDetalhe'
import MeuPerfil from './pages/MeuPerfil'

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route element={<RestrictedRoute rota="/dashboard" />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                  </Route>
                  <Route element={<RestrictedRoute rota="/kanban" />}>
                    <Route path="/kanban" element={<Kanban />} />
                  </Route>
                  <Route element={<RestrictedRoute rota="/chat" />}>
                    <Route path="/chat" element={<Chat />} />
                  </Route>
                  <Route element={<RestrictedRoute rota="/leads" />}>
                    <Route path="/leads" element={<Leads />} />
                    <Route path="/leads/:id" element={<LeadDetalhe />} />
                  </Route>
                  <Route element={<RestrictedRoute rota="/clientes" />}>
                    <Route path="/clientes" element={<Clientes />} />
                    <Route path="/clientes/:id" element={<ClienteDetalhe />} />
                  </Route>
                  <Route element={<RestrictedRoute rota="/follow-up" />}>
                    <Route path="/follow-up" element={<FollowUp />} />
                  </Route>
                  <Route element={<RestrictedRoute rota="/agendamentos" />}>
                    <Route path="/agendamentos" element={<Agendamentos />} />
                  </Route>

                  {/* Sempre acessível a qualquer usuário logado, independente do papel */}
                  <Route path="/meu-perfil" element={<MeuPerfil />} />
                  
                  {/* Admin Only Routes */}
                  <Route element={<AdminRoute />}>
                    <Route path="/configuracoes" element={<Configuracoes />} />
                    <Route path="/usuarios" element={<Usuarios />} />
                    <Route path="/usuarios/novo" element={<UsuarioDetalhe />} />
                    <Route path="/usuarios/:id" element={<UsuarioDetalhe />} />
                  </Route>
                </Route>
              </Route>
              
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  )
}

