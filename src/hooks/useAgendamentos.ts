import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { AgendamentoAdv, DateFilter, AgendamentoStatus } from '../types'
import { useToast } from '../contexts/ToastContext'
import { format, subDays, startOfMonth, subMonths, endOfMonth, startOfYear } from 'date-fns'

export function useAgendamentos(filter?: DateFilter) {
  const [agendamentos, setAgendamentos] = useState<AgendamentoAdv[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { error } = useToast()

  const fetchAgendamentos = useCallback(async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('agendamentos_adv')
        .select('*, lead:leads_adv(*), advogado:advogados(*)')
        .order('data_hora_inicio', { ascending: false })

      if (filter) {
        const today = new Date()
        let startStr = ''
        let endStr = ''

        switch (filter.preset) {
          case 'hoje':
            startStr = format(today, 'yyyy-MM-dd')
            endStr = format(today, 'yyyy-MM-dd')
            break
          case 'ontem':
            startStr = format(subDays(today, 1), 'yyyy-MM-dd')
            endStr = format(subDays(today, 1), 'yyyy-MM-dd')
            break
          case 'ultimos_7_dias':
            startStr = format(subDays(today, 7), 'yyyy-MM-dd')
            endStr = format(today, 'yyyy-MM-dd')
            break
          case 'ultimos_14_dias':
            startStr = format(subDays(today, 14), 'yyyy-MM-dd')
            endStr = format(today, 'yyyy-MM-dd')
            break
          case 'este_mes':
            startStr = format(startOfMonth(today), 'yyyy-MM-dd')
            endStr = format(today, 'yyyy-MM-dd')
            break
          case 'mes_passado':
            startStr = format(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd')
            endStr = format(endOfMonth(subMonths(today, 1)), 'yyyy-MM-dd')
            break
          case 'este_ano':
            startStr = format(startOfYear(today), 'yyyy-MM-dd')
            endStr = format(today, 'yyyy-MM-dd')
            break
          case 'personalizado':
            startStr = filter.startDate
            endStr = filter.endDate
            break
        }

        if (startStr && endStr) {
          query = query.gte('data_hora_inicio', `${startStr}T00:00:00`)
          query = query.lte('data_hora_inicio', `${endStr}T23:59:59.999`)
        }
      }

      const { data, error: err } = await query

      if (err) throw err

      setAgendamentos(data as AgendamentoAdv[])
    } catch (err: unknown) {
      console.error(err)
      error('Erro ao buscar agendamentos')
    } finally {
      setIsLoading(false)
    }
  }, [filter?.preset, filter?.startDate, filter?.endDate, error])

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
