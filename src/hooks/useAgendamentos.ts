import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { AgendamentoAdv, AgendamentoStatus } from '../types'
import { useToast } from '../contexts/ToastContext'

export function useAgendamentos() {
  const [agendamentos, setAgendamentos] = useState<AgendamentoAdv[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { error } = useToast()

  const fetchAgendamentos = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('agendamentos_adv')
        .select('*, lead:leads_adv(*), advogado:advogados(*)')
        .order('data_hora_inicio', { ascending: false })

      if (err) throw err

      setAgendamentos(data as AgendamentoAdv[])
    } catch (err: unknown) {
      console.error(err)
      error('Erro ao buscar agendamentos')
    } finally {
      setIsLoading(false)
    }
  }, [error])

  useEffect(() => {
    fetchAgendamentos()
  }, [fetchAgendamentos])

  const updateStatus = async (id: string, status: AgendamentoStatus) => {
    try {
      const { error: err } = await supabase.from('agendamentos_adv').update({ status }).eq('id', id)
      if (err) throw err
      await fetchAgendamentos()
      return true
    } catch (err) {
      console.error(err)
      error('Erro ao atualizar agendamento')
      return false
    }
  }

  return { agendamentos, isLoading, refetch: fetchAgendamentos, updateStatus }
}
