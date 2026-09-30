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
      if (status === 'cancelado') {
        // Quando cancela, usa a edge function para remover do Google Calendar
        // e resetar o lead no Kanban
        const { data: res, error: err } = await supabase.functions.invoke('criar-agendamento', {
          body: {
            action: 'cancelar_agendamento',
            agendamento_id: id,
          },
        })

        if (err) throw err

        if (res?.google_sync_warning) {
          error('Agendamento cancelado, mas houve erro ao remover do Google Calendar: ' + res.google_sync_warning)
        }
      } else {
        const { error: err } = await supabase.from('agendamentos_adv').update({ status }).eq('id', id)
        if (err) throw err
      }
      await fetchAgendamentos()
      return true
    } catch (err) {
      console.error(err)
      error('Erro ao atualizar agendamento')
      return false
    }
  }

  const updateAgendamento = async (
    id: string,
    fields: { data_hora_inicio?: string; data_hora_fim?: string; duracao_minutos?: number; modalidade?: string; observacoes?: string | null; advogado_id?: string }
  ) => {
    try {
      const { data: res, error: err } = await supabase.functions.invoke('criar-agendamento', {
        body: {
          action: 'editar_agendamento',
          agendamento_id: id,
          ...fields,
        },
      })

      if (err) throw err

      if (res?.google_sync_warning) {
        error('Agendamento atualizado, mas houve erro ao sincronizar com Google Calendar: ' + res.google_sync_warning)
      }

      await fetchAgendamentos()
      return true
    } catch (err) {
      console.error(err)
      error('Erro ao editar agendamento')
      return false
    }
  }

  const deleteAgendamento = async (id: string) => {
    try {
      const { data: res, error: err } = await supabase.functions.invoke('criar-agendamento', {
        body: {
          action: 'excluir_agendamento',
          agendamento_id: id,
        },
      })

      if (err) throw err

      if (res?.google_sync_warning) {
        error('Agendamento excluído, mas houve erro ao remover do Google Calendar: ' + res.google_sync_warning)
      }

      await fetchAgendamentos()
      return true
    } catch (err) {
      console.error(err)
      error('Erro ao excluir agendamento')
      return false
    }
  }

  return { agendamentos, isLoading, refetch: fetchAgendamentos, updateStatus, updateAgendamento, deleteAgendamento }
}
