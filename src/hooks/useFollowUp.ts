import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { LeadAdv } from '../types'
import { useToast } from '../contexts/ToastContext'

export function useFollowUp() {
  const [leads, setLeads] = useState<LeadAdv[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { error } = useToast()

  const fetchLeads = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('leads_adv')
        .select('*')
        .gte('minutos_ultima_mensagem', 20)
        .neq('status', 'consulta_agendada')
        .neq('status', 'compareceu')
        .order('minutos_ultima_mensagem', { ascending: false })

      if (err) throw err

      setLeads(data as LeadAdv[])
    } catch (err: unknown) {
      console.error(err)
      error('Erro ao buscar follow ups')
    } finally {
      setIsLoading(false)
    }
  }, [error])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  return { leads, isLoading, refetch: fetchLeads }
}
