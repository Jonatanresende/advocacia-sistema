import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { DateFilter, DiaSemana, OfficeHours } from '../types'
import { useToast } from '../contexts/ToastContext'
import { format, subDays, startOfMonth, subMonths, endOfMonth, startOfYear, getDay, parseISO, isWithinInterval } from 'date-fns'

const DIAS_MAP: Record<number, DiaSemana> = {
  0: 'domingo',
  1: 'segunda',
  2: 'terca',
  3: 'quarta',
  4: 'quinta',
  5: 'sexta',
  6: 'sabado'
}

export function useDashboardStats(filter: DateFilter) {
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalClientes: 0,
    consultasHoje: 0,
    leadsPorDia: [] as { data: string; quantidade: number }[],
    leadsPorSemana: [] as { dia: string; quantidade: number }[],
    atendimentosHorario: [] as { name: string; value: number }[],
    officeHoursText: ''
  })
  const [isLoading, setIsLoading] = useState(true)
  const { error } = useToast()

  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    try {
      const today = new Date()
      const todayStr = format(today, 'yyyy-MM-dd')

      let startStr = ''
      let endStr = ''

      switch (filter.preset) {
        case 'hoje':        startStr = todayStr; endStr = todayStr; break
        case 'ontem':       startStr = format(subDays(today, 1), 'yyyy-MM-dd'); endStr = format(subDays(today, 1), 'yyyy-MM-dd'); break
        case 'ultimos_7_dias': startStr = format(subDays(today, 7), 'yyyy-MM-dd'); endStr = todayStr; break
        case 'ultimos_14_dias': startStr = format(subDays(today, 14), 'yyyy-MM-dd'); endStr = todayStr; break
        case 'este_mes':    startStr = format(startOfMonth(today), 'yyyy-MM-dd'); endStr = todayStr; break
        case 'mes_passado': startStr = format(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd'); endStr = format(endOfMonth(subMonths(today, 1)), 'yyyy-MM-dd'); break
        case 'este_ano':    startStr = format(startOfYear(today), 'yyyy-MM-dd'); endStr = todayStr; break
        case 'personalizado': startStr = filter.startDate; endStr = filter.endDate; break
      }

      // Fetch Leads
      let leadsQuery = supabase.from('leads_adv').select('inicio_atendimento')
      if (startStr && endStr) {
        leadsQuery = leadsQuery
          .gte('inicio_atendimento', `${startStr}T00:00:00`)
          .lte('inicio_atendimento', `${endStr}T23:59:59.999`)
      }
      const { data: leadsData, error: leadsErr } = await leadsQuery
      if (leadsErr) throw leadsErr

      // Fetch Clientes
      let clientesQuery = supabase.from('clientes_adv').select('id, created_at')
      if (startStr && endStr) {
        clientesQuery = clientesQuery
          .gte('created_at', `${startStr}T00:00:00`)
          .lte('created_at', `${endStr}T23:59:59.999`)
      }
      const { data: clientesData, error: clientesErr } = await clientesQuery
      if (clientesErr) throw clientesErr

      // Fetch Consultas Hoje (NOT affected by filter)
      const { count: consultasCount, error: consultErr } = await supabase
        .from('agendamentos_adv')
        .select('*', { count: 'exact', head: true })
        .gte('data_hora_inicio', `${todayStr}T00:00:00`)
        .lte('data_hora_inicio', `${todayStr}T23:59:59.999`)
        .neq('status', 'cancelado')
      if (consultErr) throw consultErr

      // Fetch Office Hours
      const { data: hoursData, error: hoursErr } = await supabase.from('office_hours').select('*')
      if (hoursErr) throw hoursErr

      const hoursMap = {} as Record<DiaSemana, OfficeHours>
      ;(hoursData as OfficeHours[]).forEach(h => { hoursMap[h.dia] = h })

      const totalLeads = leadsData?.length || 0
      const totalClientes = clientesData?.length || 0

      // Gráfico Linha: Volume por Dia
      const volumePorDiaMap: Record<string, number> = {}
      leadsData?.forEach(l => {
        if (!l.inicio_atendimento) return
        const dateKey = format(parseISO(l.inicio_atendimento), 'dd/MM')
        volumePorDiaMap[dateKey] = (volumePorDiaMap[dateKey] || 0) + 1
      })
      const leadsPorDia = Object.entries(volumePorDiaMap).map(([data, quantidade]) => ({ data, quantidade }))

      // Gráfico Barras: Dia da Semana
      const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
      const volumeSemanaMap: Record<string, number> = { 'Dom':0, 'Seg':0, 'Ter':0, 'Qua':0, 'Qui':0, 'Sex':0, 'Sáb':0 }
      leadsData?.forEach(l => {
        if (!l.inicio_atendimento) return
        const dayIdx = getDay(parseISO(l.inicio_atendimento))
        volumeSemanaMap[weekDays[dayIdx]] += 1
      })
      const leadsPorSemana = weekDays.map(dia => ({ dia, quantidade: volumeSemanaMap[dia] }))

      // Gráfico Pizza: Atendimentos por Horário
      let dentroCount = 0
      let foraCount = 0

      leadsData?.forEach(l => {
        if (!l.inicio_atendimento) return
        const dateObj = parseISO(l.inicio_atendimento)
        const dayIdx = getDay(dateObj)
        const diaSemana = DIAS_MAP[dayIdx]
        const configDia = hoursMap[diaSemana]

        if (!configDia || !configDia.aberto || !configDia.hora_inicio || !configDia.hora_fim) {
          foraCount++
          return
        }

        const [hiHour, hiMin] = configDia.hora_inicio.split(':').map(Number)
        const [hfHour, hfMin] = configDia.hora_fim.split(':').map(Number)

        const startInterval = new Date(dateObj)
        startInterval.setHours(hiHour, hiMin, 0, 0)

        const endInterval = new Date(dateObj)
        endInterval.setHours(hfHour, hfMin, 59, 999)

        if (isWithinInterval(dateObj, { start: startInterval, end: endInterval })) {
          dentroCount++
        } else {
          foraCount++
        }
      })

      const atendimentosHorario = [
        { name: 'Horário Comercial', value: dentroCount },
        { name: 'Fora do Horário (Agente IA)', value: foraCount }
      ]

      // Office hours text
      const weekDiasOrdem: DiaSemana[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta']
      const segSexAberto = weekDiasOrdem.every(d => hoursMap[d]?.aberto)
      let officeHoursText = 'Horários variados'
      if (segSexAberto && hoursMap['segunda']) {
        const seg = hoursMap['segunda']
        officeHoursText = `Seg–Sex, ${seg.hora_inicio}–${seg.hora_fim}`
      }

      setStats({
        totalLeads,
        totalClientes,
        consultasHoje: consultasCount || 0,
        leadsPorDia,
        leadsPorSemana,
        atendimentosHorario,
        officeHoursText
      })

    } catch (err: unknown) {
      console.error(err)
      error('Erro ao processar dados do dashboard')
    } finally {
      setIsLoading(false)
    }
  }, [filter.preset, filter.startDate, filter.endDate, error])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, isLoading }
}
