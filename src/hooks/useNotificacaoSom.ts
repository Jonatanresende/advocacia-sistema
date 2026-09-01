import { useCallback, useRef } from 'react'

/**
 * Gera e toca um som de notificação estilo iOS usando a Web Audio API.
 * Dois bipes curtos ascendentes — semelhante ao som padrão de mensagem do iPhone.
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

    // Dois bipes ascendentes (padrão iPhone)
    tocarBipe(880, 0, 0.12, 0.25)
    tocarBipe(1175, 0.15, 0.12, 0.25)

    setTimeout(() => ctx.close(), 800)
  } catch {
    // Navegador sem suporte à Web Audio API — silencia silenciosamente
  }
}

/**
 * Hook que monitora qualquer lead da lista e toca o som de notificação
 * quando o campo `ultima_mensagem` de qualquer lead avança (ou seja,
 * uma nova mensagem chegou nesse lead — não importa qual chat está aberto).
 *
 * Uso:
 *   const { verificarLeads } = useNotificacaoSom()
 *   // Chame a cada atualização da lista de leads:
 *   verificarLeads(leads)
 */
export function useNotificacaoSom() {
  // Mapa: leadId → última ultima_mensagem conhecida (ISO string)
  const mapaRef = useRef<Map<string, string>>(new Map())
  const inicializadoRef = useRef(false)

  const verificarLeads = useCallback(
    (leads: { id: string; ultima_mensagem: string | null }[]) => {
      if (!leads || leads.length === 0) return

      if (!inicializadoRef.current) {
        // Primeira chamada: apenas registra o estado atual como baseline
        for (const lead of leads) {
          if (lead.ultima_mensagem) {
            mapaRef.current.set(lead.id, lead.ultima_mensagem)
          }
        }
        inicializadoRef.current = true
        return
      }

      let novasMensagens = false

      for (const lead of leads) {
        if (!lead.ultima_mensagem) continue

        const anterior = mapaRef.current.get(lead.id)

        if (anterior === undefined) {
          // Lead novo que apareceu depois da inicialização — apenas registra
          mapaRef.current.set(lead.id, lead.ultima_mensagem)
          continue
        }

        if (lead.ultima_mensagem > anterior) {
          // ultima_mensagem avançou → nova mensagem nesse lead
          mapaRef.current.set(lead.id, lead.ultima_mensagem)
          novasMensagens = true
        }
      }

      if (novasMensagens) {
        tocarSomNotificacao()
      }
    },
    []
  )

  return { verificarLeads }
}
