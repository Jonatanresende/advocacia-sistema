import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import type { LeadAdv } from '../types'

export interface ChatwootMessage {
  id: number
  content: string | null
  message_type: 0 | 1 | 2 // 0 = recebida (lead), 1 = enviada (escritório), 2 = nota interna
  content_type: string
  created_at: number // epoch em segundos
  private: boolean
  attachments?: {
    id: number
    file_type: string
    data_url: string
    thumb_url?: string
  }[]
}

// ─── Lista de conversas (coluna da esquerda) ───────────────────────────────
export function useChatLeads() {
  const [leads, setLeads] = useState<LeadAdv[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { error } = useToast()
  // Evita que um novo ciclo comece antes do anterior terminar. Sem essa trava,
  // se o Chatwoot demorar mais que o intervalo do polling, as chamadas (uma
  // por lead) se empilham indefinidamente e entopem a fila de rede do
  // navegador — inclusive travando outras requisições manuais do usuário.
  const emAndamentoRef = useRef(false)

  const fetchLeads = useCallback(async () => {
    if (emAndamentoRef.current) return
    emAndamentoRef.current = true
    try {
      const { data, error: err } = await supabase
        .from('leads_adv')
        .select('*')
        .not('id_conversa_chatwoot', 'is', null)
        .order('ultima_mensagem', { ascending: false, nullsFirst: false })

      if (err) throw err

      const leadsBase = (data as LeadAdv[]) ?? []

      // Para cada lead, descobre o timestamp da última mensagem ENVIADA PELO LEAD (message_type 0).
      // Isso é imune a respostas automáticas da IA!
      const leadsComTimeLead = await Promise.all(
        leadsBase.map(async (lead) => {
          try {
            const { data: cData } = await supabase.functions.invoke('chatwoot-proxy', {
              body: { action: 'buscar_mensagens', lead_id: lead.id },
            })
            if (Array.isArray(cData?.payload)) {
              const msgs = cData.payload as ChatwootMessage[]
              const msgsLead = msgs.filter((m) => m.message_type === 0 && !m.private)
              if (msgsLead.length > 0) {
                const ultMsgLead = msgsLead[msgsLead.length - 1]
                return { ...lead, ultimaMensagemDoLeadMs: ultMsgLead.created_at * 1000 }
              }
            }
          } catch {
            // Em caso de falha temporária, usa fallback com a ultima_mensagem do banco
          }
          return {
            ...lead,
            ultimaMensagemDoLeadMs: lead.ultima_mensagem ? new Date(lead.ultima_mensagem).getTime() : 0,
          }
        })
      )

      setLeads(leadsComTimeLead)
    } catch {
      error('Não foi possível carregar a lista de conversas.')
    } finally {
      setIsLoading(false)
      emAndamentoRef.current = false
    }
  }, [error])

  useEffect(() => {
    fetchLeads()
    // Intervalo mais espaçado: o Realtime abaixo já cobre a atualização
    // instantânea a cada mudança real no banco. Esse polling é só uma rede
    // de segurança — não precisa ser agressivo, ainda mais fazendo 1
    // requisição ao Chatwoot por lead a cada execução.
    const interval = setInterval(fetchLeads, 10000)

    // Inscreve no Realtime para atualização instantânea em tempo real
    const channel = supabase
      .channel('use-chat-leads-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads_adv' },
        () => {
          fetchLeads()
        }
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [fetchLeads])

  return { leads, isLoading, refetch: fetchLeads }
}

// ─── Conversa aberta (coluna da direita) ───────────────────────────────────
export function useChatConversa(lead: LeadAdv | null) {
  const [mensagens, setMensagens] = useState<ChatwootMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [atendimentoHumanoAtivo, setAtendimentoHumanoAtivo] = useState(false)
  const [atendidoPor, setAtendidoPor] = useState<string | null>(null)
  const [isLoadingMais, setIsLoadingMais] = useState(false)
  const [temMaisAntigas, setTemMaisAntigas] = useState(true)
  const { error, success } = useToast()
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Mesma trava do useChatLeads: se o Chatwoot demorar mais que o intervalo
  // do polling, evita empilhar chamadas novas por cima das que ainda não
  // terminaram.
  const emAndamentoRef = useRef(false)

  const fetchMensagens = useCallback(async (leadId: string, silencioso = false) => {
    if (silencioso && emAndamentoRef.current) return
    emAndamentoRef.current = true
    if (!silencioso) setIsLoading(true)
    try {
      const { data, error: err } = await supabase.functions.invoke('chatwoot-proxy', {
        body: { action: 'buscar_mensagens', lead_id: leadId },
      })
      if (err) throw err
      if (data?.error) throw new Error(data.error)
      // Notas internas do Chatwoot (message_type 2 — ex: mensagens de sistema
      // como erros do agent bot) nunca fazem parte da conversa com o lead.
      const todasMsgs = (data?.payload as ChatwootMessage[]) ?? []
      const recentes = todasMsgs.filter((m) => m.message_type !== 2)
      setMensagens((atuais) => {
        // Troca de conversa (não-silencioso) começa do zero.
        if (!silencioso || atuais.length === 0) return recentes
        // Polling silencioso: mescla com o que já está na tela — inclusive
        // páginas antigas trazidas por "carregar mensagens anteriores" —
        // em vez de substituir tudo e apagar esse histórico.
        const mapa = new Map(atuais.map((m) => [m.id, m]))
        for (const m of recentes) mapa.set(m.id, m)
        return Array.from(mapa.values()).sort((a, b) => a.created_at - b.created_at)
      })
      // "Tem mais antigas" só é recalculado na carga inicial da conversa —
      // o polling só atualiza a ponta recente e não deve mexer nisso.
      if (!silencioso) setTemMaisAntigas(todasMsgs.length >= 20)
    } catch (err) {
      console.error('Erro ao buscar mensagens:', err)
      if (!silencioso) error('Não foi possível carregar as mensagens dessa conversa.')
    } finally {
      if (!silencioso) setIsLoading(false)
      emAndamentoRef.current = false
    }
  }, [error])

  // Busca a página anterior (mensagens mais antigas que a mais antiga já carregada)
  // e prepende na lista, sem duplicar e sem perder o filtro de notas internas.
  const carregarMensagensAntigas = useCallback(async () => {
    if (!lead || isLoadingMais || !temMaisAntigas || mensagens.length === 0) return
    setIsLoadingMais(true)
    try {
      const maisAntiga = mensagens[0]
      const { data, error: err } = await supabase.functions.invoke('chatwoot-proxy', {
        body: { action: 'buscar_mensagens', lead_id: lead.id, before: maisAntiga.id },
      })
      if (err) throw err
      if (data?.error) throw new Error(data.error)
      const pagina = ((data?.payload as ChatwootMessage[]) ?? []).filter((m) => m.message_type !== 2)
      setTemMaisAntigas(pagina.length >= 20)
      if (pagina.length > 0) {
        setMensagens((atuais) => {
          const idsExistentes = new Set(atuais.map((m) => m.id))
          const novas = pagina.filter((m) => !idsExistentes.has(m.id))
          return [...novas, ...atuais]
        })
      }
    } catch {
      error('Não foi possível carregar mensagens anteriores.')
    } finally {
      setIsLoadingMais(false)
    }
  }, [lead, mensagens, isLoadingMais, temMaisAntigas, error])

  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    setMensagens([])
    // Sincroniza o status local com o lead selecionado (só acontece ao trocar de conversa)
    setAtendimentoHumanoAtivo(lead?.atendimento_humano_ativo ?? false)
    setAtendidoPor(lead?.atendido_por ?? null)

    if (!lead) return

    fetchMensagens(lead.id)
    // Poll rápido a cada 2 segundos enquanto a conversa está aberta
    pollingRef.current = setInterval(() => fetchMensagens(lead.id, true), 2000)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [lead, fetchMensagens])

  const enviarMensagem = useCallback(async (texto: string, arquivo?: File | null) => {
    if (!lead) return false
    if (!texto.trim() && !arquivo) return false
    setIsSending(true)
    try {
      let data, err
      if (arquivo) {
        const formData = new FormData()
        formData.append('action', 'enviar_mensagem')
        formData.append('lead_id', lead.id)
        if (texto.trim()) formData.append('texto', texto.trim())
        formData.append('anexo', arquivo, arquivo.name)
          ; ({ data, error: err } = await supabase.functions.invoke('chatwoot-proxy', { body: formData }))
      } else {
        ; ({ data, error: err } = await supabase.functions.invoke('chatwoot-proxy', {
          body: { action: 'enviar_mensagem', lead_id: lead.id, texto },
        }))
      }
      if (err) throw err
      if (data?.error) throw new Error(data.error)
      // Mandar mensagem manual já assume o atendimento automaticamente
      setAtendimentoHumanoAtivo(true)
      await fetchMensagens(lead.id, true)
      return true
    } catch {
      error('Não foi possível enviar a mensagem.')
      return false
    } finally {
      setIsSending(false)
    }
  }, [lead, error, fetchMensagens])

  const assumirAtendimento = useCallback(async () => {
    if (!lead) return
    try {
      const { data, error: err } = await supabase.functions.invoke('chatwoot-proxy', {
        body: { action: 'assumir_atendimento', lead_id: lead.id },
      })
      if (err) throw err
      if (data?.error) throw new Error(data.error)
      setAtendimentoHumanoAtivo(true)
      success('Atendimento assumido. A IA não vai mais responder esse lead.')
    } catch {
      error('Não foi possível assumir o atendimento.')
    }
  }, [lead, error, success])

  const devolverParaIA = useCallback(async () => {
    if (!lead) return
    try {
      const { data, error: err } = await supabase.functions.invoke('chatwoot-proxy', {
        body: { action: 'devolver_para_ia', lead_id: lead.id },
      })
      if (err) throw err
      if (data?.error) throw new Error(data.error)
      setAtendimentoHumanoAtivo(false)
      setAtendidoPor(null)
      success('Atendimento devolvido para o assistente virtual.')
    } catch {
      error('Não foi possível devolver o atendimento para a IA.')
    }
  }, [lead, error, success])

  return {
    mensagens,
    isLoading,
    isSending,
    isLoadingMais,
    temMaisAntigas,
    carregarMensagensAntigas,
    atendimentoHumanoAtivo,
    atendidoPor,
    enviarMensagem,
    assumirAtendimento,
    devolverParaIA,
  }
}