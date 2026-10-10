import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import type { ContatoManual, MensagemManual } from '../types'

/**
 * Normaliza número de telefone brasileiro para o padrão de 9 dígitos.
 * Evita contatos duplicados quando a Evolution API usa o formato antigo (8 dígitos).
 * Ex: 558594517619 → 5585994517619
 */
function normalizarNumero(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length === 12) {
    return digits.slice(0, 4) + '9' + digits.slice(4)
  }
  return digits
}

// ─── Lista de conversas do 2º WhatsApp (coluna da esquerda) ────────────────
export function useContatosManual() {
  const [contatos, setContatos] = useState<ContatoManual[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { error, success } = useToast()

  const fetchContatos = useCallback(async () => {
    try {
      // 1. Busca todos os contatos do 2º WhatsApp
      const { data: contatosData, error: errContatos } = await supabase
        .from('contatos_whatsapp_manual')
        .select('*')
        .order('ultima_mensagem', { ascending: false, nullsFirst: false })

      if (errContatos) throw errContatos

      const listaBase = (contatosData as ContatoManual[]) ?? []

      // 2. Busca contagem de mensagens não lidas por contato
      const { data: msgsNaoLidas, error: errMsgs } = await supabase
        .from('mensagens_whatsapp_manual')
        .select('contato_id')
        .eq('lida', false)
        .eq('tipo_remetente', 'cliente')

      if (errMsgs) throw errMsgs

      const mapaNaoLidas = new Map<string, number>()
      for (const m of msgsNaoLidas ?? []) {
        mapaNaoLidas.set(m.contato_id, (mapaNaoLidas.get(m.contato_id) ?? 0) + 1)
      }

      const listaComNaoLidas = listaBase.map((c) => ({
        ...c,
        naoLidas: mapaNaoLidas.get(c.id) ?? 0,
        ultimaMensagemMs: c.ultima_mensagem ? new Date(c.ultima_mensagem).getTime() : 0,
      }))

      setContatos(listaComNaoLidas)
    } catch (err) {
      console.error('Erro ao buscar contatos manuais:', err)
      error('Não foi possível carregar os contatos do atendimento manual.')
    } finally {
      setIsLoading(false)
    }
  }, [error])

  // Salvar ou cadastrar um novo contato
  const salvarContato = useCallback(
    async (nome: string, whatsapp: string, observacoes?: string) => {
      try {
        const numLimpo = normalizarNumero(whatsapp)
        if (!numLimpo) throw new Error('Número de WhatsApp inválido')

        const { data, error: err } = await supabase
          .from('contatos_whatsapp_manual')
          .upsert(
            {
              nome: nome.trim() || null,
              whatsapp: numLimpo,
              observacoes: observacoes?.trim() || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'whatsapp' }
          )
          .select()
          .single()

        if (err) throw err
        success('Contato salvo com sucesso!')
        fetchContatos()
        return data as ContatoManual
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao salvar contato.'
        error(msg)
        return null
      }
    },
    [error, success, fetchContatos]
  )

  // Editar apenas o nome / observações do contato
  const atualizarContato = useCallback(
    async (id: string, nome: string, observacoes?: string) => {
      try {
        const { error: err } = await supabase
          .from('contatos_whatsapp_manual')
          .update({
            nome: nome.trim() || null,
            observacoes: observacoes?.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)

        if (err) throw err
        success('Contato atualizado!')
        fetchContatos()
        return true
      } catch {
        error('Não foi possível atualizar o contato.')
        return false
      }
    },
    [error, success, fetchContatos]
  )

  useEffect(() => {
    fetchContatos()

    // Supabase Realtime nas duas tabelas
    const channel = supabase
      .channel('realtime-contatos-whatsapp-manual')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contatos_whatsapp_manual' },
        () => fetchContatos()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mensagens_whatsapp_manual' },
        () => fetchContatos()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchContatos])

  return {
    contatos,
    isLoading,
    refetch: fetchContatos,
    salvarContato,
    atualizarContato,
  }
}

// ─── Conversa Aberta (coluna da direita) ───────────────────────────────────
export function useConversaManual(contato: ContatoManual | null) {
  const { perfil } = useAuth()
  const [mensagens, setMensagens] = useState<MensagemManual[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const { error } = useToast()
  const emAndamentoRef = useRef(false)

  const fetchMensagens = useCallback(
    async (contatoId: string, silencioso = false) => {
      if (silencioso && emAndamentoRef.current) return
      emAndamentoRef.current = true
      if (!silencioso) setIsLoading(true)

      try {
        const { data, error: err } = await supabase
          .from('mensagens_whatsapp_manual')
          .select('*, usuario:perfis(nome)')
          .eq('contato_id', contatoId)
          .order('created_at', { ascending: true })

        if (err) throw err

        const listaMsgs = (data as MensagemManual[]) ?? []
        setMensagens(listaMsgs)

        // Marcar mensagens do cliente como lidas
        const idsNaoLidas = listaMsgs
          .filter((m) => m.tipo_remetente === 'cliente' && !m.lida)
          .map((m) => m.id)

        if (idsNaoLidas.length > 0) {
          await supabase
            .from('mensagens_whatsapp_manual')
            .update({ lida: true })
            .in('id', idsNaoLidas)
        }
      } catch (err) {
        console.error('Erro ao buscar mensagens manuais:', err)
        if (!silencioso) error('Não foi possível carregar as mensagens.')
      } finally {
        if (!silencioso) setIsLoading(false)
        emAndamentoRef.current = false
      }
    },
    [error]
  )

  useEffect(() => {
    setMensagens([])
    if (!contato) return

    fetchMensagens(contato.id)

    // Inscrição Realtime na conversa aberta
    const channel = supabase
      .channel(`conversa-manual-${contato.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mensagens_whatsapp_manual',
          filter: `contato_id=eq.${contato.id}`,
        },
        () => fetchMensagens(contato.id, true)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [contato, fetchMensagens])

  const enviarMensagem = useCallback(
    async (texto: string, arquivo?: File | null) => {
      if (!contato) return false
      if (!texto.trim() && !arquivo) return false

      setIsSending(true)
      try {
        let midiaUrl: string | null = null
        let tipoMidia: MensagemManual['tipo_midia'] = 'texto'
        let metadataObj: Record<string, unknown> = {}

        // Upload de mídia para o bucket Supabase Storage se houver arquivo
        if (arquivo) {
          const maxBytes = 50 * 1024 * 1024 // 50MB
          if (arquivo.size > maxBytes) {
            error('O arquivo selecionado excede o tamanho máximo de 50 MB.')
            return false
          }

          const ext = arquivo.name.split('.').pop() || 'bin'
          const fileName = `${contato.id}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`

          const { error: uploadErr } = await supabase.storage
            .from('whatsapp-manual-midias')
            .upload(fileName, arquivo, { cacheControl: '3600', upsert: true })

          if (uploadErr) throw uploadErr

          const { data: publicUrlData } = supabase.storage
            .from('whatsapp-manual-midias')
            .getPublicUrl(fileName)

          midiaUrl = publicUrlData.publicUrl

          if (arquivo.type.startsWith('image/')) tipoMidia = 'imagem'
          else if (arquivo.type.startsWith('video/')) tipoMidia = 'video'
          else if (arquivo.type.startsWith('audio/')) tipoMidia = 'audio'
          else if (arquivo.type.includes('pdf')) tipoMidia = 'pdf'
          else tipoMidia = 'arquivo'

          metadataObj = {
            nomeOriginal: arquivo.name,
            tamanhoBytes: arquivo.size,
            mimeType: arquivo.type,
          }
        }

        // Tenta enviar via Edge Function whatsapp-manual-enviar
        let enviouViaEdge = false
        try {
          const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke(
            'whatsapp-manual-enviar',
            {
              body: {
                contato_id: contato.id,
                whatsapp: contato.whatsapp,
                texto: texto.trim() || undefined,
                midia_url: midiaUrl || undefined,
                tipo_midia: tipoMidia,
                metadata: metadataObj,
              },
            }
          )
          if (!edgeErr && !edgeRes?.error) {
            enviouViaEdge = true
          }
        } catch {
          // Se a Edge Function ainda não estiver publicada (passo 3), cai no fallback local
          enviouViaEdge = false
        }

        // Se a Edge Function não inseriu no banco (ou deu fallback local), grava no Supabase diretamente
        if (!enviouViaEdge) {
          const { error: dbErr } = await supabase
            .from('mensagens_whatsapp_manual')
            .insert({
              contato_id: contato.id,
              usuario_id: perfil?.id || null,
              tipo_remetente: 'atendente',
              conteudo: texto.trim() || null,
              tipo_midia: tipoMidia,
              midia_url: midiaUrl,
              metadata: metadataObj,
              lida: true,
            })

          if (dbErr) throw dbErr

          // Atualiza ultima_mensagem no contato
          await supabase
            .from('contatos_whatsapp_manual')
            .update({ ultima_mensagem: new Date().toISOString() })
            .eq('id', contato.id)
        }

        await fetchMensagens(contato.id, true)
        return true
      } catch (err: unknown) {
        console.error('Erro ao enviar mensagem:', err)
        const msgText = err instanceof Error ? err.message : ''
        if (msgText.includes('exceeded the maximum allowed size') || msgText.includes('entity too large')) {
          error('O arquivo é maior do que o limite permitido pelo servidor (50 MB).')
        } else {
          error('Não foi possível enviar a mensagem.')
        }
        return false
      } finally {
        setIsSending(false)
      }
    },
    [contato, perfil, error, fetchMensagens]
  )

  return {
    mensagens,
    isLoading,
    isSending,
    enviarMensagem,
    refetch: () => contato && fetchMensagens(contato.id),
  }
}
