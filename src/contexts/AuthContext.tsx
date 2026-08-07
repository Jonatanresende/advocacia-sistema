import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Perfil, UserRole } from '../types'

interface AuthContextType {
  session: Session | null
  user: User | null
  perfil: Perfil | null
  role: UserRole | null
  isLoading: boolean
  isAdmin: boolean
  isAdvogado: boolean
  isFuncionario: boolean
  permissoes: string[]
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [permissoes, setPermissoes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadUserData = async (currentUser: User | null) => {
    if (!currentUser) {
      setPerfil(null)
      setPermissoes([])
      setIsLoading(false)
      return
    }

    try {
      // Load perfil
      const { data: perfilData, error: perfilError } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', currentUser.id)
        .single()

      if (perfilError) throw perfilError
      const currentPerfil = perfilData as Perfil
      setPerfil(currentPerfil)

      // Load permissoes se não for admin
      if (currentPerfil.role !== 'admin') {
        const { data: permData, error: permError } = await supabase
          .from('permissoes_role')
          .select('rota')
          .eq('role', currentPerfil.role)
          .eq('ativo', true)
        
        if (permError) throw permError
        setPermissoes(permData.map(p => p.rota))
      } else {
        setPermissoes([]) // Admin tem acesso a tudo
      }
    } catch (err) {
      console.error('Erro ao carregar dados do usuário:', err)
      setPerfil(null)
      setPermissoes([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setUser(data.session?.user ?? null)
      if (data.session?.user) {
        loadUserData(data.session.user)
      } else {
        setIsLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      
      if (nextSession?.user) {
        setIsLoading(true)
        loadUserData(nextSession.user)
      } else {
        setPerfil(null)
        setPermissoes([])
        setIsLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (error.message.toLowerCase().includes('invalid login')) {
        return { error: 'E-mail ou senha incorretos' }
      }
      return { error: error.message }
    }
    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const role = perfil?.role ?? null
  const isAdmin = role === 'admin'
  const isAdvogado = role === 'advogado'
  const isFuncionario = role === 'funcionario'

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        perfil,
        role,
        isLoading,
        isAdmin,
        isAdvogado,
        isFuncionario,
        permissoes,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
