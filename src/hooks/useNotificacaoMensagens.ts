import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useNotificationSound } from '../contexts/NotificationSoundContext'
import type { MensagemInterna } from '../types'



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
    const { tocarSomCanal } = useNotificationSound()
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
                        tocarSomCanal('mensagens')
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
