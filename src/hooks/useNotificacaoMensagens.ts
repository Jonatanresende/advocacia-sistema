import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { MensagemInterna } from '../types'

/**
 * Toca dois bipes suaves ascendentes (padrão iOS) via Web Audio API.
 * Usa ctx.resume() para garantir que o AudioContext não esteja suspenso
 * (navegadores modernos suspendem o contexto até uma interação do usuário).
 */
async function tocarSomNotificacao() {
    try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        const ctx = new AudioCtx()

        // Garante que o contexto não está suspenso (política de autoplay dos navegadores)
        if (ctx.state === 'suspended') {
            await ctx.resume()
        }

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
        // Sem suporte à Web Audio API — ignora silenciosamente
    }
}

/**
 * Hook global de notificação de mensagens internas entre usuários.
 *
 * Deve ser usado em um componente que SEMPRE está montado (ex.: Layout),
 * para garantir que o som toque independente da página aberta.
 *
 * Usa um período de "warm-up" de 3 segundos após a montagem para não
 * tocar o som ao carregar a página (mensagens já existentes não contam).
 */
export function useNotificacaoMensagens() {
    const { perfil } = useAuth()
    const meuId = perfil?.id

    // Evita tocar o som nas primeiras mensagens carregadas (estado inicial)
    const prontoRef = useRef(false)

    useEffect(() => {
        if (!meuId) return

        // Aguarda 3 segundos antes de começar a alertar, para não tocar
        // o som de mensagens que já existiam antes de abrir o sistema.
        const timer = setTimeout(() => {
            prontoRef.current = true
        }, 3000)

        const channel = supabase
            .channel(`notif-mensagens-${meuId}-${Math.random()}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'mensagens_internas',
                    filter: `destinatario_id=eq.${meuId}`,
                },
                (_payload) => {
                    const nova = _payload.new as MensagemInterna
                    // Só notifica se o destinatário sou eu e já passou o warm-up
                    if (nova.destinatario_id === meuId && prontoRef.current) {
                        tocarSomNotificacao()
                    }
                }
            )
            .subscribe()

        return () => {
            clearTimeout(timer)
            prontoRef.current = false
            supabase.removeChannel(channel)
        }
    }, [meuId])
}
