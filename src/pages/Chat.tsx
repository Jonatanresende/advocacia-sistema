import { useState, useMemo } from 'react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import { useChatLeads, useChatConversa } from '../hooks/useChat'
import type { LeadAdv } from '../types'
import { format } from 'date-fns'
import { MessageSquare, Send, UserCog, Bot, Search, Image as ImageIcon, ArrowLeft } from 'lucide-react'

function iniciais(nome: string | null) {
  if (!nome) return '?'
  const partes = nome.trim().split(' ')
  return (partes[0][0] + (partes[1]?.[0] ?? '')).toUpperCase()
}

function ConversaItem({ lead, ativo, onClick }: { lead: LeadAdv; ativo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-[10px] flex items-center gap-3 transition-all duration-150 ${
        ativo
          ? 'bg-[var(--primary)]/10 border border-[var(--primary)]/30'
          : 'hover:bg-[var(--bg-base)] border border-transparent'
      }`}
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
        {iniciais(lead.nome_lead)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-[13px] text-[var(--text-main)] truncate">
            {lead.nome_lead || lead.whatsapp_lead}
          </span>
          {lead.ultima_mensagem && (
            <span className="text-[10px] text-[var(--text-muted)] shrink-0">
              {format(new Date(lead.ultima_mensagem), 'dd/MM HH:mm')}
            </span>
          )}
        </div>
        <p className="text-[12px] text-[var(--text-muted)] truncate mt-0.5">
          {lead.motivo_contato || 'Sem motivo informado'}
        </p>
        {lead.atendimento_humano_ativo && (
          <span className="inline-flex items-center gap-1 mt-1 text-[10px] px-2 py-0.5 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">
            <UserCog size={10} /> Atendimento humano
          </span>
        )}
      </div>
    </button>
  )
}

function Balao({ msg }: { msg: import('../hooks/useChat').ChatwootMessage }) {
  const doLead = msg.message_type === 0
  const nota = msg.private

  return (
    <div className={`flex ${doLead ? 'justify-start' : 'justify-end'} mb-3`}>
      <div
        className={`max-w-[78%] rounded-[14px] px-3.5 py-2.5 text-[13.5px] whitespace-pre-wrap break-words ${
          nota
            ? 'bg-[var(--warning-bg)] border border-[var(--warning-border)] text-[var(--text-main)]'
            : doLead
              ? 'bg-[var(--bg-base)] border border-[var(--border-card)] text-[var(--text-main)]'
              : 'bg-[var(--primary)] text-white'
        }`}
      >
        {msg.content || <span className="italic opacity-70">(sem texto)</span>}
        {msg.attachments?.map((att) => (
          <a
            key={att.id}
            href={att.data_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-1 text-xs underline opacity-90"
          >
            <ImageIcon size={12} /> Ver anexo
          </a>
        ))}
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
  // Estado de UI: em mobile mostra lista ou conversa
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')

  const {
    mensagens,
    isLoading: carregandoMensagens,
    isSending,
    atendimentoHumanoAtivo,
    atendidoPor,
    enviarMensagem,
    assumirAtendimento,
    devolverParaIA,
  } = useChatConversa(leadSelecionado)

  const leadsFiltrados = useMemo(() => {
    if (!busca.trim()) return leads
    const termo = busca.toLowerCase()
    return leads.filter(
      (l) =>
        l.nome_lead?.toLowerCase().includes(termo) ||
        l.whatsapp_lead?.includes(termo)
    )
  }, [leads, busca])

  const handleEnviar = async () => {
    if (!texto.trim()) return
    const ok = await enviarMensagem(texto)
    if (ok) setTexto('')
  }

  const handleSelecionarLead = (lead: LeadAdv) => {
    setLeadSelecionado(lead)
    setMobileView('chat')
  }

  const handleVoltarLista = () => {
    setMobileView('list')
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Chat"
        description="Converse diretamente com os leads. Ao mandar uma mensagem manual, o assistente virtual para de responder esse contato automaticamente."
      />

      <Card noPadding className="flex-1 min-h-0 overflow-hidden">
        {/* ── Layout: coluna única em mobile, duas em desktop ──────── */}
        <div className="h-full flex flex-col md:grid md:grid-cols-[300px_1fr]">

          {/* ── Coluna esquerda: lista de conversas ─────────────────── */}
          <div
            className={`border-r border-[var(--border-card)] flex flex-col min-h-0 ${
              mobileView === 'list' ? 'flex' : 'hidden md:flex'
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

            {/* Lista */}
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
              {leadsFiltrados.map((lead) => (
                <ConversaItem
                  key={lead.id}
                  lead={lead}
                  ativo={leadSelecionado?.id === lead.id}
                  onClick={() => handleSelecionarLead(lead)}
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
                    {/* Botão voltar (mobile only) */}
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
                <div className="flex-1 overflow-y-auto p-4">
                  {carregandoMensagens && (
                    <p className="text-[12px] text-[var(--text-muted)] text-center py-8">Carregando mensagens...</p>
                  )}
                  {!carregandoMensagens && mensagens.length === 0 && (
                    <p className="text-[12px] text-[var(--text-muted)] text-center py-8">Nenhuma mensagem ainda.</p>
                  )}
                  {mensagens.map((msg) => (
                    <Balao key={msg.id} msg={msg} />
                  ))}
                </div>

                {/* Input de envio */}
                <div className="p-3 border-t border-[var(--border-card)] flex items-end gap-2">
                  <textarea
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleEnviar()
                      }
                    }}
                    placeholder="Digite uma mensagem... (Enter para enviar)"
                    rows={1}
                    className="flex-1 resize-none px-3 py-2.5 text-[13px] rounded-[10px] bg-[var(--bg-base)] border border-[var(--border-card)] text-[var(--text-main)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 max-h-32 transition-all placeholder:text-[var(--text-muted)]"
                  />
                  <Button
                    onClick={handleEnviar}
                    disabled={isSending || !texto.trim()}
                    size="md"
                    className="shrink-0 h-10 w-10 p-0 !px-0 !py-0 items-center justify-center"
                  >
                    <Send size={15} />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
