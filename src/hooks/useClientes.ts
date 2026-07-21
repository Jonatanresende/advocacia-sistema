import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { ClienteAdv } from '../types'
import { useToast } from '../contexts/ToastContext'

export function useClientes() {
  const [clientes, setClientes] = useState<ClienteAdv[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { error } = useToast()

  const fetchClientes = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('clientes_adv')
        .select('*, lead:leads_adv!inner(*)')
        .eq('lead.status', 'compareceu')
        .order('created_at', { ascending: false })

      if (err) throw err

      setClientes(data as ClienteAdv[])
    } catch (err: unknown) {
      console.error(err)
      error('Erro ao buscar clientes')
    } finally {
      setIsLoading(false)
    }
  }, [error])

  useEffect(() => {
    fetchClientes()
  }, [fetchClientes])

  return { clientes, isLoading, refetch: fetchClientes }
}
