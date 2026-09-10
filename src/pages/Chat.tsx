import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import { useChatLeads, useChatConversa } from '../hooks/useChat'
import { useGravadorAudio } from '../hooks/useGravadorAudio'
import type { LeadAdv } from '../types'
import { format } from 'date-fns'
import {
  MessageSquare,
  Send,
  UserCog,
  Bot,
  Search,
  Image as ImageIcon,
  ArrowLeft,
  Paperclip,
  Mic,
  Square,
  Trash2,
  FileText,
  X,
  ExternalLink,
  Eye,
  Download,
} from 'lucide-react'
import AudioMessage from '../components/chat/AudioMessage'

function formatarTempoGravacao(segundos: number) {
  const min = Math.floor(segundos / 60)
  const seg = segundos % 60
  return `${min}:${seg.toString().padStart(2, '0')}`
}

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function iniciais(nome: string | null) {
  if (!nome) return '?'
  const partes = nome.trim().split(' ')
  return (partes[0][0] + (partes[1]?.[0] ?? '')).toUpperCase()
}

// ─── Item da lista de conversas com estado de Não Lido dinâmico ─────────────
function ConversaItem({
  lead,
  ativo,
  naoLido,
  onClick,
}: {
  lead: LeadAdv
  ativo: boolean
  naoLido: boolean
  onClick: () => void
}) {
  // Usa a data da última mensagem enviada pelo LEAD para o horário exibido no card
  const dataExibicao = useMemo(() => {
    if (lead.ultimaMensagemDoLeadMs && lead.ultimaMensagemDoLeadMs > 0) {
      return new Date(lead.ultimaMensagemDoLeadMs)
    }
    return lead.ultima_mensagem ? new Date(lead.ultima_mensagem) : null
  }, [lead.ultimaMensagemDoLeadMs, lead.ultima_mensagem])

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-[10px] flex items-center gap-3 transition-all duration-150 relative ${ativo
        ? 'bg-[var(--primary)]/10 border border-[var(--primary)]/30'
        : naoLido
          ? 'bg-emerald-500/10 border border-emerald-500/40 shadow-sm'
          : 'hover:bg-[var(--bg-base)] border border-transparent'
        }`}
    >
      {/* Avatar com ponto indicador pulsante se não lido */}
      <div className="relative shrink-0">
        <div className="w-9 h-9 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-[11px] font-bold">
          {iniciais(lead.nome_lead)}
        </div>
        {naoLido && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[var(--bg-card)] animate-pulse" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[13px] truncate ${naoLido ? 'font-bold text-emerald-400' : 'font-semibold text-[var(--text-main)]'}`}>
            {lead.nome_lead || lead.whatsapp_lead}
          </span>
          {dataExibicao && (
            <span className={`text-[10px] shrink-0 ${naoLido ? 'font-bold text-emerald-400' : 'text-[var(--text-muted)]'}`}>
              {format(dataExibicao, 'dd/MM HH:mm')}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <p className="text-[12px] text-[var(--text-muted)] truncate flex-1">
            {lead.motivo_contato || 'Sem motivo informado'}
          </p>
          {naoLido && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
              Nova
            </span>
          )}
        </div>
        {lead.atendimento_humano_ativo && (
          <span className="inline-flex items-center gap-1 mt-1 text-[10px] px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">
            <UserCog size={10} /> Atendimento humano
          </span>
        )}
      </div>
    </button>
  )
}

type MediaPreview = {
  url: string
  tipo: 'image' | 'pdf'
  nome?: string
}

function Balao({
  msg,
  onPreviewMedia,
}: {
  msg: import('../hooks/useChat').ChatwootMessage
  onPreviewMedia?: (media: MediaPreview) => void
}) {
  const doLead = msg.message_type === 0
  const nota = msg.private
  const bolhaEscura = !doLead && !nota

  return (
    <div className={`flex ${doLead ? 'justify-start' : 'justify-end'} mb-3`}>
      <div
        className={`max-w-[78%] rounded-[14px] px-3.5 py-2.5 text-[13.5px] whitespace-pre-wrap break-words ${nota
          ? 'bg-[var(--warning-bg)] border border-[var(--warning-border)] text-[var(--text-main)]'
          : doLead
            ? 'bg-[var(--bg-base)] border border-[var(--border-card)] text-[var(--text-main)]'
            : 'bg-[var(--primary)] text-white'
          }`}
      >
        {msg.content ||
          (!msg.attachments?.length && <span className="italic opacity-70">(sem texto)</span>)}
        {msg.attachments?.map((att) => {
          const isAudio = att.file_type === 'audio'
          const isVideo = att.file_type === 'video'
          const isImage = att.file_type === 'image' || /\.(png|jpe?g|gif|webp|svg)($|\?)/i.test(att.data_url || '')
          const isPdf = att.file_type === 'pdf' || (att.file_type === 'file' && att.data_url?.toLowerCase().includes('.pdf')) || att.data_url?.toLowerCase().includes('.pdf')

          if (isAudio) {
            return (
              <div key={att.id} className={msg.content ? 'mt-2' : ''}>
                <AudioMessage src={att.data_url} outgoing={bolhaEscura} />
              </div>
            )
          }

          if (isVideo) {
            return (
              <div key={att.id} className={msg.content ? 'mt-2' : ''}>
                <video
                  src={att.data_url}
                  controls
                  playsInline
                  preload="metadata"
                  className="rounded-lg max-w-[260px] max-h-[320px] w-full"
                />
              </div>
            )
          }

          if (isImage) {
            const nomeImg = att.data_url?.split('/')?.pop()?.split('?')[0] || 'Imagem'
            return (
              <div key={att.id} className={msg.content ? 'mt-2' : ''}>
                <button
                  type="button"
                  onClick={() => onPreviewMedia?.({ url: att.data_url, tipo: 'image', nome: nomeImg })}
                  className="block overflow-hidden rounded-lg max-w-[260px] text-left cursor-pointer group"
                >
                  <img
                    src={att.thumb_url || att.data_url}
                    alt="Anexo de imagem"
                    className="rounded-lg max-h-[300px] w-full object-cover group-hover:opacity-90 transition-opacity"
                    loading="lazy"
                  />
                </button>
              </div>
            )
          }

          if (isPdf) {
            const nomeArquivo = att.data_url?.split('/')?.pop()?.split('?')[0] || 'Documento.pdf'
            return (
              <div key={att.id} className={msg.content ? 'mt-2' : ''}>
                <div className="rounded-lg border border-white/20 bg-black/10 p-2.5 max-w-[280px]">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={22} className="text-red-400 shrink-0" />
                    <span className="text-xs font-medium truncate opacity-90" title={nomeArquivo}>
                      {nomeArquivo}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPreviewMedia?.({ url: att.data_url, tipo: 'pdf', nome: nomeArquivo })}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[8px] bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Eye size={13} /> Visualizar documento
                  </button>
                </div>
              </div>
            )
          }

          return (
            <a
              key={att.id}
              href={att.data_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center gap-1 text-xs underline opacity-90"
            >
              <ImageIcon size={12} /> Ver anexo
            </a>
          )
        })}
        <div className="text-[10px] mt-1 opacity-50 text-right">
          {format(new Date(msg.created_at * 1000), 'dd/MM HH:mm')}
        </div>
      </div>
    </div>
  )
}

export default function Chat() {
  const { perfil } = useAuth()
  const { leads, isLoading: carregandoLeads } = useChatLeads()
  const [leadSelecionado, setLeadSelecionado] = useState<LeadAdv | null>(null)
  const [busca, setBusca] = useState('')
  const [texto, setTexto] = useState('')
  const [arquivoAnexado, setArquivoAnexado] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const [midiaModal, setMidiaModal] = useState<MediaPreview | null>(null)

  // Controle de leitura: guarda timestamp de quando a conversa de cada lead foi lida pelo usuário
  const [vistosMap, setVistosMap] = useState<Record<string, number>>(() => {
    try {
      const salvas = localStorage.getItem('chat_leads_vistos')
      return salvas ? JSON.parse(salvas) : {}
    } catch {
      return {}
    }
  })

  const {
    gravando,
    tempoGravacao,
    audioGravado,
    iniciarGravacao,
    pararGravacao,
    cancelarGravacao,
    descartarAudioGravado,
  } = useGravadorAudio()

  const {
    mensagens,
    isLoading: carregandoMensagens,
    isSending,
    isLoadingMais,
    temMaisAntigas,
    carregarMensagensAntigas,
    atendimentoHumanoAtivo,
    atendidoPor,
    enviarMensagem,
    assumirAtendimento,
    devolverParaIA,
  } = useChatConversa(leadSelecionado)

  // Marca conversa como lida ao selecionar um lead ou receber mensagem enquanto está aberto
  const marcarComoLido = useCallback((leadId: string) => {
    setVistosMap((prev) => {
      const novo = { ...prev, [leadId]: Date.now() }
      try {
        localStorage.setItem('chat_leads_vistos', JSON.stringify(novo))
        window.dispatchEvent(new CustomEvent('chat_vistos_updated'))
      } catch {
        // Ignora erro de localStorage
      }
      return novo
    })
  }, [])

  // Marca como lido se a conversa estiver aberta
  useEffect(() => {
    if (leadSelecionado?.id) {
      marcarComoLido(leadSelecionado.id)
    }
  }, [leadSelecionado?.id, mensagens.length, marcarComoLido])

  // Rola o scroll da conversa para a mensagem mais recente
  const mensagensContainerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (mensagensContainerRef.current) {
      mensagensContainerRef.current.scrollTop = mensagensContainerRef.current.scrollHeight
    }
  }, [mensagens.length, leadSelecionado?.id])

  const leadsFiltrados = useMemo(() => {
    if (!busca.trim()) return leads
    const termo = busca.toLowerCase()
    return leads.filter(
      (l) =>
        l.nome_lead?.toLowerCase().includes(termo) ||
        l.whatsapp_lead?.includes(termo)
    )
  }, [leads, busca])

  const anexoPendente = audioGravado?.arquivo ?? arquivoAnexado
  const podeEnviar = !!texto.trim() || !!anexoPendente

  const handleEnviar = async () => {
    if (!podeEnviar) return
    const ok = await enviarMensagem(texto, anexoPendente)
    if (ok) {
      setTexto('')
      setArquivoAnexado(null)
      descartarAudioGravado()
    }
  }

  const handleSelecionarArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0]
    if (arquivo) setArquivoAnexado(arquivo)
    e.target.value = ''
  }

  const iniciarGravacaoComTratamento = async () => {
    try {
      await iniciarGravacao()
    } catch {
      alert('Não foi possível acessar o microfone. Verifique a permissão do navegador.')
    }
  }

  const handleSelecionarLead = (lead: LeadAdv) => {
    setLeadSelecionado(lead)
    marcarComoLido(lead.id)
    setMobileView('chat')
  }

  const handleVoltarLista = () => {
    setMobileView('list')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-7.5rem)] min-h-[500px]">
      <div className="shrink-0 mb-3">
        <PageHeader
          title="Chat"
          description="Converse diretamente com os leads. Ao mandar uma mensagem manual, o assistente virtual para de responder esse contato automaticamente."
        />
      </div>

      <Card noPadding className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full flex flex-col md:grid md:grid-cols-[300px_1fr] min-h-0">

          {/* ── Coluna esquerda: lista de conversas ─────────────────── */}
          <div
            className={`border-r border-[var(--border-card)] flex flex-col min-h-0 ${mobileView === 'list' ? 'flex' : 'hidden md:flex'
              }`}
          >
            {/* Search */}
            <div className="p-3 border-b border-[var(--border-card)]">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar conversa..."
                  className="w-full pl-8 pr-3 py-2 text-[13px] rounded-[8px] bg-[var(--bg-base)] border border-[var(--border-card)] text-[var(--text-main)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>

            {/* Lista de conversas */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {carregandoLeads && (
                <p className="text-[12px] text-[var(--text-muted)] text-center py-8">
                  Carregando conversas...
                </p>
              )}
              {!carregandoLeads && leadsFiltrados.length === 0 && (
                <p className="text-[12px] text-[var(--text-muted)] text-center py-8">
                  Nenhuma conversa encontrada.
                </p>
              )}
              {leadsFiltrados.map((lead) => {
                const timestampVisto = vistosMap[lead.id] ?? 0
                // Usa a última mensagem vinda do LEAD (message_type 0) — ignora respostas da IA
                const timestampMsg = lead.ultimaMensagemDoLeadMs ?? (lead.ultima_mensagem ? new Date(lead.ultima_mensagem).getTime() : 0)
                const naoLido = timestampMsg > 0 && timestampMsg > timestampVisto && leadSelecionado?.id !== lead.id

                return (
                  <ConversaItem
                    key={lead.id}
                    lead={lead}
                    ativo={leadSelecionado?.id === lead.id}
                    naoLido={naoLido}
                    onClick={() => handleSelecionarLead(lead)}
                  />
                )
              })}
            </div>
          </div>

          {/* ── Coluna direita: conversa aberta ─────────────────────── */}
          <div
            className={`flex flex-col min-h-0 ${mobileView === 'chat' ? 'flex' : 'hidden md:flex'
              }`}
          >
            {!leadSelecionado ? (
              <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] gap-3">
                <div className="w-14 h-14 rounded-full bg-[var(--bg-base)] border border-[var(--border-card)] flex items-center justify-center">
                  <MessageSquare size={24} className="opacity-40" />
                </div>
                <p className="text-[13px]">Selecione uma conversa para começar</p>
              </div>
            ) : (
              <>
                {/* Cabeçalho da conversa */}
                <div className="px-4 py-3 border-b border-[var(--border-card)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={handleVoltarLista}
                      className="md:hidden p-1.5 rounded-[8px] hover:bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shrink-0"
                    >
                      <ArrowLeft size={18} />
                    </button>

                    <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0 text-[11px] font-bold">
                      {iniciais(leadSelecionado.nome_lead)}
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold text-[13.5px] text-[var(--text-main)] truncate">
                        {leadSelecionado.nome_lead || leadSelecionado.whatsapp_lead}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {atendimentoHumanoAtivo
                          ? atendidoPor === perfil?.id
                            ? 'Você está no controle dessa conversa'
                            : 'Outro colega está no controle'
                          : 'Assistente virtual respondendo automaticamente'}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant={atendimentoHumanoAtivo ? 'outline' : 'secondary'}
                    size="sm"
                    onClick={atendimentoHumanoAtivo ? devolverParaIA : assumirAtendimento}
                    className="shrink-0"
                  >
                    {atendimentoHumanoAtivo ? (
                      <><Bot size={13} /> Devolver pra IA</>
                    ) : (
                      <><UserCog size={13} /> Assumir</>
                    )}
                  </Button>
                </div>

                {/* Mensagens */}
                <div ref={mensagensContainerRef} className="flex-1 overflow-y-auto p-4">
                  {carregandoMensagens && (
                    <p className="text-[12px] text-[var(--text-muted)] text-center py-8">Carregando mensagens...</p>
                  )}
                  {!carregandoMensagens && mensagens.length === 0 && (
                    <p className="text-[12px] text-[var(--text-muted)] text-center py-8">Nenhuma mensagem ainda.</p>
                  )}
                  {!carregandoMensagens && mensagens.length > 0 && temMaisAntigas && (
                    <div className="text-center pb-3">
                      <button
                        onClick={carregarMensagensAntigas}
                        disabled={isLoadingMais}
                        className="text-[11.5px] text-[var(--primary)] hover:underline disabled:opacity-50"
                      >
                        {isLoadingMais ? 'Carregando...' : 'Carregar mensagens anteriores'}
                      </button>
                    </div>
                  )}
                  {mensagens.map((msg) => (
                    <Balao key={msg.id} msg={msg} onPreviewMedia={setMidiaModal} />
                  ))}
                </div>

                {/* Preview de anexo pendente */}
                {(arquivoAnexado || audioGravado) && (
                  <div className="px-3 pt-2.5 border-t border-[var(--border-card)]">
                    {audioGravado ? (
                      <div className="flex items-center gap-2 bg-[var(--bg-base)] border border-[var(--border-card)] rounded-[10px] px-2 py-1.5">
                        <button
                          onClick={descartarAudioGravado}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors shrink-0"
                          aria-label="Descartar gravação"
                        >
                          <Trash2 size={15} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <AudioMessage src={audioGravado.url} outgoing={false} />
                        </div>
                      </div>
                    ) : arquivoAnexado ? (
                      <div className="flex items-center gap-2.5 bg-[var(--bg-base)] border border-[var(--border-card)] rounded-[10px] px-3 py-2">
                        <FileText size={16} className="text-[var(--primary)] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12.5px] text-[var(--text-main)] truncate">{arquivoAnexado.name}</p>
                          <p className="text-[10.5px] text-[var(--text-muted)]">{formatarTamanho(arquivoAnexado.size)}</p>
                        </div>
                        <button
                          onClick={() => setArquivoAnexado(null)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] transition-colors shrink-0"
                          aria-label="Remover anexo"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Input de envio */}
                <div
                  className={`p-3 flex items-end gap-2 ${arquivoAnexado || audioGravado ? '' : 'border-t border-[var(--border-card)]'
                    }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                    onChange={handleSelecionarArquivo}
                  />

                  {gravando ? (
                    <div className="flex-1 flex items-center gap-2.5 bg-[var(--danger-bg)] border border-[var(--danger-border)] rounded-[10px] px-3.5 py-2.5">
                      <span className="w-2 h-2 rounded-full bg-[var(--danger)] animate-pulse shrink-0" />
                      <span className="text-[13px] text-[var(--danger-text)] tabular-nums font-medium">
                        {formatarTempoGravacao(tempoGravacao)}
                      </span>
                      <span className="text-[12px] text-[var(--danger-text)] opacity-70 flex-1">Gravando áudio...</span>
                      <button
                        onClick={cancelarGravacao}
                        className="text-[var(--danger-text)] hover:opacity-70 transition-opacity shrink-0"
                        aria-label="Cancelar gravação"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!!audioGravado}
                        className="shrink-0 w-10 h-10 rounded-[10px] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-base)] hover:text-[var(--text-main)] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                        aria-label="Anexar arquivo"
                      >
                        <Paperclip size={17} />
                      </button>
                      <textarea
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleEnviar()
                          }
                        }}
                        placeholder={
                          audioGravado ? 'Áudio pronto para enviar' : 'Digite uma mensagem... (Enter para enviar)'
                        }
                        rows={1}
                        disabled={!!audioGravado}
                        className="flex-1 resize-none px-3 py-2.5 text-[13px] rounded-[10px] bg-[var(--bg-base)] border border-[var(--border-card)] text-[var(--text-main)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 max-h-32 transition-all placeholder:text-[var(--text-muted)] disabled:opacity-60"
                      />
                    </>
                  )}

                  {gravando ? (
                    <Button
                      onClick={pararGravacao}
                      variant="danger"
                      size="md"
                      className="shrink-0 h-10 w-10 p-0 !px-0 !py-0 items-center justify-center"
                      aria-label="Parar gravação"
                    >
                      <Square size={13} fill="currentColor" />
                    </Button>
                  ) : podeEnviar ? (
                    <Button
                      onClick={handleEnviar}
                      disabled={isSending}
                      size="md"
                      className="shrink-0 h-10 w-10 p-0 !px-0 !py-0 items-center justify-center"
                      aria-label="Enviar"
                    >
                      <Send size={15} />
                    </Button>
                  ) : (
                    <button
                      type="button"
                      onClick={iniciarGravacaoComTratamento}
                      className="shrink-0 w-10 h-10 rounded-[10px] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-base)] hover:text-[var(--text-main)] transition-colors"
                      aria-label="Gravar áudio"
                    >
                      <Mic size={17} />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Modal de Pré-visualização de Imagem / PDF */}
      {midiaModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setMidiaModal(null)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--bg-card)] border border-[var(--border-card)] rounded-[16px] overflow-hidden flex flex-col shadow-2xl animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho da Modal */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-card)] bg-[var(--bg-base)]">
              <div className="flex items-center gap-2.5 min-w-0">
                {midiaModal.tipo === 'image' ? (
                  <ImageIcon size={18} className="text-[var(--primary)] shrink-0" />
                ) : (
                  <FileText size={18} className="text-red-400 shrink-0" />
                )}
                <span className="text-sm font-semibold text-[var(--text-main)] truncate" title={midiaModal.nome}>
                  {midiaModal.nome || (midiaModal.tipo === 'image' ? 'Visualização da Imagem' : 'Visualização do PDF')}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={midiaModal.url}
                  download={midiaModal.nome || 'anexo'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[8px] bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"
                >
                  <Download size={14} /> Baixar
                </a>

                <a
                  href={midiaModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[8px] bg-[var(--bg-base)] border border-[var(--border-card)] text-[var(--text-main)] hover:bg-[var(--border-card)] transition-colors"
                >
                  <ExternalLink size={14} /> Abrir em nova aba
                </a>

                <button
                  type="button"
                  onClick={() => setMidiaModal(null)}
                  className="p-1.5 rounded-[8px] hover:bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer ml-1"
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Conteúdo da Modal */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/40 min-h-[400px]">
              {midiaModal.tipo === 'image' ? (
                <img
                  src={midiaModal.url}
                  alt="Visualização"
                  className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg"
                />
              ) : (
                <iframe
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(midiaModal.url)}&embedded=true`}
                  title="Visualizador PDF"
                  className="w-full h-[75vh] rounded-lg border border-[var(--border-card)] bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}