import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import type { ChatwootMessage } from './useChat'

type LeadSnapshot = {
  id: string
  nome_lead: string | null
  whatsapp_lead: string
  ultima_mensagem: string | null
  id_conversa_chatwoot: number | null
}

/**
 * Gera e toca um som de notificação estilo iOS (dois bipes suaves ascendentes).
 */
function tocarSomNotificacao() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()

    const tocarBipe = (frequencia: number, inicio: number, duracao: number, volume: number) => {
      const oscilador = ctx.createOscillator()
      const ganho = ctx.createGain()

      oscilador.connect(ganho)
      ganho.connect(ctx.destination)

      oscilador.type = 'sine'
      oscilador.frequency.setValueAtTime(frequencia, ctx.currentTime + inicio)
      oscilador.frequency.linearRampToValueAtTime(frequencia * 1.08, ctx.currentTime + inicio + duracao * 0.6)

      ganho.gain.setValueAtTime(0, ctx.currentTime + inicio)
      ganho.gain.linearRampToValueAtTime(volume, ctx.currentTime + inicio + 0.01)
      ganho.gain.setValueAtTime(volume, ctx.currentTime + inicio + duracao * 0.5)
      ganho.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracao)

      oscilador.start(ctx.currentTime + inicio)
      oscilador.stop(ctx.currentTime + inicio + duracao + 0.05)
    }

    tocarBipe(880, 0, 0.12, 0.25)
    tocarBipe(1175, 0.15, 0.12, 0.25)

    setTimeout(() => ctx.close(), 800)
  } catch {
    // Ignora se áudio for bloqueado
  }
}

/**
 * Dispara notificação nativa do navegador/SO.
 */
function dispararNotificacaoBrowser(nomeLead: string | null, whatsapp: string, textoMensagem?: string | null) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return

  const nome = nomeLead?.trim() || whatsapp
  const corpo = textoMensagem?.trim()
    ? `${nome}: "${textoMensagem.substring(0, 80)}${textoMensagem.length > 80 ? '...' : ''}"`
    : `${nome} enviou uma mensagem`

  try {
    const notif = new Notification('💬 Nova mensagem de Lead', {
      body: corpo,
      icon: '/favicon.svg',
      tag: `lead-msg-${nome}`,
      renotify: true,
    } as NotificationOptions)

    notif.onclick = () => {
      window.focus()
      notif.close()
    }
  } catch {
    // Fallback silencioso
  }
}

function extrairTimeMs(dataStr: string | null): number {
  if (!dataStr) return 0
  const ms = new Date(dataStr).getTime()
  return isNaN(ms) ? 0 : ms
}

/**
 * Hook global de notificações de leads.
 * Resposta INSTANTÂNEA (< 1s via Realtime, 2s fallback).
 * Filtra mensagens do lead (type 0) evitando alarde em respostas da IA.
 */
export function useNotificacaoLeads() {
  const [permissaoNotificacao, setPermissaoNotificacao] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )
  const [temNaoLido, setTemNaoLido] = useState(false)
  const { success } = useToast()

  // Lista de leads guardada em ref para avaliação de mensagens não lidas
  const leadsListaRef = useRef<LeadSnapshot[]>([])

  // Mapa: leadId → timestamp ms da última atualização do lead
  const baselineRef = useRef<Map<string, number>>(new Map())
  // Mapa: leadId → ID da última mensagem do lead (type 0) processada
  const ultimoMsgIdLeadRef = useRef<Map<string, number>>(new Map())
  // Mapa: leadId → timestamp ms da última mensagem vinda do lead no Chatwoot
  const ultimaMensagemDoLeadMsRef = useRef<Map<string, number>>(new Map())
  const prontoRef = useRef(false)

  // Avalia se existe algum lead com mensagem mais recente que a data de leitura
  const atualizarStatusNaoLido = useCallback(() => {
    let vistos: Record<string, number> = {}
    try {
      const salvo = localStorage.getItem('chat_leads_vistos')
      if (salvo) vistos = JSON.parse(salvo)
    } catch {
      // Ignora erro
    }

    let possuiNaoLido = false
    for (const lead of leadsListaRef.current) {
      const timeMsgChatwoot = ultimaMensagemDoLeadMsRef.current.get(lead.id) ?? 0
      const timeMsgDb = extrairTimeMs(lead.ultima_mensagem)
      const timeMsg = Math.max(timeMsgChatwoot, timeMsgDb)

      const timeVisto = vistos[lead.id] ?? 0
      if (timeMsg > 0 && timeMsg > timeVisto) {
        possuiNaoLido = true
        break
      }
    }
    setTemNaoLido(possuiNaoLido)
  }, [])

  // Escuta eventos de atualização dos vistos no localStorage (mesma aba e abas diferentes)
  useEffect(() => {
    const handleUpdate = () => atualizarStatusNaoLido()
    window.addEventListener('storage', handleUpdate)
    window.addEventListener('chat_vistos_updated', handleUpdate)
    return () => {
      window.removeEventListener('storage', handleUpdate)
      window.removeEventListener('chat_vistos_updated', handleUpdate)
    }
  }, [atualizarStatusNaoLido])

  const notificarUsuario = useCallback((nomeLead: string | null, whatsapp: string, texto?: string | null) => {
    const nome = nomeLead?.trim() || whatsapp
    const resumo = texto?.trim() ? ` "${texto.substring(0, 50)}${texto.length > 50 ? '...' : ''}"` : ''

    tocarSomNotificacao()
    success(`💬 ${nome}:${resumo}`)
    dispararNotificacaoBrowser(nomeLead, whatsapp, texto)
  }, [success])

  // Busca e verifica mensagens da conversa para um lead
  const verificarMensagensLead = useCallback(async (lead: LeadSnapshot, emitirAlerta: boolean) => {
    try {
      const { data, error: err } = await supabase.functions.invoke('chatwoot-proxy', {
        body: { action: 'buscar_mensagens', lead_id: lead.id },
      })

      if (err || data?.error || !Array.isArray(data?.payload)) return

      const msgs = data.payload as ChatwootMessage[]
      if (msgs.length === 0) return

      // Filtra APENAS mensagens enviadas pelo lead (message_type === 0)
      const msgsDoLead = msgs.filter((m) => m.message_type === 0 && !m.private)
      if (msgsDoLead.length === 0) return

      // Pega a mensagem mais recente enviada pelo lead
      const ultimaMsgLead = msgsDoLead[msgsDoLead.length - 1]
      const timestampMsLead = ultimaMsgLead.created_at ? ultimaMsgLead.created_at * 1000 : Date.now()
      ultimaMensagemDoLeadMsRef.current.set(lead.id, timestampMsLead)
      atualizarStatusNaoLido()

      const lastId = ultimoMsgIdLeadRef.current.get(lead.id)

      // Se é a primeira vez verificando este lead, registra o ID sem alertar (baseline)
      if (lastId === undefined) {
        ultimoMsgIdLeadRef.current.set(lead.id, ultimaMsgLead.id)
        return
      }

      // Se chegou um novo ID de mensagem vindo do lead
      if (ultimaMsgLead.id > lastId) {
        ultimoMsgIdLeadRef.current.set(lead.id, ultimaMsgLead.id)

        if (emitirAlerta) {
          notificarUsuario(lead.nome_lead, lead.whatsapp_lead, ultimaMsgLead.content)
        }
      }
    } catch {
      // Ignora erro temporário
    }
  }, [notificarUsuario, atualizarStatusNaoLido])

  const processarSnapshot = useCallback((lead: LeadSnapshot) => {
    if (!prontoRef.current) return

    // Atualiza a lista guardada na ref
    const idx = leadsListaRef.current.findIndex((l) => l.id === lead.id)
    if (idx >= 0) {
      leadsListaRef.current[idx] = lead
    } else {
      leadsListaRef.current.push(lead)
    }
    atualizarStatusNaoLido()

    // Verifica se chegou mensagem nova do lead no Chatwoot
    verificarMensagensLead(lead, true)
  }, [verificarMensagensLead, atualizarStatusNaoLido])

  // ─── 1. Carga inicial de baseline ────────────────────────────────────────
  useEffect(() => {
    let cancelado = false

    const inicializarBaseline = async () => {
      try {
        const { data } = await supabase
          .from('leads_adv')
          .select('id, ultima_mensagem, nome_lead, whatsapp_lead, id_conversa_chatwoot')
          .not('id_conversa_chatwoot', 'is', null)

        if (data && !cancelado) {
          const leads = data as LeadSnapshot[]
          leadsListaRef.current = leads

          for (const row of leads) {
            const time = extrairTimeMs(row.ultima_mensagem)
            baselineRef.current.set(row.id, time)
            // Popula baseline de mensagens do lead sem tocar alerta
            verificarMensagensLead(row, false)
          }

          atualizarStatusNaoLido()
        }
      } finally {
        if (!cancelado) {
          prontoRef.current = true
        }
      }
    }

    inicializarBaseline()
    return () => {
      cancelado = true
    }
  }, [verificarMensagensLead, atualizarStatusNaoLido])

  // ─── 2. Realtime (Supabase WebSocket instantâneo) ──────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('leads-notificacoes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads_adv' },
        (payload) => {
          if (!prontoRef.current) return
          const novo = payload.new as LeadSnapshot
          if (novo && novo.id_conversa_chatwoot) {
            processarSnapshot(novo)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [processarSnapshot])

  // ─── 3. Polling rápido de 2.5 segundos para detectar mensagem antes da IA ─────────────
  useEffect(() => {
    const poll = async () => {
      if (!prontoRef.current) return
      try {
        const { data } = await supabase
          .from('leads_adv')
          .select('id, ultima_mensagem, nome_lead, whatsapp_lead, id_conversa_chatwoot')
          .not('id_conversa_chatwoot', 'is', null)

        if (data) {
          const leads = data as LeadSnapshot[]
          leadsListaRef.current = leads
          for (const lead of leads) {
            // Checa diretamente se o lead enviou nova mensagem no Chatwoot
            verificarMensagensLead(lead, true)
          }
          atualizarStatusNaoLido()
        }
      } catch {
        // Polling silencioso
      }
    }

    const interval = setInterval(poll, 2500)
    return () => clearInterval(interval)
  }, [verificarMensagensLead, atualizarStatusNaoLido])

  // ─── Permissão do Navegador ─────────────────────────────────────────────
  const solicitarPermissao = useCallback(async () => {
    if (typeof Notification === 'undefined') return
    const perm = await Notification.requestPermission()
    setPermissaoNotificacao(perm)
  }, [])

  // ─── Testar Notificação Manualmente ────────────────────────────────────
  const testarNotificacao = useCallback(() => {
    notificarUsuario('Lead de Teste', '(11) 99999-9999', 'Olá, gostaria de agendar um atendimento.')
  }, [notificarUsuario])

  return { permissaoNotificacao, solicitarPermissao, testarNotificacao, temNaoLido }
}

