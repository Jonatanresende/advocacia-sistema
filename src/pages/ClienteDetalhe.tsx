import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import { statusConfig } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { supabase } from '../lib/supabase'
import type { ClienteAdv, LeadStatus } from '../types'
import { ArrowLeft, Clock, MessageSquare, Edit3, UserCheck } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '../contexts/ToastContext'

export default function ClienteDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { success, error } = useToast()

  const [cliente, setCliente] = useState<ClienteAdv | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [anotacoes, setAnotacoes] = useState('')

  const fetchCliente = async () => {
    if (!id) return
    setIsLoading(true)
    try {
      const { data, error: err } = await supabase.from('clientes_adv').select('*, lead:leads_adv(*)').eq('id', id).single()
      if (err) throw err
      setCliente(data as ClienteAdv)
      setAnotacoes(data.lead?.anotacoes || '')
    } catch (err) {
      console.error(err)
      error('Erro ao buscar detalhes do cliente')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchCliente() }, [id])

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!cliente || !cliente.lead) return
    try {
      const { error: err } = await supabase.from('leads_adv').update({ status: newStatus }).eq('id', cliente.lead.id)
      if (err) throw err
      setCliente({ ...cliente, lead: { ...cliente.lead, status: newStatus } })
      success('Status atualizado com sucesso')
    } catch (err) {
      console.error(err)
      error('Erro ao atualizar status')
    }
  }

  const handleSaveAnotacoes = async () => {
    if (!cliente || !cliente.lead) return
    setIsSaving(true)
    try {
      const { error: err } = await supabase.from('leads_adv').update({ anotacoes }).eq('id', cliente.lead.id)
      if (err) throw err
      setCliente({ ...cliente, lead: { ...cliente.lead, anotacoes } })
      success('Anotações salvas com sucesso')
    } catch (err) {
      console.error(err)
      error('Erro ao salvar anotações')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div></div>
  }

  if (!cliente || !cliente.lead) {
    return <div className="text-center p-12 text-[var(--text-muted)]">Cliente não encontrado</div>
  }

  const lead = cliente.lead

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-[var(--bg-card)] rounded-full transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)]">
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--success)]/10 text-[var(--success)] flex items-center justify-center shrink-0">
              <UserCheck size={20} />
            </div>
            <h1 className="text-2xl font-bold font-display text-[var(--text-main)] m-0">
              {lead.nome_lead || lead.whatsapp_lead}
            </h1>
          </div>
          <select
            value={lead.status}
            onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
            className="text-sm font-medium rounded-full px-3 py-1 border cursor-pointer bg-[var(--bg-card)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            style={{
              backgroundColor: statusConfig[lead.status]?.bg,
              color: statusConfig[lead.status]?.text,
              borderColor: statusConfig[lead.status]?.border,
            }}
          >
            {Object.entries(statusConfig)
              .filter(([k]) => !['agendado', 'confirmado', 'faltou', 'cancelado'].includes(k))
              .map(([key, cfg]) => (
                <option key={key} value={key} style={{ background: '#fff', color: '#000' }}>
                  {cfg.label}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="flex flex-col gap-4">
            <h3 className="font-semibold text-lg font-display flex items-center gap-2 border-b border-[var(--border-card)] pb-3">
              <MessageSquare size={18} className="text-[var(--accent)]" />
              Resumo do Contato
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">WhatsApp</p>
                <p className="font-medium text-[var(--text-main)]">{lead.whatsapp_lead}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Motivo do Contato</p>
                <p className="font-medium text-[var(--text-main)]">{lead.motivo_contato || 'Não informado'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Resumo da Conversa (Agente IA)</p>
                <div className="bg-[var(--bg-base)] p-3 rounded-[8px] text-sm text-[var(--text-main)] whitespace-pre-wrap mt-1">
                  {lead.resumo_conversa || 'Nenhum resumo disponível.'}
                </div>
              </div>
            </div>
          </Card>

          <Card className="flex flex-col gap-4">
            <h3 className="font-semibold text-lg font-display flex items-center gap-2 border-b border-[var(--border-card)] pb-3">
              <Clock size={18} className="text-[var(--accent)]" />
              Linha do Tempo
            </h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-[var(--border-card)] border-dashed">
                <span className="font-medium text-[var(--success)]">Tornou-se Cliente (1ª Visita)</span>
                <span className="font-medium text-[var(--success)]">{format(new Date(cliente.data_primeira_visita), 'dd/MM/yyyy')}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[var(--border-card)] border-dashed">
                <span className="text-[var(--text-muted)]">Início do Atendimento (Lead)</span>
                <span className="font-medium">{lead.inicio_atendimento ? format(new Date(lead.inicio_atendimento), 'dd/MM/yyyy HH:mm') : '-'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[var(--border-card)] border-dashed">
                <span className="text-[var(--text-muted)]">Última Mensagem</span>
                <span className="font-medium">{lead.ultima_mensagem ? format(new Date(lead.ultima_mensagem), 'dd/MM/yyyy HH:mm') : '-'}</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col gap-4">
            <h3 className="font-semibold text-lg font-display flex items-center gap-2 border-b border-[var(--border-card)] pb-3">
              <Edit3 size={18} className="text-[var(--accent)]" />
              Anotações Internas
            </h3>
            <div className="flex-1 flex flex-col min-h-[300px]">
              <textarea
                value={anotacoes}
                onChange={(e) => setAnotacoes(e.target.value)}
                placeholder="Adicione notas visíveis apenas para a equipe do escritório..."
                className="flex-1 w-full bg-[var(--bg-base)] border border-[var(--border-card)] rounded-[8px] p-3 text-sm text-[var(--text-main)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)] mb-4"
              />
              <Button onClick={handleSaveAnotacoes} isLoading={isSaving} className="w-full">
                Salvar Anotações
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
