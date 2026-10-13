import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import type { CanalNotificacaoSom, NotificacoesSomConfig } from '../types'

interface NotificationSoundContextType {
  config: NotificacoesSomConfig
  isSomAtivo: (canal: CanalNotificacaoSom) => boolean
  toggleSom: (canal: CanalNotificacaoSom) => Promise<void>
  setSom: (canal: CanalNotificacaoSom, ativo: boolean) => Promise<void>
  pausarTodos: () => Promise<void>
  ativarTodos: () => Promise<void>
  tocarSomCanal: (canal: CanalNotificacaoSom) => void
  tocarSomTeste: () => void
  isUpdating: boolean
}

const DEFAULT_CONFIG: NotificacoesSomConfig = {
  chat: true,
  manual: true,
  mensagens: true,
}

const NotificationSoundContext = createContext<NotificationSoundContextType | undefined>(undefined)

/**
 * Toca dois bipes suaves ascendentes estilo iOS via Web Audio API.
 */
export async function reproduzirBipeNotificacao() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext

    if (!AudioCtx) return

    const ctx = new AudioCtx()
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
      osc.frequency.linearRampToValueAtTime(
        frequencia * 1.08,
        ctx.currentTime + inicio + duracao * 0.6
      )

      ganho.gain.setValueAtTime(0, ctx.currentTime + inicio)
      ganho.gain.linearRampToValueAtTime(volume, ctx.currentTime + inicio + 0.01)
      ganho.gain.setValueAtTime(volume, ctx.currentTime + inicio + duracao * 0.5)
      ganho.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracao)

      osc.start(ctx.currentTime + inicio)
      osc.stop(ctx.currentTime + inicio + duracao + 0.05)
    }

    tocarBipe(880, 0, 0.12, 0.25)
    tocarBipe(1175, 0.15, 0.12, 0.25)

    setTimeout(() => {
      try {
        ctx.close()
      } catch {}
    }, 800)
  } catch {
    // Silencia se áudio for bloqueado pelo navegador
  }
}

function getStoredBoolean(key: string, defaultVal: boolean): boolean {
  try {
    const item = localStorage.getItem(key)
    if (item === null) return defaultVal
    return item === 'true'
  } catch {
    return defaultVal
  }
}

function setStoredBoolean(key: string, val: boolean) {
  try {
    localStorage.setItem(key, String(val))
  } catch {}
}

export function NotificationSoundProvider({ children }: { children: ReactNode }) {
  const { user, perfil, atualizarPerfilLocal } = useAuth()
  const [config, setConfig] = useState<NotificacoesSomConfig>(() => ({
    chat: getStoredBoolean('crm_som_chat', true),
    manual: getStoredBoolean('crm_som_manual', true),
    mensagens: getStoredBoolean('crm_som_mensagens', true),
  }))
  const [isUpdating, setIsUpdating] = useState(false)

  // Sincroniza quando os dados do perfil do Supabase carregarem
  useEffect(() => {
    if (perfil) {
      const chatVal = perfil.notif_som_chat ?? true
      const manualVal = perfil.notif_som_manual ?? true
      const mensagensVal = perfil.notif_som_mensagens ?? true

      setConfig({
        chat: chatVal,
        manual: manualVal,
        mensagens: mensagensVal,
      })

      setStoredBoolean('crm_som_chat', chatVal)
      setStoredBoolean('crm_som_manual', manualVal)
      setStoredBoolean('crm_som_mensagens', mensagensVal)
    }
  }, [perfil?.id, perfil?.notif_som_chat, perfil?.notif_som_manual, perfil?.notif_som_mensagens])

  // Guarda referência atualizada da config para tocar sem race conditions
  const configRef = useRef(config)
  useEffect(() => {
    configRef.current = config
  }, [config])

  const isSomAtivo = useCallback(
    (canal: CanalNotificacaoSom) => {
      return configRef.current[canal] ?? true
    },
    []
  )

  const tocarSomCanal = useCallback(
    (canal: CanalNotificacaoSom) => {
      if (!configRef.current[canal]) {
        // Som pausado para este canal de mensagens
        return
      }
      reproduzirBipeNotificacao()
    },
    []
  )

  const tocarSomTeste = useCallback(() => {
    reproduzirBipeNotificacao()
  }, [])

  const persistirConfig = async (novaConfig: NotificacoesSomConfig) => {
    setConfig(novaConfig)
    configRef.current = novaConfig

    setStoredBoolean('crm_som_chat', novaConfig.chat)
    setStoredBoolean('crm_som_manual', novaConfig.manual)
    setStoredBoolean('crm_som_mensagens', novaConfig.mensagens)

    if (user?.id) {
      setIsUpdating(true)
      try {
        atualizarPerfilLocal({
          notif_som_chat: novaConfig.chat,
          notif_som_manual: novaConfig.manual,
          notif_som_mensagens: novaConfig.mensagens,
        })

        await supabase
          .from('perfis')
          .update({
            notif_som_chat: novaConfig.chat,
            notif_som_manual: novaConfig.manual,
            notif_som_mensagens: novaConfig.mensagens,
          })
          .eq('id', user.id)
      } catch (err) {
        console.error('Erro ao salvar preferências de som:', err)
      } finally {
        setIsUpdating(false)
      }
    }
  }

  const toggleSom = async (canal: CanalNotificacaoSom) => {
    const novoValor = !configRef.current[canal]
    const novaConfig = {
      ...configRef.current,
      [canal]: novoValor,
    }
    await persistirConfig(novaConfig)
  }

  const setSom = async (canal: CanalNotificacaoSom, ativo: boolean) => {
    const novaConfig = {
      ...configRef.current,
      [canal]: ativo,
    }
    await persistirConfig(novaConfig)
  }

  const pausarTodos = async () => {
    const novaConfig: NotificacoesSomConfig = {
      chat: false,
      manual: false,
      mensagens: false,
    }
    await persistirConfig(novaConfig)
  }

  const ativarTodos = async () => {
    const novaConfig: NotificacoesSomConfig = {
      chat: true,
      manual: true,
      mensagens: true,
    }
    await persistirConfig(novaConfig)
  }

  return (
    <NotificationSoundContext.Provider
      value={{
        config,
        isSomAtivo,
        toggleSom,
        setSom,
        pausarTodos,
        ativarTodos,
        tocarSomCanal,
        tocarSomTeste,
        isUpdating,
      }}
    >
      {children}
    </NotificationSoundContext.Provider>
  )
}

export function useNotificationSound() {
  const ctx = useContext(NotificationSoundContext)
  if (!ctx) {
    // Fallback gracioso caso seja usado fora do Provider
    return {
      config: DEFAULT_CONFIG,
      isSomAtivo: (canal: CanalNotificacaoSom) => getStoredBoolean(`crm_som_${canal}`, true),
      toggleSom: async () => {},
      setSom: async () => {},
      pausarTodos: async () => {},
      ativarTodos: async () => {},
      tocarSomCanal: (canal: CanalNotificacaoSom) => {
        if (getStoredBoolean(`crm_som_${canal}`, true)) {
          reproduzirBipeNotificacao()
        }
      },
      tocarSomTeste: () => reproduzirBipeNotificacao(),
      isUpdating: false,
    }
  }
  return ctx
}
