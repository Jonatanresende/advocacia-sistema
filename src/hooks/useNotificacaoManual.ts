import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'

type ContatoSnapshot = {
  id: string
  nome: string | null
  whatsapp: string
  ultima_mensagem: string | null
}

// ── Som de notificação (dois bipes ascendentes estilo iOS) ────────────────
function tocarSomNotificacao() {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()

    const tocarBipe = (frequencia: number, inicio: number, duracao: number, volume: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(frequencia, ctx.currentTime + inicio)
      osc.frequency.linearRampToValueAtTime(frequencia * 1.08, ctx.currentTime + inicio + duracao * 0.6)
      gain.gain.setValueAtTime(0, ctx.currentTime + inicio)
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + inicio + 0.01)
      gain.gain.setValueAtTime(volume, ctx.currentTime + inicio + duracao * 0.5)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracao)
      osc.start(ctx.currentTime + inicio)
      osc.stop(ctx.currentTime + inicio + duracao + 0.05)
    }

    tocarBipe(880, 0, 0.12, 0.25)
    tocarBipe(1175, 0.15, 0.12, 0.25)
    setTimeout(() => ctx.close(), 800)
  } catch {
    // Navegador sem Web Audio API
  }
}

// ── Notificação nativa do SO (funciona com aba em segundo plano) ──────────
function dispararNotificacaoBrowser(nome: string | null, whatsapp: string, texto?: string | null) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return

  const nomeExibido = nome?.trim() || whatsapp
  const corpo = texto?.trim()
    ? `${nomeExibido}: "${texto.substring(0, 80)}${texto.length > 80 ? '...' : ''}"`
    : `${nomeExibido} enviou uma mensagem`

  try {
    const notif = new Notification('📱 Atendimento Manual — Nova mensagem', {
      body: corpo,
      icon: '/favicon.svg',
      tag: `manual-msg-${nomeExibido}`,
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
 * Hook global de notificações do Atendimento Manual (2º WhatsApp).
 *
 * - Som de notificação ao receber nova mensagem de cliente
 * - Ponto pulsante no item do Sidebar
 * - Notificação nativa do SO (funciona com aba minimizada/em segundo plano)
 * - Realtime via Supabase WebSocket + polling de segurança a cada 15s
 * - totalNaoLidas: número total de mensagens não lidas dos clientes
 */
export function useNotificacaoManual() {
  const [permissaoNotificacao, setPermissaoNotificacao] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )
  const [temNaoLido, setTemNaoLido] = useState(false)
  const [totalNaoLidas, setTotalNaoLidas] = useState(0)
  const { success } = useToast()

  // Refs para não perder estado entre re-renders
  const contatosRef = useRef<ContatoSnapshot[]>([])
  const ultimoMsgTimeRef = useRef<Map<string, number>>(new Map())
  const prontoRef = useRef(false)

  // ── Atualiza badge de não lidas ────────────────────────────────────────
  const atualizarBadge = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('mensagens_whatsapp_manual')
        .select('contato_id')
        .eq('lida', false)
        .eq('tipo_remetente', 'cliente')

      const total = data?.length ?? 0
      setTotalNaoLidas(total)
      setTemNaoLido(total > 0)
    } catch {
      // Silencioso
    }
  }, [])

  // ── Notifica usuário (som + toast + notificação do SO) ─────────────────
  const notificarUsuario = useCallback(
    (nome: string | null, whatsapp: string, texto?: string | null) => {
      const nomeExibido = nome?.trim() || whatsapp
      const resumo = texto?.trim()
        ? ` "${texto.substring(0, 50)}${texto.length > 50 ? '...' : ''}"`
        : ''

      tocarSomNotificacao()
      success(`📱 ${nomeExibido}:${resumo}`)
      dispararNotificacaoBrowser(nome, whatsapp, texto)
    },
    [success]
  )

  // ── Processa nova mensagem recebida via Realtime ───────────────────────
  const processarNovaMensagem = useCallback(
    async (contatoId: string) => {
      if (!prontoRef.current) return

      // Busca o contato para pegar nome/whatsapp e exibir no toast
      const contato = contatosRef.current.find((c) => c.id === contatoId)

      if (contato) {
        // Busca o conteúdo da última mensagem
        const { data: msgs } = await supabase
          .from('mensagens_whatsapp_manual')
          .select('conteudo, tipo_midia, created_at')
          .eq('contato_id', contatoId)
          .eq('tipo_remetente', 'cliente')
          .order('created_at', { ascending: false })
          .limit(1)

        const ultima = msgs?.[0]
        const texto =
          ultima?.tipo_midia === 'texto'
            ? ultima.conteudo
            : ultima?.tipo_midia === 'audio'
            ? '🎵 Áudio'
            : ultima?.tipo_midia === 'imagem'
            ? '📷 Imagem'
            : ultima?.tipo_midia === 'video'
            ? '🎬 Vídeo'
            : ultima?.tipo_midia === 'pdf'
            ? '📄 PDF'
            : '📎 Arquivo'

        notificarUsuario(contato.nome, contato.whatsapp, texto)
      } else {
        // Contato não está em cache — notifica genericamente e recarrega
        notificarUsuario(null, contatoId, null)
      }

      // Atualiza badge
      atualizarBadge()
    },
    [notificarUsuario, atualizarBadge]
  )

  // ── 1. Carga inicial (baseline) ────────────────────────────────────────
  useEffect(() => {
    let cancelado = false

    const inicializar = async () => {
      try {
        const { data: contatos } = await supabase
          .from('contatos_whatsapp_manual')
          .select('id, nome, whatsapp, ultima_mensagem')

        if (contatos && !cancelado) {
          contatosRef.current = contatos as ContatoSnapshot[]
          for (const c of contatos as ContatoSnapshot[]) {
            ultimoMsgTimeRef.current.set(c.id, extrairTimeMs(c.ultima_mensagem))
          }
        }
      } finally {
        if (!cancelado) {
          prontoRef.current = true
          atualizarBadge()
        }
      }
    }

    inicializar()
    return () => { cancelado = true }
  }, [atualizarBadge])

  // ── 2. Realtime — novas mensagens do cliente ───────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('manual-notificacoes-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens_whatsapp_manual',
          filter: 'tipo_remetente=eq.cliente',
        },
        (payload) => {
          const nova = payload.new as { contato_id: string }
          if (nova?.contato_id) {
            processarNovaMensagem(nova.contato_id)
          }
        }
      )
      // Atualiza contatos em cache quando chegar novo contato
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'contatos_whatsapp_manual' },
        (payload) => {
          const novo = payload.new as ContatoSnapshot
          if (novo) contatosRef.current.push(novo)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [processarNovaMensagem])

  // ── 3. Polling de segurança a cada 15s ────────────────────────────────
  useEffect(() => {
    const poll = async () => {
      if (!prontoRef.current) return
      atualizarBadge()
    }
    const interval = setInterval(poll, 15000)
    return () => clearInterval(interval)
  }, [atualizarBadge])

  // ── Solicitar permissão de notificação do SO ───────────────────────────
  const solicitarPermissao = useCallback(async () => {
    if (typeof Notification === 'undefined') return
    const perm = await Notification.requestPermission()
    setPermissaoNotificacao(perm)
  }, [])

  return {
    permissaoNotificacao,
    solicitarPermissao,
    temNaoLido,
    totalNaoLidas,
  }
}
