import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import type { UserRole } from '../types'

export interface UsuarioCompleto {
  id: string
  nome: string
  role: UserRole
  ativo: boolean
  avatar_url: string | null
  telefone: string | null
  advogado_id: string | null
  email: string
  created_at: string
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/criar-usuario`
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

async function getHeaders(contentType = false): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ? `Bearer ${session.access_token}` : ''
  return {
    'Authorization': token,
    'apikey': ANON_KEY,
    ...(contentType ? { 'Content-Type': 'application/json' } : {}),
  }
}

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioCompleto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { success, error } = useToast()

  const fetchUsuarios = useCallback(async () => {
    setIsLoading(true)
    try {
      const headers = await getHeaders()
      const res = await fetch(FUNCTION_URL, { method: 'GET', headers })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsuarios(data as UsuarioCompleto[])
    } catch (err) {
      console.error(err)
      error('Erro ao carregar usuários')
    } finally {
      setIsLoading(false)
    }
  }, [error])

  useEffect(() => {
    fetchUsuarios()
  }, [fetchUsuarios])

  const criarUsuario = async (dados: {
    nome: string
    email: string
    senha: string
    role: 'advogado' | 'funcionario'
    telefone?: string
    advogado_id?: string
    criar_cadastro_advogado?: boolean
    cor?: string
  }) => {
    try {
      const headers = await getHeaders(true)
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(dados),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      success('Usuário criado com sucesso!')
      await fetchUsuarios()
      return { error: null, user_id: data.user_id }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar usuário'
      error(msg)
      return { error: msg, user_id: null }
    }
  }

  const atualizarUsuario = async (
    id: string,
    dados: {
      nome?: string
      role?: string
      ativo?: boolean
      telefone?: string | null
      advogado_id?: string | null
      senha?: string
    }
  ) => {
    try {
      const headers = await getHeaders(true)
      const res = await fetch(FUNCTION_URL, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id, ...dados }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      success('Usuário atualizado!')
      await fetchUsuarios()
      return { error: null }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar usuário'
      error(msg)
      return { error: msg }
    }
  }

  const toggleAtivo = async (id: string, ativo: boolean) => {
    return atualizarUsuario(id, { ativo })
  }

  const excluirUsuario = async (id: string) => {
    try {
      const headers = await getHeaders(false)
      const res = await fetch(`${FUNCTION_URL}?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      success('Usuário excluído com sucesso!')
      await fetchUsuarios()
      return { error: null }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir usuário'
      error(msg)
      return { error: msg }
    }
  }

  return {
    usuarios,
    isLoading,
    refetch: fetchUsuarios,
    criarUsuario,
    atualizarUsuario,
    toggleAtivo,
    excluirUsuario,
  }
}
