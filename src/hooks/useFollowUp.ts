import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { LeadAdv } from '../types'
import { useToast } from '../contexts/ToastContext'
import { subMinutes } from 'date-fns'

function referenciaUltimaInteracao(lead: LeadAdv): string | null {
  return lead.ultima_mensagem ?? lead.inicio_atendimento
}

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
        .not('status', 'in', '(consulta_agendada,compareceu,confirmado,fechado,perdido)')
        .or(
          `ultima_mensagem.lte.${limiteUltimaMensagem},and(ultima_mensagem.is.null,inicio_atendimento.lte.${limiteUltimaMensagem})`
        )
        .order('ultima_mensagem', { ascending: true, nullsFirst: false })

      if (err) throw err

      const filtrados = (data as LeadAdv[]).filter((lead) => {
        const referencia = referenciaUltimaInteracao(lead)
        if (!referencia) return false
        return new Date(referencia) <= new Date(limiteUltimaMensagem)
      })

      filtrados.sort(
        (a, b) =>
          new Date(referenciaUltimaInteracao(a)!).getTime() -
          new Date(referenciaUltimaInteracao(b)!).getTime()
      )

      setLeads(filtrados)
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

export { referenciaUltimaInteracao }
