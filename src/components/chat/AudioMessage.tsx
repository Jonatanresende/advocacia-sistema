import { useEffect, useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'

function formatarTempo(segundos: number) {
  if (!isFinite(segundos) || segundos < 0) return '0:00'
  const min = Math.floor(segundos / 60)
  const seg = Math.floor(segundos % 60)
  return `${min}:${seg.toString().padStart(2, '0')}`
}

interface AudioMessageProps {
  src: string
  /** true = bolha enviada (fundo escuro/primary), false = bolha recebida (fundo claro) */
  outgoing: boolean
}

export default function AudioMessage({ src, outgoing }: AudioMessageProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [tocando, setTocando] = useState(false)
  const [atual, setAtual] = useState(0)
  const [duracao, setDuracao] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => setAtual(audio.currentTime)
    const onLoadedMeta = () => setDuracao(audio.duration || 0)
    const onEnded = () => {
      setTocando(false)
      setAtual(0)
    }
    const onPause = () => setTocando(false)
    const onPlay = () => setTocando(true)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMeta)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('play', onPlay)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMeta)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('play', onPlay)
    }
  }, [])

  const alternarPlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (audio.paused) {
      // Pausa qualquer outro áudio do chat que esteja tocando (igual WhatsApp: só um por vez)
      document.querySelectorAll<HTMLAudioElement>('audio[data-chat-audio]').forEach((el) => {
        if (el !== audio) el.pause()
      })
      audio.play()
    } else {
      audio.pause()
    }
  }

  const buscarPosicao = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return
    const novoTempo = Number(e.target.value)
    audio.currentTime = novoTempo
    setAtual(novoTempo)
  }

  const progresso = duracao > 0 ? (atual / duracao) * 100 : 0
  const tempoExibido = tocando || atual > 0 ? atual : duracao

  return (
    <div className="flex items-center gap-2.5 min-w-[220px] max-w-[260px] py-0.5">
      <audio ref={audioRef} src={src} data-chat-audio preload="metadata" />

      <button
        type="button"
        onClick={alternarPlay}
        aria-label={tocando ? 'Pausar áudio' : 'Tocar áudio'}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          outgoing
            ? 'bg-white/20 hover:bg-white/30 text-white'
            : 'bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 text-[var(--primary)]'
        }`}
      >
        {tocando ? (
          <Pause size={15} fill="currentColor" />
        ) : (
          <Play size={15} fill="currentColor" className="ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <input
          type="range"
          min={0}
          max={duracao || 0}
          step={0.01}
          value={atual}
          onChange={buscarPosicao}
          className={`audio-seek w-full ${outgoing ? 'audio-seek--outgoing' : 'audio-seek--incoming'}`}
          style={{
            // Preenche a trilha até a posição atual, como no WhatsApp
            backgroundImage: `linear-gradient(to right, currentColor ${progresso}%, transparent ${progresso}%)`,
          }}
        />
        <div className={`text-[10px] mt-1 tabular-nums ${outgoing ? 'text-white/70' : 'text-[var(--text-muted)]'}`}>
          {formatarTempo(tempoExibido)}
        </div>
      </div>
    </div>
  )
}
