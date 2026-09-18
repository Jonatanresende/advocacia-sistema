import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import { useMensagensConversas, useMensagensConversa } from '../hooks/useMensagens'
import { useGravadorAudio } from '../hooks/useGravadorAudio'
import AudioMessage from '../components/chat/AudioMessage'
import type { Perfil, MensagemInterna } from '../types'
import { format, isToday, isYesterday } from 'date-fns'
import {
  Send,
  Search,
  MessageCircle,
  ArrowLeft,
  Paperclip,
  Mic,
  Square,
  Trash2,
  FileText,
  X,
  Image as ImageIcon,
  ExternalLink,
  Eye,
  Download,
} from 'lucide-react'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function iniciais(nome: string | null) {
  if (!nome) return '?'
  const partes = nome.trim().split(' ')
  return (partes[0][0] + (partes[1]?.[0] ?? '')).toUpperCase()
}

function formatarHorario(iso: string) {
  const data = new Date(iso)
  if (isToday(data)) return format(data, 'HH:mm')
  if (isYesterday(data)) return 'Ontem'
  return format(data, 'dd/MM')
}

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

// ─── Preview de mídia (modal) ─────────────────────────────────────────────────

type MediaPreview = {
  url: string
  tipo: 'image' | 'pdf'
  nome?: string
}

// ─── Preview de última mensagem na lista ─────────────────────────────────────

function resumoMensagem(m: MensagemInterna | null): string {
  if (!m) return 'Nenhuma mensagem ainda'
  if (m.anexo_tipo === 'audio') return '🎤 Áudio'
  if (m.anexo_tipo === 'image') return '🖼️ Imagem'
  if (m.anexo_tipo === 'pdf') return '📄 PDF'
  if (m.anexo_tipo === 'file') return '📎 Arquivo'
  return m.conteudo ?? ''
}

// ─── Balão de mensagem ────────────────────────────────────────────────────────

function Balao({
  msg,
  minha,
  onPreviewMedia,
}: {
  msg: MensagemInterna
  minha: boolean
  onPreviewMedia: (m: MediaPreview) => void
}) {
  const isAudio = msg.anexo_tipo === 'audio'
  const isImage = msg.anexo_tipo === 'image'
  const isPdf = msg.anexo_tipo === 'pdf'
  const isFile = msg.anexo_tipo === 'file'

  return (
    <div className={`flex ${minha ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[75%] rounded-[14px] px-3.5 py-2.5 text-[13.5px] ${
          minha
            ? 'bg-[var(--primary)] text-white rounded-br-sm'
            : 'bg-[var(--bg-base)] border border-[var(--border-card)] text-[var(--text-main)] rounded-bl-sm'
        }`}
      >
        {/* Texto */}
        {msg.conteudo && (
          <p className="whitespace-pre-wrap break-words">{msg.conteudo}</p>
        )}

        {/* Áudio */}
        {isAudio && msg.anexo_url && (
          <div className={msg.conteudo ? 'mt-2' : ''}>
            <AudioMessage src={msg.anexo_url} outgoing={minha} />
          </div>
        )}

        {/* Imagem */}
        {isImage && msg.anexo_url && (
          <div className={msg.conteudo ? 'mt-2' : ''}>
            <button
              type="button"
              onClick={() =>
                onPreviewMedia({
                  url: msg.anexo_url!,
                  tipo: 'image',
                  nome: msg.anexo_url!.split('/').pop()?.split('?')[0],
                })
              }
              className="block overflow-hidden rounded-lg max-w-[260px] text-left cursor-pointer group"
            >
              <img
                src={msg.anexo_url}
                alt="Imagem anexada"
                className="rounded-lg max-h-[280px] w-full object-cover group-hover:opacity-90 transition-opacity"
                loading="lazy"
              />
            </button>
          </div>
        )}

        {/* PDF */}
        {isPdf && msg.anexo_url && (
          <div className={msg.conteudo ? 'mt-2' : ''}>
            <div className="rounded-lg border border-white/20 bg-black/10 p-2.5 max-w-[280px]">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={22} className="text-red-400 shrink-0" />
                <span className="text-xs font-medium truncate opacity-90">
                  {msg.anexo_url.split('/').pop()?.split('?')[0] || 'Documento.pdf'}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  onPreviewMedia({
                    url: msg.anexo_url!,
                    tipo: 'pdf',
                    nome: msg.anexo_url!.split('/').pop()?.split('?')[0],
                  })
                }
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[8px] bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors cursor-pointer"
              >
                <Eye size={13} /> Visualizar documento
              </button>
            </div>
          </div>
        )}

        {/* Arquivo genérico */}
        {isFile && msg.anexo_url && (
          <div className={msg.conteudo ? 'mt-2' : ''}>
            <a
              href={msg.anexo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs underline opacity-90"
            >
              <Paperclip size={12} /> Baixar arquivo
            </a>
          </div>
        )}

        {/* Horário */}
        <span
          className={`block text-[10px] mt-1 text-right ${
            minha ? 'text-white/70' : 'text-[var(--text-muted)]'
          }`}
        >
          {format(new Date(msg.created_at), 'HH:mm')}
        </span>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Mensagens() {
  const { perfil } = useAuth()
  const { conversas, isLoading: carregandoConversas } = useMensagensConversas()
  const [selecionado, setSelecionado] = useState<Perfil | null>(null)
  const [busca, setBusca] = useState('')
  const [texto, setTexto] = useState('')
  const [arquivoAnexado, setArquivoAnexado] = useState<File | null>(null)
  const [midiaModal, setMidiaModal] = useState<MediaPreview | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { mensagens, isSending, enviarMensagem } = useMensagensConversa(selecionado?.id ?? null)

  const {
    gravando,
    tempoGravacao,
    audioGravado,
    iniciarGravacao,
    pararGravacao,
    cancelarGravacao,
    descartarAudioGravado,
  } = useGravadorAudio()

  // Rola para baixo ao receber nova mensagem
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  const conversasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return conversas
    return conversas.filter((c) => c.usuario.nome.toLowerCase().includes(termo))
  }, [conversas, busca])

  const anexoPendente = audioGravado?.arquivo ?? arquivoAnexado
  const podeEnviar = !!texto.trim() || !!anexoPendente

  const handleEnviar = useCallback(async () => {
    if (!podeEnviar) return
    await enviarMensagem(texto, anexoPendente)
    // enviarMensagem retorna undefined (void), então só limpa se não lançou
    setTexto('')
    setArquivoAnexado(null)
    descartarAudioGravado()
  }, [podeEnviar, texto, anexoPendente, enviarMensagem, descartarAudioGravado])

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

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-7.5rem)] min-h-[500px]">
      <div className="shrink-0 mb-3">
        <PageHeader title="Mensagens" description="Converse diretamente com outros usuários do sistema." />
      </div>

      <div className="flex flex-1 min-h-0 gap-4 overflow-hidden">
        {/* ── Coluna esquerda: lista de conversas ── */}
        <Card
          noPadding
          className={`w-full sm:w-[300px] flex-shrink-0 flex-col ${selecionado ? 'hidden sm:flex' : 'flex'}`}
        >
          {/* Busca */}
          <div className="p-3 border-b border-[var(--border-card)]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar usuário..."
                className="w-full pl-8 pr-3 py-2 text-[13px] rounded-[8px] bg-[var(--bg-base)] border border-[var(--border-card)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all placeholder:text-[var(--text-muted)]"
              />
            </div>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {carregandoConversas && (
              <p className="text-[12px] text-[var(--text-muted)] text-center py-8">Carregando...</p>
            )}
            {!carregandoConversas && conversasFiltradas.length === 0 && (
              <p className="text-[12px] text-[var(--text-muted)] text-center py-8">Nenhum usuário encontrado.</p>
            )}
            {conversasFiltradas.map(({ usuario, ultimaMensagem, naoLidas }) => (
              <button
                key={usuario.id}
                onClick={() => setSelecionado(usuario)}
                className={`w-full flex items-center gap-3 px-3 py-3 text-left rounded-[10px] border transition-all duration-150 ${
                  selecionado?.id === usuario.id
                    ? 'bg-[var(--primary)]/10 border-[var(--primary)]/30'
                    : 'hover:bg-[var(--bg-base)] border-transparent'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                  {iniciais(usuario.nome)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[13px] text-[var(--text-main)] truncate">
                      {usuario.nome}
                    </span>
                    {ultimaMensagem && (
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                        {formatarHorario(ultimaMensagem.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-[12px] text-[var(--text-muted)] truncate">
                      {resumoMensagem(ultimaMensagem)}
                    </span>
                    {naoLidas > 0 && (
                      <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--primary)] text-white text-[10px] font-bold flex items-center justify-center">
                        {naoLidas}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* ── Coluna direita: conversa aberta ── */}
        <Card
          noPadding
          className={`flex-1 flex-col min-h-0 ${selecionado ? 'flex' : 'hidden sm:flex'}`}
        >
          {!selecionado ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] gap-3">
              <div className="w-14 h-14 rounded-full bg-[var(--bg-base)] border border-[var(--border-card)] flex items-center justify-center">
                <MessageCircle className="w-6 h-6 opacity-40" />
              </div>
              <p className="text-sm">Selecione um usuário para conversar</p>
            </div>
          ) : (
            <>
              {/* Cabeçalho */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-card)]">
                <button
                  className="sm:hidden p-1.5 rounded-[8px] hover:bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                  onClick={() => setSelecionado(null)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-[11px] font-bold">
                  {iniciais(selecionado.nome)}
                </div>
                <span className="font-semibold text-[13.5px] text-[var(--text-main)]">
                  {selecionado.nome}
                </span>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-4">
                {mensagens.length === 0 && (
                  <p className="text-[12px] text-[var(--text-muted)] text-center py-8">
                    Nenhuma mensagem ainda. Diga olá!
                  </p>
                )}
                {mensagens.map((m) => (
                  <Balao
                    key={m.id}
                    msg={m}
                    minha={m.remetente_id === perfil?.id}
                    onPreviewMedia={setMidiaModal}
                  />
                ))}
                <div ref={bottomRef} />
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
                className={`p-3 flex items-end gap-2 ${
                  arquivoAnexado || audioGravado ? '' : 'border-t border-[var(--border-card)]'
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
        </Card>
      </div>

      {/* Modal de pré-visualização de imagem / PDF */}
      {midiaModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setMidiaModal(null)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--bg-card)] border border-[var(--border-card)] rounded-[16px] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho da modal */}
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
                  className="p-1.5 rounded-[8px] hover:bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors ml-1"
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Conteúdo da modal */}
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