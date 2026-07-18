import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { LeadAdv, DateFilter, LeadStatus } from '../types'
import { useToast } from '../contexts/ToastContext'
import { format, subDays, startOfMonth, subMonths, endOfMonth, startOfYear } from 'date-fns'

export function useLeads(filter?: DateFilter, status?: LeadStatus, excludeClientes?: boolean) {
  const [leads, setLeads] = useState<LeadAdv[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { error } = useToast()

  const fetchLeads = useCallback(async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('leads_adv')
        .select('*')
        .order('inicio_atendimento', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

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
          query = query.gte('inicio_atendimento', `${startStr}T00:00:00`)
          query = query.lte('inicio_atendimento', `${endStr}T23:59:59.999`)
        }
      }

      const { data, error: err } = await query

      if (err) throw err

      let finalData = data as LeadAdv[]

      if (excludeClientes && finalData.length > 0) {
        const { data: clientsData } = await supabase.from('clientes_adv').select('lead_id')
        const clientLeadIds = new Set(clientsData?.map(c => c.lead_id) || [])
        finalData = finalData.filter(lead => !clientLeadIds.has(lead.id))
      }

      setLeads(finalData)
    } catch (err: unknown) {
      console.error(err)
      error('Erro ao buscar leads')
    } finally {
      setIsLoading(false)
    }
  }, [filter?.preset, filter?.startDate, filter?.endDate, status, excludeClientes, error])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const updateLeadStatus = async (id: string, newStatus: LeadStatus) => {
    try {
      const { error: err } = await supabase.from('leads_adv').update({ status: newStatus }).eq('id', id)
      if (err) throw err
      await fetchLeads()
      return true
    } catch (err) {
      console.error(err)
      error('Erro ao atualizar status do lead')
      return false
    }
  }

  const updateLeadFields = async (id: string, updates: Partial<LeadAdv>) => {
    try {
      const { error: err } = await supabase.from('leads_adv').update(updates).eq('id', id)
      if (err) throw err
      await fetchLeads()
      return true
    } catch (err) {
      console.error(err)
      error('Erro ao atualizar lead')
      return false
    }
  }

  return { leads, isLoading, refetch: fetchLeads, updateLeadStatus, updateLeadFields }
}
