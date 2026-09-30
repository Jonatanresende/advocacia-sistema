import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { supabase } from '../../lib/supabase'
import type { Advogado, LeadAdv, ModalidadeAtendimento } from '../../types'
import { useToast } from '../../contexts/ToastContext'
import { ShieldAlert, Video, MapPin, ExternalLink, Search, UserPlus, UserCheck, Clock, CheckCircle2 } from 'lucide-react'
import clsx from 'clsx'

interface NovoAgendamentoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface SlotHorario {
  horaStr: string // "09:00"
  startMs: number
  endMs: number
  ocupado: boolean
  leadNomeOcupado?: string
}

export default function NovoAgendamentoModal({ isOpen, onClose, onSuccess }: NovoAgendamentoModalProps) {
  const { success, error } = useToast()

  const [advogados, setAdvogados] = useState<Advogado[]>([])
  const [leads, setLeads] = useState<LeadAdv[]>([])
  const [searchLead, setSearchLead] = useState('')
  const [selectedLead, setSelectedLead] = useState<LeadAdv | null>(null)

  // Modo de Lead: 'existente' | 'novo'
  const [tipoLead, setTipoLead] = useState<'existente' | 'novo'>('novo')
  const [novoLeadNome, setNovoLeadNome] = useState('')
  const [novoLeadWhatsapp, setNovoLeadWhatsapp] = useState('')

  const [advogadoId, setAdvogadoId] = useState('')
  const [data, setData] = useState('')
  const [hora, setHora] = useState('')
  const [duracaoMinutos, setDuracaoMinutos] = useState(30)
  const [modalidade, setModalidade] = useState<ModalidadeAtendimento>('presencial')
  const [observacoes, setObservacoes] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)
  const [forceConflict, setForceConflict] = useState(false)
  const [googleEventUrl, setGoogleEventUrl] = useState<string | null>(null)

  // Slots de horários do dia selecionado
  const [slotsDia, setSlotsDia] = useState<SlotHorario[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchInitialData()
      const today = new Date().toISOString().split('T')[0]
      setData(today)
      setHora('14:00')
      setAdvogadoId('')
      setSelectedLead(null)
      setSearchLead('')
      setTipoLead('novo')
      setNovoLeadNome('')
      setNovoLeadWhatsapp('')
      setObservacoes('')
      setConflictWarning(null)
      setForceConflict(false)
      setGoogleEventUrl(null)
    }
  }, [isOpen])

  const fetchInitialData = async () => {
    try {
      const { data: advs } = await supabase
        .from('advogados')
        .select('*')
        .eq('ativo', true)
        .order('nome')

      if (advs) {
        setAdvogados(advs as Advogado[])
        if (advs.length > 0) setAdvogadoId(advs[0].id)
      }

      const { data: lds } = await supabase
        .from('leads_adv')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (lds) setLeads(lds as LeadAdv[])
    } catch (err) {
      console.error(err)
    }
  }

  // Busca de leads dinâmicos
  useEffect(() => {
    if (!searchLead.trim()) return

    const timer = setTimeout(async () => {
      try {
        const { data: res } = await supabase
          .from('leads_adv')
          .select('*')
          .or(`nome_lead.ilike.%${searchLead}%,whatsapp_lead.ilike.%${searchLead}%`)
          .limit(10)

        if (res) setLeads(res as LeadAdv[])
      } catch (err) {
        console.error(err)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchLead])

  // Recarrega e gera a grade de horários livres do dia selecionado
  useEffect(() => {
    if (!advogadoId || !data) {
      setSlotsDia([])
      return
    }

    const carregarSlotsEChecarConflito = async () => {
      setIsLoadingSlots(true)
      try {
        // 1. Busca agendamentos do dia do advogado no banco local
        const startOfDay = new Date(`${data}T00:00:00`).toISOString()
        const endOfDay = new Date(`${data}T23:59:59`).toISOString()

        const [agendamentosLocalRes, googleEventsRes] = await Promise.all([
          supabase
            .from('agendamentos_adv')
            .select('id, data_hora_inicio, data_hora_fim, leads_adv(nome_lead)')
            .eq('advogado_id', advogadoId)
            .neq('status', 'cancelado')
            .gte('data_hora_inicio', startOfDay)
            .lte('data_hora_inicio', endOfDay),
          supabase.functions.invoke('criar-agendamento', {
            body: { action: 'checar_horarios_google', data },
          })
        ])

        const agendamentosDoDia = agendamentosLocalRes.data || []
        const googleEvents: Array<{ start: string; end: string; summary: string }> = googleEventsRes.data?.events || []

        // 2. Gera lista de slots (ex: 08:00 às 18:00 em passos de 30min)
        const slots: SlotHorario[] = []
        const horasPadrao = [
          '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
          '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
        ]

        for (const hStr of horasPadrao) {
          const sMs = new Date(`${data}T${hStr}:00`).getTime()
          const eMs = sMs + duracaoMinutos * 60 * 1000

          let ocupado = false
          let leadOcupado = ''

          // Checa no banco local do CRM
          for (const item of agendamentosDoDia) {
            const itemStart = new Date(item.data_hora_inicio).getTime()
            const itemEnd = item.data_hora_fim
              ? new Date(item.data_hora_fim).getTime()
              : itemStart + 30 * 60 * 1000

            if (sMs < itemEnd && eMs > itemStart) {
              ocupado = true
              leadOcupado = (item.leads_adv as any)?.nome_lead || 'Cliente agendado'
              break
            }
          }

          // Checa na agenda do Google (se já não tiver achado no local)
          if (!ocupado && googleEvents.length > 0) {
            for (const gEv of googleEvents) {
              const gStart = new Date(gEv.start).getTime()
              const gEnd = new Date(gEv.end).getTime()

              if (sMs < gEnd && eMs > gStart) {
                ocupado = true
                leadOcupado = gEv.summary || 'Google Agenda'
                break
              }
            }
          }

          slots.push({
            horaStr: hStr,
            startMs: sMs,
            endMs: eMs,
            ocupado,
            leadNomeOcupado: leadOcupado,
          })
        }

        setSlotsDia(slots)

        // 3. Checa o horário que está preenchido no input atual
        if (hora) {
          const selStartMs = new Date(`${data}T${hora}:00`).getTime()
          const selEndMs = selStartMs + duracaoMinutos * 60 * 1000

          let conflitoLocal: string | null = null
          if (agendamentosDoDia) {
            for (const item of agendamentosDoDia) {
              const itemStart = new Date(item.data_hora_inicio).getTime()
              const itemEnd = item.data_hora_fim
                ? new Date(item.data_hora_fim).getTime()
                : itemStart + 30 * 60 * 1000

              if (selStartMs < itemEnd && selEndMs > itemStart) {
                const leadNome = (item.leads_adv as any)?.nome_lead || 'Outro cliente'
                const hIni = new Date(itemStart).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                const hFim = new Date(itemEnd).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                conflitoLocal = `Conflito: Dr(a) já possui consulta das ${hIni} às ${hFim} (${leadNome}).`
                break
              }
            }
          }
          setConflictWarning(conflitoLocal)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoadingSlots(false)
      }
    }

    carregarSlotsEChecarConflito()
  }, [advogadoId, data, hora, duracaoMinutos])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!advogadoId) {
      error('Selecione um advogado.')
      return
    }
    if (!data || !hora) {
      error('Informe a data e o horário do agendamento.')
      return
    }

    if (tipoLead === 'novo' && !novoLeadNome.trim() && !novoLeadWhatsapp.trim()) {
      error('Informe ao menos o nome ou telefone do novo lead.')
      return
    }

    if (conflictWarning && !forceConflict) {
      error('Existe um conflito de horário. Marque "Ignorar aviso de conflito" para prosseguir mesmo assim.')
      return
    }

    setIsSubmitting(true)
    setGoogleEventUrl(null)

    try {
      const startIso = new Date(`${data}T${hora}:00`).toISOString()

      const payload: Record<string, unknown> = {
        advogado_id: advogadoId,
        data_hora: startIso,
        duracao_minutos: Number(duracaoMinutos),
        modalidade,
        observacoes,
        forcar_conflito: forceConflict,
      }

      if (tipoLead === 'existente' && selectedLead) {
        payload.lead_id = selectedLead.id
      } else if (tipoLead === 'novo') {
        payload.novo_lead = {
          nome_lead: novoLeadNome.trim(),
          whatsapp_lead: novoLeadWhatsapp.trim(),
        }
      }

      const { data: resData, error: err } = await supabase.functions.invoke('criar-agendamento', {
        body: payload,
      })

      if (err) {
        if (err.status === 409 || (err as any)?.context?.status === 409) {
          const bodyJson = await (err as any)?.context?.json?.().catch(() => null)
          setConflictWarning(bodyJson?.error || 'Conflito de horário detectado.')
          error(bodyJson?.error || 'Conflito de horário detectado.')
        } else {
          error(err.message || 'Erro ao criar agendamento.')
        }
        return
      }

      if (resData?.conflict && !forceConflict) {
        setConflictWarning(resData.error || 'Conflito de horário detectado.')
        error(resData.error)
        return
      }

      success('Agendamento criado com sucesso!')

      if (resData?.google_event_url) {
        setGoogleEventUrl(resData.google_event_url)
      }

      if (resData?.google_sync_warning) {
        error(resData.google_sync_warning)
      }

      onSuccess()

      if (!resData?.google_event_url) {
        onClose()
      }
    } catch (err: any) {
      console.error(err)
      error(err.message || 'Erro de conexão ao criar agendamento.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Agendamento Manual">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Banner de Sucesso com link do Google Calendar se gerado */}
        {googleEventUrl && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[12px] p-4 flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-emerald-500 flex items-center gap-2">
              <CheckCircle2 size={16} /> Agendamento sincronizado com o Google Calendar!
            </span>
            <a
              href={googleEventUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--primary)] hover:underline"
            >
              <ExternalLink size={14} /> Abrir evento no Google Agenda
            </a>
          </div>
        )}

        {/* 1. Seleção / Cadastro de Lead */}
        <div className="flex flex-col gap-3 border-b border-[var(--border-card)] pb-4">
          <label className="text-[13px] font-medium text-[var(--text-main)] flex items-center justify-between">
            <span>Cliente / Lead *</span>
            <div className="flex items-center gap-2 bg-[var(--bg-base)] p-1 rounded-[8px] border border-[var(--border-card)]">
              <button
                type="button"
                onClick={() => setTipoLead('novo')}
                className={clsx(
                  'px-2.5 py-1 text-[11px] font-semibold rounded-[6px] transition-all flex items-center gap-1',
                  tipoLead === 'novo'
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                )}
              >
                <UserPlus size={12} /> Novo Lead
              </button>
              <button
                type="button"
                onClick={() => setTipoLead('existente')}
                className={clsx(
                  'px-2.5 py-1 text-[11px] font-semibold rounded-[6px] transition-all flex items-center gap-1',
                  tipoLead === 'existente'
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                )}
              >
                <UserCheck size={12} /> Lead Existente
              </button>
            </div>
          </label>

          {tipoLead === 'novo' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[var(--bg-base)]/40 p-3 rounded-[12px] border border-[var(--border-card)]">
              <Input
                label="Nome do Lead *"
                placeholder="Ex: Maria da Silva"
                value={novoLeadNome}
                onChange={(e) => setNovoLeadNome(e.target.value)}
                required
              />
              <Input
                label="Telefone / WhatsApp *"
                placeholder="Ex: 85999998888"
                value={novoLeadWhatsapp}
                onChange={(e) => setNovoLeadWhatsapp(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedLead ? (
                <div className="flex items-center justify-between bg-[var(--primary)]/10 border border-[var(--primary)]/20 p-3 rounded-[10px]">
                  <div>
                    <p className="text-[13px] font-bold text-[var(--text-main)]">{selectedLead.nome_lead || 'Sem nome'}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{selectedLead.whatsapp_lead}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedLead(null)}
                    className="text-[11px] text-rose-500 font-semibold hover:underline"
                  >
                    Trocar
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-3 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="Buscar lead existente por nome ou WhatsApp..."
                      value={searchLead}
                      onChange={(e) => setSearchLead(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-[13px] rounded-[10px] border border-[var(--border-card)] bg-[var(--bg-base)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>

                  {leads.length > 0 && (
                    <div className="max-h-36 overflow-y-auto border border-[var(--border-card)] rounded-[10px] divide-y divide-[var(--border-card)] bg-[var(--bg-card)]">
                      {leads.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => {
                            setSelectedLead(l)
                            setSearchLead('')
                          }}
                          className="w-full text-left p-2.5 hover:bg-[var(--bg-base)] transition-colors flex items-center justify-between"
                        >
                          <span className="text-[13px] font-medium text-[var(--text-main)]">
                            {l.nome_lead || 'Lead sem nome'}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)]">{l.whatsapp_lead}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Advogado Responsável */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[var(--text-main)]">Advogado Responsável *</label>
          <select
            value={advogadoId}
            onChange={(e) => setAdvogadoId(e.target.value)}
            required
            className="w-full p-2.5 text-[13px] rounded-[10px] border border-[var(--border-card)] bg-[var(--bg-base)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
          >
            <option value="">Selecione um advogado...</option>
            {advogados.map((adv) => (
              <option key={adv.id} value={adv.id}>
                {adv.nome}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Data e Hora */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Data *"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
          <Input
            label="Hora *"
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            required
          />
        </div>

        {/* 4. VISUALIZADOR DE HORÁRIOS LIVRES / OCUPADOS DO DIA */}
        {advogadoId && data && (
          <div className="flex flex-col gap-2 bg-[var(--bg-base)]/50 p-3 rounded-[12px] border border-[var(--border-card)]">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                <Clock size={14} className="text-[var(--primary)]" />
                Horários do Advogado neste dia
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">
                Clique num horário livre 🟢 para selecionar
              </span>
            </div>

            {isLoadingSlots ? (
              <div className="text-[12px] text-[var(--text-muted)] py-3 text-center">Verificando agenda...</div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {slotsDia.map((slot) => (
                  <button
                    key={slot.horaStr}
                    type="button"
                    disabled={slot.ocupado}
                    onClick={() => setHora(slot.horaStr)}
                    title={slot.ocupado ? `Ocupado: ${slot.leadNomeOcupado}` : 'Clique para selecionar'}
                    className={clsx(
                      'py-1.5 px-1 rounded-[8px] text-[11px] font-semibold transition-all border text-center flex flex-col items-center justify-center',
                      slot.ocupado
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 cursor-not-allowed'
                        : hora === slot.horaStr
                        ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-sm ring-2 ring-[var(--primary)]/30'
                        : 'bg-[var(--bg-card)] border-[var(--border-card)] text-[var(--text-main)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/10'
                    )}
                  >
                    <span>{slot.horaStr}</span>
                    {slot.ocupado ? (
                      <span className="text-[8px] font-normal truncate max-w-full">Ocupado</span>
                    ) : (
                      <span className="text-[8px] font-normal text-emerald-500">Livre</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. Duração e Modalidade */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[var(--text-main)]">Duração *</label>
            <select
              value={duracaoMinutos}
              onChange={(e) => setDuracaoMinutos(Number(e.target.value))}
              className="w-full p-2.5 text-[13px] rounded-[10px] border border-[var(--border-card)] bg-[var(--bg-base)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
            >
              <option value={30}>30 minutos</option>
              <option value={45}>45 minutos</option>
              <option value={60}>1 hora</option>
              <option value={90}>1h 30min</option>
              <option value={120}>2 horas</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[var(--text-main)]">Modalidade *</label>
            <div className="flex items-center gap-2 h-10">
              <button
                type="button"
                onClick={() => setModalidade('presencial')}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-1.5 h-full rounded-[10px] text-[12px] font-semibold border transition-all',
                  modalidade === 'presencial'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                    : 'border-[var(--border-card)] text-[var(--text-muted)] hover:bg-[var(--bg-base)]'
                )}
              >
                <MapPin size={14} /> Presencial
              </button>
              <button
                type="button"
                onClick={() => setModalidade('online')}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-1.5 h-full rounded-[10px] text-[12px] font-semibold border transition-all',
                  modalidade === 'online'
                    ? 'bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]'
                    : 'border-[var(--border-card)] text-[var(--text-muted)] hover:bg-[var(--bg-base)]'
                )}
              >
                <Video size={14} /> Online
              </button>
            </div>
          </div>
        </div>

        {/* Banner de Aviso de Conflito */}
        {conflictWarning && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-[12px] p-3.5 flex flex-col gap-2">
            <div className="flex items-start gap-2 text-rose-500">
              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
              <span className="text-[12px] font-medium leading-tight">{conflictWarning}</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-rose-500/10">
              <input
                type="checkbox"
                checked={forceConflict}
                onChange={(e) => setForceConflict(e.target.checked)}
                className="rounded text-rose-500 focus:ring-rose-500"
              />
              <span className="text-[11px] font-semibold text-rose-500">Ignorar aviso e agendar mesmo assim</span>
            </label>
          </div>
        )}

        {/* 6. Observações */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[var(--text-main)]">Observações</label>
          <textarea
            rows={2}
            placeholder="Detalhes adicionais da consulta..."
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            className="w-full p-2.5 text-[13px] rounded-[10px] border border-[var(--border-card)] bg-[var(--bg-base)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
          />
        </div>

        {/* Rodapé e Botões */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-card)]">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            {googleEventUrl ? 'Fechar' : 'Cancelar'}
          </Button>
          {!googleEventUrl && (
            <Button type="submit" isLoading={isSubmitting}>
              Criar Agendamento
            </Button>
          )}
        </div>
      </form>
    </Modal>
  )
}
