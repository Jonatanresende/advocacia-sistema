import { useState, useMemo } from 'react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import { useChatLeads, useChatConversa } from '../hooks/useChat'
import type { LeadAdv } from '../types'
import { format } from 'date-fns'
import { MessageSquare, Send, UserCog, Bot, Search, Image as ImageIcon } from 'lucide-react'

function iniciais(nome: string | null) {
  if (!nome) return '?'
  const partes = nome.trim().split(' ')
  return (partes[0][0] + (partes[1]?.[0] ?? '')).toUpperCase()
}

function ConversaItem({ lead, ativo, onClick }: { lead: LeadAdv; ativo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-[8px] flex items-center gap-3 transition-colors ${
        ativo ? 'bg-[var(--accent)]/10 border border-[var(--accent)]' : 'hover:bg-[var(--bg-base)] border border-transparent'
      }`}
    >
      <div className="w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-xs font-semibold shrink-0">
        {iniciais(lead.nome_lead)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm text-[var(--text-main)] truncate">
            {lead.nome_lead || lead.whatsapp_lead}
          </span>
          {lead.ultima_mensagem && (
            <span className="text-[10px] text-[var(--text-muted)] shrink-0">
              {format(new Date(lead.ultima_mensagem), 'dd/MM HH:mm')}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)] truncate">
          {lead.motivo_contato || 'Sem motivo informado'}
        </p>
        {lead.atendimento_humano_ativo && (
          <span className="inline-flex items-center gap-1 mt-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30">
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
        className={`max-w-[75%] rounded-[12px] px-3 py-2 text-sm whitespace-pre-wrap break-words ${
          nota
            ? 'bg-amber-500/10 border border-amber-500/30 text-[var(--text-main)]'
            : doLead
              ? 'bg-[var(--bg-base)] border border-[var(--border-card)] text-[var(--text-main)]'
              : 'bg-[var(--accent)] text-white'
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
        <div className={`text-[10px] mt-1 opacity-60`}>
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

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Chat"
        description="Converse diretamente com os leads. Ao mandar uma mensagem manual, o assistente virtual para de responder esse contato automaticamente."
      />

      <Card noPadding className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[320px_1fr] overflow-hidden">
        {/* Coluna esquerda — lista de conversas */}
        <div className="border-r border-[var(--border-card)] flex flex-col min-h-0">
          <div className="p-3 border-b border-[var(--border-card)]">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou telefone..."
                className="w-full pl-8 pr-3 py-2 text-sm rounded-[8px] bg-[var(--bg-base)] border border-[var(--border-card)] text-[var(--text-main)] outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {carregandoLeads && (
              <p className="text-xs text-[var(--text-muted)] text-center py-6">Carregando conversas...</p>
            )}
            {!carregandoLeads && leadsFiltrados.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] text-center py-6">Nenhuma conversa encontrada.</p>
            )}
            {leadsFiltrados.map((lead) => (
              <ConversaItem
                key={lead.id}
                lead={lead}
                ativo={leadSelecionado?.id === lead.id}
                onClick={() => setLeadSelecionado(lead)}
              />
            ))}
          </div>
        </div>

        {/* Coluna direita — conversa aberta */}
        <div className="flex flex-col min-h-0">
          {!leadSelecionado ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] gap-2">
              <MessageSquare size={32} className="opacity-40" />
              <p className="text-sm">Selecione uma conversa para começar</p>
            </div>
          ) : (
            <>
              <div className="p-3 border-b border-[var(--border-card)] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-[var(--text-main)] truncate">
                    {leadSelecionado.nome_lead || leadSelecionado.whatsapp_lead}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {atendimentoHumanoAtivo
                      ? atendidoPor === perfil?.id
                        ? 'Você está no controle dessa conversa'
                        : 'Outro colega está no controle dessa conversa'
                      : 'Assistente virtual respondendo automaticamente'}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={atendimentoHumanoAtivo ? devolverParaIA : assumirAtendimento}
                  className="shrink-0"
                >
                  {atendimentoHumanoAtivo ? (
                    <><Bot size={14} className="mr-1" /> Devolver pra IA</>
                  ) : (
                    <><UserCog size={14} className="mr-1" /> Assumir atendimento</>
                  )}
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {carregandoMensagens && (
                  <p className="text-xs text-[var(--text-muted)] text-center py-6">Carregando mensagens...</p>
                )}
                {!carregandoMensagens && mensagens.length === 0 && (
                  <p className="text-xs text-[var(--text-muted)] text-center py-6">Nenhuma mensagem ainda.</p>
                )}
                {mensagens.map((msg) => (
                  <Balao key={msg.id} msg={msg} />
                ))}
              </div>

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
                  placeholder="Digite uma mensagem..."
                  rows={1}
                  className="flex-1 resize-none px-3 py-2 text-sm rounded-[8px] bg-[var(--bg-base)] border border-[var(--border-card)] text-[var(--text-main)] outline-none focus:border-[var(--accent)] max-h-32"
                />
                <Button onClick={handleEnviar} disabled={isSending || !texto.trim()}>
                  <Send size={16} />
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
