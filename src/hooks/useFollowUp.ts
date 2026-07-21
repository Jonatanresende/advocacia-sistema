import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { LeadAdv, DateFilter } from '../types'
import { useToast } from '../contexts/ToastContext'
import { format, subDays, startOfMonth, subMonths, endOfMonth, startOfYear } from 'date-fns'

export function useFollowUp(filter?: DateFilter) {
  const [leads, setLeads] = useState<LeadAdv[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { error } = useToast()

  const fetchLeads = useCallback(async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('leads_adv')
        .select('*')
        .gte('minutos_ultima_mensagem', 20)
        .neq('status', 'consulta_agendada')
        .neq('status', 'compareceu')
        .order('minutos_ultima_mensagem', { ascending: false })

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
          query = query
            .gte('inicio_atendimento', `${startStr}T00:00:00`)
            .lte('inicio_atendimento', `${endStr}T23:59:59.999`)
        }
      }

      const { data, error: err } = await query

      if (err) throw err

      setLeads(data as LeadAdv[])
    } catch (err: unknown) {
      console.error(err)
      error('Erro ao buscar follow ups')
    } finally {
      setIsLoading(false)
    }
  }, [filter?.preset, filter?.startDate, filter?.endDate, error])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  return { leads, isLoading, refetch: fetchLeads }
}
