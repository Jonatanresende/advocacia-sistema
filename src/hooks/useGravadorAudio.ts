import { useCallback, useEffect, useRef, useState } from 'react'
import Recorder from 'opus-recorder'

export interface AudioGravado {
  url: string
  arquivo: File
}

/**
 * Grava áudio do microfone e já codifica em Ogg/Opus no navegador (via WASM),
 * que é o formato que o WhatsApp espera pra nota de voz. O MediaRecorder nativo
 * do navegador só grava em webm, que costuma ser descartado no repasse pro WhatsApp.
 *
 * Fluxo igual ao WhatsApp Web: iniciar -> parar -> preview -> enviar/descartar.
 */
export function useGravadorAudio() {
  const [gravando, setGravando] = useState(false)
  const [tempoGravacao, setTempoGravacao] = useState(0)
  const [audioGravado, setAudioGravado] = useState<AudioGravado | null>(null)

  const recorderRef = useRef<Recorder | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const limparIntervalo = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const iniciarGravacao = useCallback(async () => {
    const recorder = new Recorder({
      encoderPath: '/encoderWorker.min.js',
      streamPages: false, // só recebe o arquivo pronto, de uma vez, ao parar
      numberOfChannels: 1,
      encoderSampleRate: 24000, // nota de voz não precisa de qualidade alta; mantém o arquivo leve
      encoderApplication: 2048, // otimizado pra voz (VOIP), não música
    })

    recorder.ondataavailable = (typedArray) => {
      const blob = new Blob([typedArray.slice().buffer], { type: 'audio/ogg' })
      const arquivo = new File([blob], `audio-${Date.now()}.ogg`, { type: 'audio/ogg; codecs=opus' })
      setAudioGravado({ url: URL.createObjectURL(blob), arquivo })
    }

    recorderRef.current = recorder
    await recorder.start() // precisa ser chamado a partir de um clique do usuário
    setGravando(true)
    setTempoGravacao(0)
    intervalRef.current = setInterval(() => setTempoGravacao((t) => t + 1), 1000)
  }, [])

  const pararGravacao = useCallback(() => {
    limparIntervalo()
    recorderRef.current?.stop()
    setGravando(false)
  }, [])

  const cancelarGravacao = useCallback(() => {
    limparIntervalo()
    if (recorderRef.current) {
      // Descarta o resultado antes de parar, pra não gerar preview de gravação cancelada
      recorderRef.current.ondataavailable = () => {}
      recorderRef.current.stop()
    }
    setGravando(false)
    setTempoGravacao(0)
  }, [])

  const descartarAudioGravado = useCallback(() => {
    setAudioGravado((atual) => {
      if (atual) URL.revokeObjectURL(atual.url)
      return null
    })
    setTempoGravacao(0)
  }, [])

  // Libera microfone / worker se o componente for desmontado no meio do processo
  useEffect(() => {
    return () => {
      limparIntervalo()
      recorderRef.current?.close()
    }
  }, [])

  return {
    gravando,
    tempoGravacao,
    audioGravado,
    iniciarGravacao,
    pararGravacao,
    cancelarGravacao,
    descartarAudioGravado,
  }
}
