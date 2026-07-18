import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { ClienteAdv, DateFilter } from '../types'
import { useToast } from '../contexts/ToastContext'
import { format, subDays, startOfMonth, subMonths, endOfMonth, startOfYear } from 'date-fns'

export function useClientes(filter?: DateFilter) {
  const [clientes, setClientes] = useState<ClienteAdv[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { error } = useToast()

  const fetchClientes = useCallback(async () => {
    setIsLoading(true)
    try {
      const today = new Date()
      let startStr = ''
      let endStr = ''

      if (filter) {
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
      }

      let query = supabase
        .from('clientes_adv')
        .select('*, lead:leads_adv!inner(*)')
        .order('created_at', { ascending: false })

      if (startStr && endStr) {
        query = query
          .gte('leads_adv.inicio_atendimento', `${startStr}T00:00:00`)
          .lte('leads_adv.inicio_atendimento', `${endStr}T23:59:59.999`)
      }

      const { data, error: err } = await query

      if (err) throw err

      setClientes(data as ClienteAdv[])
    } catch (err: unknown) {
      console.error(err)
      error('Erro ao buscar clientes')
    } finally {
      setIsLoading(false)
    }
  }, [filter?.preset, filter?.startDate, filter?.endDate, error])

  useEffect(() => {
    fetchClientes()
  }, [fetchClientes])

  return { clientes, isLoading, refetch: fetchClientes }
}
