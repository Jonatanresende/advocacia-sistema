import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useContatosManual, useConversaManual } from '../hooks/useChatManual'
import { useGravadorAudio } from '../hooks/useGravadorAudio'
import { useNotificacaoManual } from '../hooks/useNotificacaoManual'
import type { ContatoManual, MensagemManual } from '../types'
import { format } from 'date-fns'
import {
  MessageSquare,
  Send,
  UserPlus,
  Search,
  ArrowLeft,
  Paperclip,
  Mic,
  Square,
  Trash2,
  FileText,
  X,
  Eye,
  Download,
  Smile,
  Edit2,
  Phone,
  User,
  Users,
  Bell,
} from 'lucide-react'
import AudioMessage from '../components/chat/AudioMessage'
import EmojiPickerPopover from '../components/chat/EmojiPickerPopover'
import ImportarContatosModal from '../components/chat/ImportarContatosModal'

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

function renderTexto(texto: string): React.ReactNode[] {
  const partes = texto.split(/(\*\*[^*]+\*\*|_[^_]+_)/g)
  return partes.map((parte, i) => {
    if (parte.startsWith('**') && parte.endsWith('**')) {
      return <strong key={i}>{parte.slice(2, -2)}</strong>
    }
    if (parte.startsWith('_') && parte.endsWith('_') && parte.length > 2) {
      return <em key={i}>{parte.slice(1, -1)}</em>
    }
    return parte
  })
}

type MediaPreview = {
  url: string
  tipo: 'image' | 'pdf' | 'video'
  nome?: string
}

// ─── Modal para Cadastrar / Editar Contato ─────────────────────────────
function ContatoModal({
  aberto,
  contatoParaEditar,
  onFechar,
  onSalvar,
}: {
  aberto: boolean
  contatoParaEditar?: ContatoManual | null
  onFechar: () => void
  onSalvar: (nome: string, whatsapp: string, observacoes?: string) => Promise<boolean | ContatoManual | null>
}) {
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (contatoParaEditar) {
      setNome(contatoParaEditar.nome || '')
      setWhatsapp(contatoParaEditar.whatsapp || '')
      setObservacoes(contatoParaEditar.observacoes || '')
    } else {
      setNome('')
      setWhatsapp('')
      setObservacoes('')
    }
  }, [contatoParaEditar, aberto])

  if (!aberto) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!whatsapp.trim()) return
    setIsSaving(true)
    const res = await onSalvar(nome, whatsapp, observacoes)
    setIsSaving(false)
    if (res) onFechar()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-card)] rounded-[16px] p-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-card)]">
          <h3 className="font-semibold text-base text-[var(--text-main)] flex items-center gap-2">
            <User size={18} className="text-[var(--primary)]" />
            {contatoParaEditar ? 'Editar Contato' : 'Novo Contato do WhatsApp'}
          </h3>
          <button
            onClick={onFechar}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-base)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1">
              Nome do Contato
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: João da Silva"
              className="w-full px-3 py-2 text-[13px] rounded-[8px] bg-[var(--bg-base)] border border-[var(--border-card)] text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1">
              WhatsApp / Telefone <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                required
                disabled={!!contatoParaEditar}
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Ex: 5511999999999"
                className="w-full pl-9 pr-3 py-2 text-[13px] rounded-[8px] bg-[var(--bg-base)] border border-[var(--border-card)] text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1">
              Observações
            </label>
            <textarea
              rows={3}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Anotações internas sobre o contato ou cliente..."
              className="w-full px-3 py-2 text-[13px] rounded-[8px] bg-[var(--bg-base)] border border-[var(--border-card)] text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-colors resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" isLoading={isSaving}>
              Salvar Contato
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Item da Lista de Conversas ─────────────────────────────────────────
function ContatoItem({
  contato,
  ativo,
  onClick,
  onEditar,
}: {
  contato: ContatoManual
  ativo: boolean
  onClick: () => void
  onEditar: (e: React.MouseEvent) => void
}) {
  const dataExibicao = useMemo(() => {
    return contato.ultima_mensagem ? new Date(contato.ultima_mensagem) : null
  }, [contato.ultima_mensagem])

  const temNaoLidas = (contato.naoLidas ?? 0) > 0

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={`w-full text-left p-3 rounded-[10px] flex items-center gap-3 transition-all duration-150 relative group cursor-pointer ${
        ativo
          ? 'bg-[var(--primary)]/10 border border-[var(--primary)]/30'
          : temNaoLidas
          ? 'bg-emerald-500/10 border border-emerald-500/40 shadow-sm'
          : 'hover:bg-[var(--bg-base)] border border-transparent'
      }`}
    >
      <div className="relative shrink-0">
        <div className="w-9 h-9 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-[11px] font-bold">
          {iniciais(contato.nome)}
        </div>
        {temNaoLidas && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[var(--bg-card)] animate-pulse" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[13px] truncate ${temNaoLidas ? 'font-bold text-emerald-400' : 'font-semibold text-[var(--text-main)]'}`}>
            {contato.nome || contato.whatsapp}
          </span>
          {dataExibicao && (
            <span className={`text-[10px] shrink-0 ${temNaoLidas ? 'font-bold text-emerald-400' : 'text-[var(--text-muted)]'}`}>
              {format(dataExibicao, 'dd/MM HH:mm')}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <p className="text-[12px] text-[var(--text-muted)] truncate flex-1">
            {contato.observacoes || contato.whatsapp}
          </p>
          {temNaoLidas && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
              {contato.naoLidas} {contato.naoLidas === 1 ? 'Nova' : 'Novas'}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onEditar(e)
        }}
        title="Editar Contato"
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all shrink-0 cursor-pointer"
      >
        <Edit2 size={13} />
      </button>
    </div>
  )
}

// ─── Balão de Mensagem ──────────────────────────────────────────────────
function BalaoManual({
  msg,
  onPreviewMedia,
}: {
  msg: MensagemManual
  onPreviewMedia?: (media: MediaPreview) => void
}) {
  const doCliente = msg.tipo_remetente === 'cliente'
  const bolhaEscura = !doCliente

  return (
    <div className={`flex ${doCliente ? 'justify-start' : 'justify-end'} mb-3`}>
      <div
        className={`max-w-[78%] rounded-[14px] px-3.5 py-2.5 text-[13.5px] whitespace-pre-wrap break-words ${
          doCliente
            ? 'bg-[var(--bg-base)] border border-[var(--border-card)] text-[var(--text-main)]'
            : 'bg-[var(--primary)] text-white'
        }`}
      >
        {!doCliente && msg.usuario?.nome && (
          <p className="text-[10px] font-bold opacity-80 mb-1">{msg.usuario.nome}</p>
        )}

        {msg.conteudo ? (
          renderTexto(msg.conteudo)
        ) : (
          // Só mostra "(sem texto)" se for realmente uma mensagem de texto sem conteúdo
          // Mídias sem legenda (imagem, vídeo, áudio, pdf) não devem exibir esse placeholder
          msg.tipo_midia === 'texto' && <span className="italic opacity-70">(sem texto)</span>
        )}

        {msg.midia_url && (
          <div className={msg.conteudo ? 'mt-2' : ''}>
            {msg.tipo_midia === 'audio' && (
              <AudioMessage src={msg.midia_url} outgoing={bolhaEscura} />
            )}

            {msg.tipo_midia === 'video' && (
              <video
                src={msg.midia_url}
                controls
                playsInline
                preload="metadata"
                className="rounded-lg max-w-[260px] max-h-[320px] w-full"
              />
            )}

            {msg.tipo_midia === 'imagem' && (
              <button
                type="button"
                onClick={() =>
                  onPreviewMedia?.({
                    url: msg.midia_url!,
                    tipo: 'image',
                    nome: (msg.metadata?.nomeOriginal as string) || 'Imagem',
                  })
                }
                className="block overflow-hidden rounded-lg max-w-[260px] text-left cursor-pointer group"
              >
                <img
                  src={msg.midia_url}
                  alt="Anexo de imagem"
                  className="rounded-lg max-h-[300px] w-full object-cover group-hover:opacity-90 transition-opacity"
                  loading="lazy"
                />
              </button>
            )}

            {(msg.tipo_midia === 'pdf' || msg.tipo_midia === 'arquivo') && (
              <div className="rounded-lg border border-white/20 bg-black/10 p-2.5 max-w-[280px]">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={22} className="text-red-400 shrink-0" />
                  <span className="text-xs font-medium truncate opacity-90">
                    {(msg.metadata?.nomeOriginal as string) || 'Documento.pdf'}
                  </span>
                </div>
                {msg.tipo_midia === 'pdf' ? (
                  <button
                    type="button"
                    onClick={() =>
                      onPreviewMedia?.({
                        url: msg.midia_url!,
                        tipo: 'pdf',
                        nome: (msg.metadata?.nomeOriginal as string) || 'Documento.pdf',
                      })
                    }
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[8px] bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Eye size={13} /> Visualizar documento
                  </button>
                ) : (
                  <a
                    href={msg.midia_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[8px] bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Download size={13} /> Baixar arquivo
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        <div className="text-[10px] mt-1 opacity-50 text-right">
          {format(new Date(msg.created_at), 'dd/MM HH:mm')}
        </div>
      </div>
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ───────────────────────────────────────────────────
export default function ChatManual() {
  const { contatos, isLoading: carregandoContatos, salvarContato, atualizarContato } = useContatosManual()
  const { permissaoNotificacao, solicitarPermissao } = useNotificacaoManual()
  const [contatoSelecionado, setContatoSelecionado] = useState<ContatoManual | null>(null)
  const [busca, setBusca] = useState('')
  const [texto, setTexto] = useState('')
  const [arquivoAnexado, setArquivoAnexado] = useState<File | null>(null)
  const [mostrarEmojiPicker, setMostrarEmojiPicker] = useState(false)
  const [modalContatoAberto, setModalContatoAberto] = useState(false)
  const [modalImportarAberto, setModalImportarAberto] = useState(false)
  const [contatoParaEditar, setContatoParaEditar] = useState<ContatoManual | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const [midiaModal, setMidiaModal] = useState<MediaPreview | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mensagensContainerRef = useRef<HTMLDivElement>(null)

  const handleSelectEmoji = useCallback((emoji: string) => {
    const textarea = textareaRef.current
    if (textarea) {
      const start = textarea.selectionStart ?? texto.length
      const end = textarea.selectionEnd ?? texto.length
      const novoTexto = texto.substring(0, start) + emoji + texto.substring(end)
      setTexto(novoTexto)
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + emoji.length, start + emoji.length)
      }, 0)
    } else {
      setTexto((prev) => prev + emoji)
    }
  }, [texto])

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
    enviarMensagem,
  } = useConversaManual(contatoSelecionado)

  // Rolagem automática da conversa
  useEffect(() => {
    if (mensagensContainerRef.current) {
      mensagensContainerRef.current.scrollTop = mensagensContainerRef.current.scrollHeight
    }
  }, [mensagens.length, contatoSelecionado?.id])

  const contatosFiltrados = useMemo(() => {
    if (!busca.trim()) return contatos
    const termo = busca.toLowerCase()
    return contatos.filter(
      (c) =>
        c.nome?.toLowerCase().includes(termo) ||
        c.whatsapp.includes(termo) ||
        c.observacoes?.toLowerCase().includes(termo)
    )
  }, [contatos, busca])

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

  const handleAbrirCriarContato = () => {
    setContatoParaEditar(null)
    setModalContatoAberto(true)
  }

  const handleAbrirEditarContato = (contato: ContatoManual, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setContatoParaEditar(contato)
    setModalContatoAberto(true)
  }

  const handleSalvarContatoForm = async (nome: string, whatsapp: string, observacoes?: string) => {
    if (contatoParaEditar) {
      return await atualizarContato(contatoParaEditar.id, nome, observacoes)
    } else {
      const novocontato = await salvarContato(nome, whatsapp, observacoes)
      if (novocontato) {
        setContatoSelecionado(novocontato)
        setMobileView('chat')
      }
      return novocontato
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-7.5rem)] min-h-[500px]">
      <div className="shrink-0 mb-3 flex items-center justify-between gap-4">
        <PageHeader
          title="Atendimento Manual (2º WhatsApp)"
          description="Atendimento humano direto para conversas fora de automações. Salve contatos e troque mensagens com fotos, vídeos, PDFs e gravações de voz."
        />

        {permissaoNotificacao === 'default' && (
          <Button
            size="sm"
            variant="outline"
            onClick={solicitarPermissao}
            className="shrink-0 hidden sm:flex items-center gap-2 text-xs border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
          >
            <Bell size={14} className="animate-bounce" />
            Ativar Notificações
          </Button>
        )}
      </div>

      <Card noPadding className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full flex flex-col md:grid md:grid-cols-[320px_1fr] min-h-0">

          {/* ── Coluna esquerda: lista de conversas ─────────────────── */}
          <div
            className={`border-r border-[var(--border-card)] flex flex-col min-h-0 ${
              mobileView === 'list' ? 'flex' : 'hidden md:flex'
            }`}
          >
            {/* Search & Botões */}
            <div className="p-3 border-b border-[var(--border-card)] space-y-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleAbrirCriarContato}
                className="w-full flex items-center justify-center gap-2"
              >
                <UserPlus size={14} /> Novo Contato
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalImportarAberto(true)}
                className="w-full flex items-center justify-center gap-2"
              >
                <Users size={14} /> Importar do WhatsApp
              </Button>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome ou número..."
                  className="w-full pl-8 pr-3 py-2 text-[13px] rounded-[8px] bg-[var(--bg-base)] border border-[var(--border-card)] text-[var(--text-main)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>

            {/* Lista de contatos */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {carregandoContatos && (
                <p className="text-[12px] text-[var(--text-muted)] text-center py-8">
                  Carregando contatos...
                </p>
              )}
              {!carregandoContatos && contatosFiltrados.length === 0 && (
                <p className="text-[12px] text-[var(--text-muted)] text-center py-8">
                  Nenhum contato encontrado.
                </p>
              )}
              {contatosFiltrados.map((contato) => (
                <ContatoItem
                  key={contato.id}
                  contato={contato}
                  ativo={contatoSelecionado?.id === contato.id}
                  onClick={() => {
                    setContatoSelecionado(contato)
                    setMobileView('chat')
                  }}
                  onEditar={(e) => handleAbrirEditarContato(contato, e)}
                />
              ))}
            </div>
          </div>

          {/* ── Coluna direita: conversa aberta ─────────────────────── */}
          <div
            className={`flex flex-col min-h-0 ${
              mobileView === 'chat' ? 'flex' : 'hidden md:flex'
            }`}
          >
            {!contatoSelecionado ? (
              <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] gap-3">
                <div className="w-14 h-14 rounded-full bg-[var(--bg-base)] border border-[var(--border-card)] flex items-center justify-center">
                  <MessageSquare size={24} className="opacity-40" />
                </div>
                <p className="text-[13px]">Selecione um contato para iniciar o atendimento</p>
              </div>
            ) : (
              <>
                {/* Cabeçalho da conversa */}
                <div className="px-4 py-3 border-b border-[var(--border-card)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => setMobileView('list')}
                      className="md:hidden p-1.5 rounded-[8px] hover:bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shrink-0"
                    >
                      <ArrowLeft size={18} />
                    </button>

                    <div className="w-9 h-9 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0 text-[12px] font-bold">
                      {iniciais(contatoSelecionado.nome)}
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold text-[13.5px] text-[var(--text-main)] truncate">
                        {contatoSelecionado.nome || contatoSelecionado.whatsapp}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">
                        {contatoSelecionado.whatsapp} {contatoSelecionado.observacoes ? `• ${contatoSelecionado.observacoes}` : ''}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAbrirEditarContato(contatoSelecionado)}
                    className="shrink-0 flex items-center gap-1.5"
                  >
                    <Edit2 size={13} /> Editar Contato
                  </Button>
                </div>

                {/* Mensagens */}
                <div ref={mensagensContainerRef} className="flex-1 overflow-y-auto p-4">
                  {carregandoMensagens && (
                    <p className="text-[12px] text-[var(--text-muted)] text-center py-8">Carregando mensagens...</p>
                  )}
                  {!carregandoMensagens && mensagens.length === 0 && (
                    <p className="text-[12px] text-[var(--text-muted)] text-center py-8">Nenhuma mensagem ainda neste contato.</p>
                  )}
                  {mensagens.map((msg) => (
                    <BalaoManual key={msg.id} msg={msg} onPreviewMedia={setMidiaModal} />
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

                {/* Campo de envio */}
                <div className="p-3 border-t border-[var(--border-card)] relative">
                  <EmojiPickerPopover
                    isOpen={mostrarEmojiPicker}
                    onClose={() => setMostrarEmojiPicker(false)}
                    onEmojiSelect={handleSelectEmoji}
                  />

                  {gravando ? (
                    <div className="flex items-center gap-3 bg-[var(--bg-base)] border border-[var(--border-card)] rounded-[12px] px-3 py-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                      <span className="text-[13px] font-mono font-medium text-[var(--text-main)] min-w-[40px]">
                        {formatarTempoGravacao(tempoGravacao)}
                      </span>
                      <span className="text-[12px] text-[var(--text-muted)] flex-1 truncate">Gravando áudio...</span>
                      <button
                        onClick={cancelarGravacao}
                        className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors shrink-0"
                        title="Cancelar gravação"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        onClick={pararGravacao}
                        className="p-1.5 rounded-full text-white bg-red-500 hover:bg-red-600 transition-colors shrink-0"
                        title="Concluir gravação"
                      >
                        <Square size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-end gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleSelecionarArquivo}
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2.5 rounded-[10px] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-base)] transition-colors shrink-0 mb-0.5"
                        title="Anexar imagem, vídeo, PDF ou áudio"
                      >
                        <Paperclip size={18} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setMostrarEmojiPicker((v) => !v)}
                        className="p-2.5 rounded-[10px] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-base)] transition-colors shrink-0 mb-0.5"
                        title="Inserir emoji"
                      >
                        <Smile size={18} />
                      </button>

                      <textarea
                        ref={textareaRef}
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleEnviar()
                          }
                        }}
                        placeholder="Digite sua mensagem... (Shift+Enter para nova linha)"
                        rows={1}
                        className="flex-1 max-h-28 min-h-[40px] px-3 py-2.5 text-[13.5px] rounded-[10px] bg-[var(--bg-base)] border border-[var(--border-card)] text-[var(--text-main)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all resize-none placeholder:text-[var(--text-muted)]"
                      />

                      {!texto.trim() && !anexoPendente ? (
                        <button
                          type="button"
                          onClick={iniciarGravacao}
                          className="p-2.5 rounded-[10px] text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors shrink-0 mb-0.5"
                          title="Gravar áudio"
                        >
                          <Mic size={18} />
                        </button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={handleEnviar}
                          disabled={!podeEnviar || isSending}
                          isLoading={isSending}
                          className="h-[40px] px-3.5 shrink-0 mb-0.5"
                        >
                          <Send size={15} />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Modal de cadastro/edição de contato */}
      <ContatoModal
        aberto={modalContatoAberto}
        contatoParaEditar={contatoParaEditar}
        onFechar={() => setModalContatoAberto(false)}
        onSalvar={handleSalvarContatoForm}
      />

      {/* Modal de Importação de Contatos do WhatsApp */}
      <ImportarContatosModal
        aberto={modalImportarAberto}
        contatosExistentes={contatos}
        onFechar={() => setModalImportarAberto(false)}
        onContatosImportados={() => {
          // Os contatos são atualizados automaticamente via realtime do useContatosManual
        }}
      />

      {/* Modal de Preview de Mídia */}
      {midiaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center bg-[var(--bg-card)] rounded-[16px] overflow-hidden border border-[var(--border-card)] p-4">
            <button
              onClick={() => setMidiaModal(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <X size={20} />
            </button>

            {midiaModal.tipo === 'image' && (
              <img
                src={midiaModal.url}
                alt={midiaModal.nome || 'Imagem'}
                className="max-h-[80vh] w-auto object-contain rounded-lg"
              />
            )}

            {midiaModal.tipo === 'pdf' && (
              <div className="w-full h-[75vh] flex flex-col">
                <iframe
                  src={midiaModal.url}
                  className="w-full flex-1 rounded-lg border border-[var(--border-card)]"
                  title="PDF Viewer"
                />
                <div className="mt-3 flex justify-end">
                  <a
                    href={midiaModal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[var(--primary)] text-white text-xs font-medium"
                  >
                    <Download size={14} /> Download PDF
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
