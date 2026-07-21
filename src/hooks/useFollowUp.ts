import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { LeadAdv } from '../types'
import { useToast } from '../contexts/ToastContext'
import { subMinutes } from 'date-fns'

export function useFollowUp() {
  const [leads, setLeads] = useState<LeadAdv[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { error } = useToast()

  const fetchLeads = useCallback(async () => {
    setIsLoading(true)
    try {
      const limiteUltimaMensagem = subMinutes(new Date(), 20).toISOString()

      const { data, error: err } = await supabase
        .from('leads_adv')
        .select('*')
        .not('ultima_mensagem', 'is', null)
        .lte('ultima_mensagem', limiteUltimaMensagem)
        .neq('status', 'consulta_agendada')
        .neq('status', 'compareceu')
        .order('ultima_mensagem', { ascending: true })

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
