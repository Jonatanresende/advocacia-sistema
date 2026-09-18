import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import type { MensagemInterna, Perfil } from '../types'

/**
 * Toca dois bipes suaves ascendentes (padrão iOS) via Web Audio API.
 * Idêntico ao som usado no chat de atendimento de leads.
 */
async function tocarSomNotificacao() {
    try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const ctx = new AudioCtx()
        if (ctx.state === 'suspended') await ctx.resume()
        const tocarBipe = (frequencia: number, inicio: number, duracao: number, volume: number) => {
            const osc = ctx.createOscillator()
            const ganho = ctx.createGain()
            osc.connect(ganho)
            ganho.connect(ctx.destination)
            osc.type = 'sine'
            osc.frequency.setValueAtTime(frequencia, ctx.currentTime + inicio)
            osc.frequency.linearRampToValueAtTime(frequencia * 1.08, ctx.currentTime + inicio + duracao * 0.6)
            ganho.gain.setValueAtTime(0, ctx.currentTime + inicio)
            ganho.gain.linearRampToValueAtTime(volume, ctx.currentTime + inicio + 0.01)
            ganho.gain.setValueAtTime(volume, ctx.currentTime + inicio + duracao * 0.5)
            ganho.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracao)
            osc.start(ctx.currentTime + inicio)
            osc.stop(ctx.currentTime + inicio + duracao + 0.05)
        }
        tocarBipe(880, 0, 0.12, 0.25)
        tocarBipe(1175, 0.15, 0.12, 0.25)
        setTimeout(() => ctx.close(), 800)
    } catch {
        // Navegador sem suporte à Web Audio API — ignora silenciosamente
    }
}

export interface ConversaResumo {
    usuario: Perfil
    ultimaMensagem: MensagemInterna | null
    naoLidas: number
}

// ─── Lista de conversas (coluna da esquerda) ───────────────────────────────
export function useMensagensConversas() {
    const { perfil } = useAuth()
    const [conversas, setConversas] = useState<ConversaResumo[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const { error } = useToast()
    const meuId = perfil?.id

    const fetchConversas = useCallback(async () => {
        if (!meuId) return
        try {
            const { data: usuarios, error: errUsuarios } = await supabase
                .from('perfis')
                .select('*')
                .eq('ativo', true)
                .neq('id', meuId)
                .order('nome')
            if (errUsuarios) throw errUsuarios

            const { data: mensagens, error: errMsgs } = await supabase
                .from('mensagens_internas')
                .select('*')
                .or(`remetente_id.eq.${meuId},destinatario_id.eq.${meuId}`)
                .order('created_at', { ascending: false })
            if (errMsgs) throw errMsgs

            const porUsuario = new Map<string, ConversaResumo>()
            for (const u of (usuarios as Perfil[]) ?? []) {
                porUsuario.set(u.id, { usuario: u, ultimaMensagem: null, naoLidas: 0 })
            }
            for (const m of (mensagens as MensagemInterna[]) ?? []) {
                const outroId = m.remetente_id === meuId ? m.destinatario_id : m.remetente_id
                const entrada = porUsuario.get(outroId)
                if (!entrada) continue
                if (!entrada.ultimaMensagem) entrada.ultimaMensagem = m
                if (m.destinatario_id === meuId && !m.lida) entrada.naoLidas += 1
            }

            const lista = Array.from(porUsuario.values()).sort((a, b) => {
                const ta = a.ultimaMensagem ? new Date(a.ultimaMensagem.created_at).getTime() : 0
                const tb = b.ultimaMensagem ? new Date(b.ultimaMensagem.created_at).getTime() : 0
                return tb - ta
            })
            setConversas(lista)
        } catch {
            error('Não foi possível carregar as conversas.')
        } finally {
            setIsLoading(false)
        }
    }, [meuId, error])

    useEffect(() => {
        fetchConversas()
    }, [fetchConversas])

    useEffect(() => {
        if (!meuId) return
        const channel = supabase
            .channel(`mensagens-lista-${meuId}-${Math.random()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens_internas' }, (payload) => {
                const linha = (payload.new ?? payload.old) as MensagemInterna
                if (linha.remetente_id === meuId || linha.destinatario_id === meuId) fetchConversas()
            })
            .subscribe()
        return () => {
            supabase.removeChannel(channel)
        }
    }, [meuId, fetchConversas])

    const totalNaoLidas = conversas.reduce((soma, c) => soma + c.naoLidas, 0)
    return { conversas, isLoading, totalNaoLidas, refetch: fetchConversas }
}

// ─── Mensagens de uma conversa aberta ───────────────────────────────────────
export function useMensagensConversa(outroUsuarioId: string | null) {
    const { perfil } = useAuth()
    const [mensagens, setMensagens] = useState<MensagemInterna[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSending, setIsSending] = useState(false)
    const { error } = useToast()
    const meuId = perfil?.id

    const fetchMensagens = useCallback(async () => {
        if (!meuId || !outroUsuarioId) return
        setIsLoading(true)
        try {
            const { data, error: err } = await supabase
                .from('mensagens_internas')
                .select('*')
                .or(
                    `and(remetente_id.eq.${meuId},destinatario_id.eq.${outroUsuarioId}),and(remetente_id.eq.${outroUsuarioId},destinatario_id.eq.${meuId})`
                )
                .order('created_at', { ascending: true })
            if (err) throw err
            setMensagens((data as MensagemInterna[]) ?? [])

            const idsNaoLidas = ((data as MensagemInterna[]) ?? [])
                .filter((m) => m.destinatario_id === meuId && !m.lida)
                .map((m) => m.id)
            if (idsNaoLidas.length > 0) {
                await supabase.from('mensagens_internas').update({ lida: true }).in('id', idsNaoLidas)
            }
        } catch {
            error('Não foi possível carregar as mensagens.')
        } finally {
            setIsLoading(false)
        }
    }, [meuId, outroUsuarioId, error])

    useEffect(() => {
        fetchMensagens()
    }, [fetchMensagens])

    useEffect(() => {
        if (!meuId || !outroUsuarioId) return
        const channel = supabase
            .channel(`mensagens-conversa-${meuId}-${outroUsuarioId}-${Math.random()}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_internas' }, (payload) => {
                const nova = payload.new as MensagemInterna
                const pertence =
                    (nova.remetente_id === meuId && nova.destinatario_id === outroUsuarioId) ||
                    (nova.remetente_id === outroUsuarioId && nova.destinatario_id === meuId)
                if (!pertence) return
                setMensagens((prev) => [...prev, nova])
                // Toca som e marca como lida apenas quando a mensagem vier do OUTRO usuário
                if (nova.destinatario_id === meuId) {
                    tocarSomNotificacao()
                    supabase.from('mensagens_internas').update({ lida: true }).eq('id', nova.id).then()
                }
            })
            .subscribe()
        return () => {
            supabase.removeChannel(channel)
        }
    }, [meuId, outroUsuarioId])

    const enviarMensagem = useCallback(
        async (conteudo: string, arquivo?: File | null) => {
            const texto = conteudo.trim()
            if (!texto && !arquivo) return
            if (!meuId || !outroUsuarioId) return
            setIsSending(true)
            try {
                let anexo_url: string | null = null
                let anexo_tipo: string | null = null

                if (arquivo) {
                    // Determina o tipo do anexo
                    if (arquivo.type.startsWith('audio')) {
                        anexo_tipo = 'audio'
                    } else if (arquivo.type.startsWith('image')) {
                        anexo_tipo = 'image'
                    } else if (arquivo.type === 'application/pdf') {
                        anexo_tipo = 'pdf'
                    } else {
                        anexo_tipo = 'file'
                    }

                    // Faz upload no Storage
                    const ext = arquivo.name.split('.').pop() || 'bin'
                    const caminho = `${meuId}/${Date.now()}.${ext}`
                    const { error: errUpload } = await supabase.storage
                        .from('mensagens_internas_anexos')
                        .upload(caminho, arquivo, { upsert: false })
                    if (errUpload) throw errUpload

                    const { data: urlData } = supabase.storage
                        .from('mensagens_internas_anexos')
                        .getPublicUrl(caminho)
                    anexo_url = urlData.publicUrl
                }

                const { error: err } = await supabase
                    .from('mensagens_internas')
                    .insert({
                        remetente_id: meuId,
                        destinatario_id: outroUsuarioId,
                        conteudo: texto || null,
                        anexo_url,
                        anexo_tipo,
                    })
                if (err) throw err
            } catch {
                error('Não foi possível enviar a mensagem.')
            } finally {
                setIsSending(false)
            }
        },
        [meuId, outroUsuarioId, error]
    )

    return { mensagens, isLoading, isSending, enviarMensagem }
}