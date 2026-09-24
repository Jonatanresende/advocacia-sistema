import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'

type LeadSnapshot = {
  id: string
  nome_lead: string | null
  whatsapp_lead: string
  ultima_mensagem: string | null
  id_conversa_chatwoot: number | null
  visto_em: string | null
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

  // Mapa: leadId → timestamp ms da última mensagem conhecida do lead
  const ultimoMsgTimeRef = useRef<Map<string, number>>(new Map())
  const prontoRef = useRef(false)

  // Avalia se existe algum lead com mensagem mais recente que a data de leitura
  const atualizarStatusNaoLido = useCallback(() => {
    let possuiNaoLido = false
    for (const lead of leadsListaRef.current) {
      const timeMsg = extrairTimeMs(lead.ultima_mensagem)
      const timeVisto = extrairTimeMs(lead.visto_em)
      if (timeMsg > 0 && timeMsg > timeVisto) {
        possuiNaoLido = true
        break
      }
    }
    setTemNaoLido(possuiNaoLido)
  }, [])

  // Marca conversa como lida gravando visto_em no banco (sincroniza entre sessões)
  const marcarComoLido = useCallback(async (leadId: string) => {
    const agora = new Date().toISOString()
    // Atualiza localmente na ref para feedback imediato (sem esperar o Realtime)
    const idx = leadsListaRef.current.findIndex((l) => l.id === leadId)
    if (idx >= 0) {
      leadsListaRef.current[idx] = { ...leadsListaRef.current[idx], visto_em: agora }
    }
    atualizarStatusNaoLido()
    // Persiste no servidor
    await supabase
      .from('leads_adv')
      .update({ visto_em: agora })
      .eq('id', leadId)
  }, [atualizarStatusNaoLido])

  const notificarUsuario = useCallback((nomeLead: string | null, whatsapp: string, texto?: string | null) => {
    const nome = nomeLead?.trim() || whatsapp
    const resumo = texto?.trim() ? ` "${texto.substring(0, 50)}${texto.length > 50 ? '...' : ''}"` : ''

    tocarSomNotificacao()
    success(`💬 ${nome}:${resumo}`)
    dispararNotificacaoBrowser(nomeLead, whatsapp, texto)
  }, [success])

  const processarSnapshot = useCallback((lead: LeadSnapshot) => {
    // Atualiza a lista guardada na ref
    const idx = leadsListaRef.current.findIndex((l) => l.id === lead.id)
    if (idx >= 0) {
      leadsListaRef.current[idx] = lead
    } else {
      leadsListaRef.current.push(lead)
    }
    atualizarStatusNaoLido()

    if (!prontoRef.current) return

    const timeMsg = extrairTimeMs(lead.ultima_mensagem)
    const timeAnterior = ultimoMsgTimeRef.current.get(lead.id)

    if (timeAnterior !== undefined && timeMsg > timeAnterior) {
      const timeVisto = extrairTimeMs(lead.visto_em)
      if (timeMsg > timeVisto) {
        notificarUsuario(lead.nome_lead, lead.whatsapp_lead, lead.ultima_mensagem)
      }
    }
    ultimoMsgTimeRef.current.set(lead.id, timeMsg)
  }, [notificarUsuario, atualizarStatusNaoLido])

  // ─── 1. Carga inicial de baseline (Direct Supabase DB Query) ─────────────
  useEffect(() => {
    let cancelado = false

    const inicializarBaseline = async () => {
      try {
        const { data } = await supabase
          .from('leads_adv')
          .select('id, ultima_mensagem, nome_lead, whatsapp_lead, id_conversa_chatwoot, visto_em')
          .not('id_conversa_chatwoot', 'is', null)

        if (data && !cancelado) {
          const leads = data as LeadSnapshot[]
          leadsListaRef.current = leads

          for (const row of leads) {
            const time = extrairTimeMs(row.ultima_mensagem)
            ultimoMsgTimeRef.current.set(row.id, time)
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
  }, [atualizarStatusNaoLido])

  // ─── 2. Realtime (Supabase WebSocket instantâneo) ──────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('leads-notificacoes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads_adv' },
        (payload) => {
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

  // ─── 3. Polling de segurança a cada 10 segundos (Direto no Banco, 1 única query) ─
  useEffect(() => {
    const poll = async () => {
      if (!prontoRef.current) return
      try {
        const { data } = await supabase
          .from('leads_adv')
          .select('id, ultima_mensagem, nome_lead, whatsapp_lead, id_conversa_chatwoot, visto_em')
          .not('id_conversa_chatwoot', 'is', null)

        if (data) {
          const leads = data as LeadSnapshot[]
          for (const lead of leads) {
            processarSnapshot(lead)
          }
        }
      } catch {
        // Polling silencioso
      }
    }

    const interval = setInterval(poll, 10000)
    return () => clearInterval(interval)
  }, [processarSnapshot])

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

  return { permissaoNotificacao, solicitarPermissao, testarNotificacao, temNaoLido, marcarComoLido }
}


